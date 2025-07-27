import { type Bucket, File, Storage } from "@google-cloud/storage";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";

/**
 * Google Cloud Storage filesystem configuration options
 */
export interface GCSFileSystemOptions {
  /** Google Cloud Project ID */
  projectId: string;
  /** GCS bucket name */
  bucket: string;
  /** Path to service account key file (JSON) */
  keyFilename?: string;
  /** Service account key as JSON object */
  credentials?: object;
  /** Base prefix for all operations (acts as root directory) */
  prefix?: string;
  /** Custom GCS endpoint (for testing with emulator) */
  apiEndpoint?: string;
}

/**
 * In-memory cache for file metadata and content
 */
interface GCSFileCache {
  content?: string;
  size: number;
  lastModified: Date;
  etag: string;
}

/**
 * Google Cloud Storage-based async filesystem implementation
 *
 * Provides asynchronous filesystem operations on Google Cloud Storage.
 * Each file operation corresponds to GCS object operations.
 * Directories are handled virtually through object name prefixes.
 */
export class GCSFileSystem implements IAsyncFileSystem {
  private storage: Storage;
  private bucket: Bucket;
  private options: Required<
    Omit<GCSFileSystemOptions, "keyFilename" | "credentials" | "apiEndpoint">
  > &
    Pick<GCSFileSystemOptions, "keyFilename" | "credentials" | "apiEndpoint">;
  private cache = new Map<string, GCSFileCache>();

  constructor(options: GCSFileSystemOptions) {
    this.options = {
      prefix: "",
      ...options,
    };

    this.storage = new Storage({
      projectId: this.options.projectId,
      keyFilename: this.options.keyFilename,
      credentials: this.options.credentials,
      apiEndpoint: this.options.apiEndpoint,
    });

    this.bucket = this.storage.bucket(this.options.bucket);
  }

  /**
   * Asynchronously check if a file exists in GCS
   * @param path File path in the bucket
   */
  async exists(path: string): Promise<boolean> {
    try {
      const objectName = this.getGCSObjectName(path);

      // Check cache first
      if (this.cache.has(objectName)) {
        return true;
      }

      // Check GCS
      const file = this.bucket.file(objectName);
      const [exists] = await file.exists();

      if (exists) {
        // Try to get metadata to cache it
        try {
          const [metadata] = await file.getMetadata();
          this.cache.set(objectName, {
            size:
              typeof metadata.size === "string"
                ? Number.parseInt(metadata.size, 10)
                : metadata.size || 0,
            lastModified: new Date(
              metadata.timeCreated || metadata.updated || Date.now(),
            ),
            etag: metadata.etag || "",
          });
        } catch {
          // If metadata fails, just return true for existence
        }
        return true;
      }

      return false;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw new Error(
        `[GCSFileSystem] Failed to check file existence for ${path}: ${error}`,
      );
    }
  }

  /**
   * Asynchronously read a file from GCS
   * @param path File path in the bucket
   */
  async readFile(path: string): Promise<string> {
    try {
      const objectName = this.getGCSObjectName(path);

      // Check cache first
      const cached = this.cache.get(objectName);
      if (cached?.content) {
        return cached.content;
      }

      // Fetch from GCS
      const file = this.bucket.file(objectName);
      const [content] = await file.download();
      const contentStr = content.toString("utf8");

      // Get metadata for caching
      try {
        const [metadata] = await file.getMetadata();
        this.cache.set(objectName, {
          content: contentStr,
          size:
            typeof metadata.size === "string"
              ? Number.parseInt(metadata.size, 10)
              : metadata.size || 0,
          lastModified: new Date(
            metadata.timeCreated || metadata.updated || Date.now(),
          ),
          etag: metadata.etag || "",
        });
      } catch {
        // Cache without metadata if it fails
        this.cache.set(objectName, {
          content: contentStr,
          size: Buffer.byteLength(contentStr, "utf8"),
          lastModified: new Date(),
          etag: "",
        });
      }

      return contentStr;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[GCSFileSystem] File not found: ${path}`);
      }
      throw new Error(`[GCSFileSystem] Failed to read file ${path}: ${error}`);
    }
  }

  /**
   * Asynchronously write a file to GCS
   * @param path File path in the bucket
   * @param data File content
   */
  async writeFile(path: string, data: string): Promise<void> {
    try {
      const objectName = this.getGCSObjectName(path);
      const file = this.bucket.file(objectName);

      const saveOptions = {
        metadata: {
          contentType: this.getContentType(path),
        },
      };

      await file.save(data, saveOptions);

      // Update cache
      this.cache.set(objectName, {
        content: data,
        size: Buffer.byteLength(data, "utf8"),
        lastModified: new Date(),
        etag: "", // Will be updated when we next read metadata
      });
    } catch (error: unknown) {
      throw new Error(`[GCSFileSystem] Failed to write file ${path}: ${error}`);
    }
  }

  /**
   * Asynchronously delete a file from GCS
   * @param path File path in the bucket
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const objectName = this.getGCSObjectName(path);
      const file = this.bucket.file(objectName);

      await file.delete();

      // Remove from cache
      this.cache.delete(objectName);
    } catch (error: unknown) {
      // Remove from cache even if delete fails
      this.cache.delete(this.getGCSObjectName(path));

      // GCS delete throws error if object doesn't exist, unlike S3
      if (!this.isNotFoundError(error)) {
        throw new Error(
          `[GCSFileSystem] Failed to delete file ${path}: ${error}`,
        );
      }
    }
  }

  /**
   * Asynchronously delete a directory (delete all objects with prefix)
   * @param path Directory path
   */
  async deleteDir(path: string): Promise<void> {
    try {
      const prefix = this.getGCSObjectName(path);
      const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

      // List all objects with the prefix
      const [files] = await this.bucket.getFiles({ prefix: normalizedPrefix });

      if (files.length === 0) {
        return; // Nothing to delete
      }

      // Delete each object
      for (const file of files) {
        await file.delete();

        // Remove from cache
        this.cache.delete(file.name);
      }
    } catch (error: unknown) {
      throw new Error(
        `[GCSFileSystem] Failed to delete directory ${path}: ${error}`,
      );
    }
  }

  /**
   * Asynchronously ensure a directory exists (no-op for GCS)
   * @param dirPath Directory path
   */
  async ensureDir(dirPath: string): Promise<void> {
    // GCS doesn't have directories - they're implicit through object names
    // This is a no-op for compatibility
  }

  /**
   * Asynchronously read directory contents
   * @param dirPath Directory path
   */
  async readDir(dirPath: string): Promise<string[]> {
    try {
      const prefix = this.getGCSObjectName(dirPath);
      const normalizedPrefix =
        prefix === "" ? "" : prefix.endsWith("/") ? prefix : `${prefix}/`;

      // Get all files with the prefix
      const [files] = await this.bucket.getFiles({
        prefix: normalizedPrefix,
      });

      const result: string[] = [];
      const seenDirectories = new Set<string>();

      // Process files to extract directory structure
      for (const file of files) {
        if (file.name && file.name !== normalizedPrefix) {
          const relativeName = file.name.replace(normalizedPrefix, "");

          // Skip empty relative names
          if (!relativeName) continue;

          // If it contains a slash, it's in a subdirectory
          if (relativeName.includes("/")) {
            const dirName = relativeName.split("/")[0];
            if (dirName && !seenDirectories.has(dirName)) {
              result.push(`${dirName}/`);
              seenDirectories.add(dirName);
            }
          } else {
            // It's a file in this directory
            result.push(relativeName);
          }
        }
      }

      return result;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return [];
      }
      throw new Error(
        `[GCSFileSystem] Failed to read directory ${dirPath}: ${error}`,
      );
    }
  }

  /**
   * Set object permissions (simplified implementation)
   * @param path File path
   * @param mode Permission mode (simplified to public/private)
   */
  async chmod(path: string, mode: number): Promise<void> {
    // GCS has complex IAM permissions
    // This could be extended to set object ACLs, but for simplicity we'll make it a no-op
    // In a real implementation, you might use file.acl.add() or file.makePublic()
  }

  /**
   * Get file statistics
   * @param path File path
   */
  async stat(path: string): Promise<FileStats> {
    try {
      const objectName = this.getGCSObjectName(path);

      // Check cache first
      const cached = this.cache.get(objectName);
      if (cached) {
        return this.createFileStats(cached.size, cached.lastModified, false);
      }

      // Fetch metadata from GCS
      const file = this.bucket.file(objectName);
      const [metadata] = await file.getMetadata();

      const size =
        typeof metadata.size === "string"
          ? Number.parseInt(metadata.size, 10)
          : metadata.size || 0;
      const lastModified = new Date(
        metadata.timeCreated || metadata.updated || Date.now(),
      );

      // Cache metadata
      this.cache.set(objectName, {
        size,
        lastModified,
        etag: metadata.etag || "",
      });

      return this.createFileStats(size, lastModified, false);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[GCSFileSystem] File not found: ${path}`);
      }
      throw new Error(
        `[GCSFileSystem] Failed to get file stats for ${path}: ${error}`,
      );
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get GCS bucket information
   */
  getBucketInfo(): { bucket: string; projectId: string; prefix: string } {
    return {
      bucket: this.options.bucket,
      projectId: this.options.projectId,
      prefix: this.options.prefix,
    };
  }

  /**
   * Get full GCS object name from filesystem path
   * @param path Filesystem path
   */
  private getGCSObjectName(path: string): string {
    // Remove leading slashes and normalize
    const normalizedPath = path.replace(/^\.?\/+/, "").replace(/\/+/g, "/");

    // Apply prefix if configured
    if (this.options.prefix) {
      const normalizedPrefix = this.options.prefix.replace(/^\/+|\/+$/g, "");
      return normalizedPrefix
        ? `${normalizedPrefix}/${normalizedPath}`
        : normalizedPath;
    }

    return normalizedPath;
  }

  /**
   * Get content type based on file extension
   * @param path File path
   */
  private getContentType(path: string): string {
    const ext = path.toLowerCase().split(".").pop();
    const contentTypes: Record<string, string> = {
      json: "application/json",
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      xml: "application/xml",
      md: "text/markdown",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      pdf: "application/pdf",
    };
    return contentTypes[ext || ""] || "application/octet-stream";
  }

  /**
   * Check if error is a "not found" error
   * @param error Error object
   */
  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    // Check for GCS API not found error
    if ("code" in error && (error as { code: number }).code === 404) {
      return true;
    }

    // Check for error message patterns
    if (
      "message" in error &&
      typeof (error as { message: string }).message === "string"
    ) {
      const message = (error as { message: string }).message.toLowerCase();
      return (
        message.includes("not found") || message.includes("no such object")
      );
    }

    return false;
  }

  /**
   * Create file statistics object
   * @param size File size in bytes
   * @param lastModified Last modified date
   * @param isDirectory Is the file a directory
   */
  private createFileStats(
    size: number,
    lastModified: Date,
    isDirectory: boolean,
  ): FileStats {
    return {
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isSymbolicLink: () => false, // GCS doesn't support symlinks
      size,
      mtime: lastModified,
      ctime: lastModified, // GCS doesn't have separate creation time
      atime: lastModified, // GCS doesn't track access time
      mode: 0o644, // Default permissions for GCS objects
    };
  }
}

/**
 * Create a new async GCS filesystem instance
 * @param options GCS filesystem configuration
 */
export function createGCSFileSystem(
  options: GCSFileSystemOptions,
): GCSFileSystem {
  return new GCSFileSystem(options);
}
