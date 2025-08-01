import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";

/**
 * Linode Object Storage filesystem configuration options
 */
export interface LinodeObjectStorageOptions {
  /** Linode Object Storage region */
  region: string;
  /** Bucket name */
  bucket: string;
  /** Linode Object Storage access key */
  accessKey: string;
  /** Linode Object Storage secret key */
  secretKey: string;
  /** Base prefix for all operations (acts as root directory) */
  prefix?: string;
  /** Custom endpoint URL (defaults to Linode Object Storage endpoint) */
  endpoint?: string;
}

/**
 * In-memory cache for file metadata and content
 */
interface LinodeFileCache {
  content?: string;
  size: number;
  lastModified: Date;
  etag: string;
}

/**
 * Async Linode Object Storage filesystem implementation
 *
 * Provides filesystem operations on Linode Object Storage (S3-compatible).
 * Each file operation corresponds to S3 object operations.
 * Directories are handled virtually through object key prefixes.
 */
export class LinodeObjectStorageFileSystem implements IAsyncFileSystem {
  private s3: S3Client;
  private options: Required<
    Omit<LinodeObjectStorageOptions, "endpoint">
  > &
    Pick<LinodeObjectStorageOptions, "endpoint">;
  private cache = new Map<string, LinodeFileCache>();

  constructor(options: LinodeObjectStorageOptions) {
    this.options = {
      prefix: "",
      endpoint: `https://${options.region}.linodeobjects.com`,
      ...options,
    };

    this.s3 = new S3Client({
      region: this.options.region,
      credentials: {
        accessKeyId: this.options.accessKey,
        secretAccessKey: this.options.secretKey,
      },
      endpoint: this.options.endpoint,
      forcePathStyle: false, // Linode uses virtual-hosted-style URLs
    });
  }

  /**
   * Get the full S3 key for a given file path
   */
  private getKey(path: string): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return this.options.prefix
      ? `${this.options.prefix}/${normalizedPath}`
      : normalizedPath;
  }

  /**
   * Remove the prefix from an S3 key to get the original path
   */
  private getPathFromKey(key: string): string {
    if (this.options.prefix && key.startsWith(this.options.prefix)) {
      return key.slice(this.options.prefix.length + 1);
    }
    return key;
  }

  /**
   * Read file content from Linode Object Storage
   */
  async readFile(path: string): Promise<string> {
    const key = this.getKey(path);

    // Check cache first
    const cached = this.cache.get(key);
    if (cached?.content !== undefined) {
      return cached.content;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      });

      const response = await this.s3.send(command);
      
      if (!response.Body) {
        throw new Error(`File ${path} has no content`);
      }

      const content = await response.Body.transformToString();

      // Update cache
      this.cache.set(key, {
        content,
        size: response.ContentLength || content.length,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || "",
      });

      return content;
    } catch (error) {
      const awsError = error as { name?: string };
      if (awsError.name === "NoSuchKey") {
        throw new Error(`File ${path} not found`);
      }
      throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Write file content to Linode Object Storage
   */
  async writeFile(path: string, data: string): Promise<void> {
    const key = this.getKey(path);

    try {
      const command = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: data,
        ContentType: this.getContentType(path),
      });

      const response = await this.s3.send(command);

      // Update cache
      this.cache.set(key, {
        content: data,
        size: data.length,
        lastModified: new Date(),
        etag: response.ETag || "",
      });
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file exists in Linode Object Storage
   */
  async exists(path: string): Promise<boolean> {
    const key = this.getKey(path);

    // Check cache first
    if (this.cache.has(key)) {
      return true;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      });

      await this.s3.send(command);
      return true;
    } catch (error) {
      const awsError = error as { name?: string };
      if (awsError.name === "NoSuchKey" || awsError.name === "NotFound") {
        return false;
      }
      throw new Error(`Failed to check file existence ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file from Linode Object Storage (alias for unlink)
   */
  async deleteFile(path: string): Promise<void> {
    return this.unlink(path);
  }

  /**
   * Delete file from Linode Object Storage
   */
  async unlink(path: string): Promise<void> {
    const key = this.getKey(path);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      });

      await this.s3.send(command);

      // Remove from cache
      this.cache.delete(key);
    } catch (error) {
      throw new Error(`Failed to delete file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Get file statistics from Linode Object Storage
   */
  async stat(path: string): Promise<FileStats> {
    const key = this.getKey(path);

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return {
        size: cached.size,
        mtime: cached.lastModified,
        ctime: cached.lastModified,
        atime: cached.lastModified,
        mode: 0o644,
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
      };
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      });

      const response = await this.s3.send(command);
      const lastModified = response.LastModified || new Date();

      const stats: FileStats = {
        size: response.ContentLength || 0,
        mtime: lastModified,
        ctime: lastModified,
        atime: lastModified,
        mode: 0o644,
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
      };

      // Update cache
      this.cache.set(key, {
        size: stats.size,
        lastModified: lastModified,
        etag: response.ETag || "",
      });

      return stats;
    } catch (error) {
      const awsError = error as { name?: string };
      if (awsError.name === "NoSuchKey") {
        throw new Error(`File ${path} not found`);
      }
      throw new Error(`Failed to get file stats ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * List files in a directory from Linode Object Storage (alias for readdir)
   */
  async readDir(path: string): Promise<string[]> {
    return this.readdir(path);
  }

  /**
   * List files in a directory from Linode Object Storage
   */
  async readdir(path: string): Promise<string[]> {
    const prefix = this.getKey(path);
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: normalizedPrefix,
        Delimiter: "/",
      });

      const response = await this.s3.send(command);
      const items: string[] = [];

      // Add files
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== normalizedPrefix) {
            const relativePath = this.getPathFromKey(object.Key);
            const fileName = relativePath.split("/").pop();
            if (fileName) {
              items.push(fileName);
            }
          }
        }
      }

      // Add directories
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const relativePath = this.getPathFromKey(prefix.Prefix);
            const dirName = relativePath.split("/").filter(Boolean).pop();
            if (dirName) {
              items.push(dirName);
            }
          }
        }
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to list directory ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Create directory (no-op in object storage, directories are virtual)
   */
  async mkdir(path: string): Promise<void> {
    // In object storage, directories are virtual and created implicitly
    // We can optionally create a marker object, but it's not necessary
    return Promise.resolve();
  }

  /**
   * Ensure directory exists (alias for mkdir)
   */
  async ensureDir(path: string): Promise<void> {
    return this.mkdir(path);
  }

  /**
   * Remove directory (removes all objects with the prefix)
   */
  async rmdir(path: string): Promise<void> {
    const prefix = this.getKey(path);
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

    try {
      // List all objects with this prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: normalizedPrefix,
      });

      const response = await this.s3.send(listCommand);

      if (response.Contents && response.Contents.length > 0) {
        // Delete all objects
        for (const object of response.Contents) {
          if (object.Key) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: this.options.bucket,
              Key: object.Key,
            });
            await this.s3.send(deleteCommand);
            
            // Remove from cache
            this.cache.delete(object.Key);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to remove directory ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete directory (alias for rmdir)
   */
  async deleteDir(path: string): Promise<void> {
    return this.rmdir(path);
  }

  /**
   * Set file permissions (no-op in object storage)
   */
  async chmod(path: string, mode: number): Promise<void> {
    // Object storage doesn't support file permissions
    // This is a no-op for compatibility
    return Promise.resolve();
  }

  /**
   * Get appropriate content type based on file extension
   */
  private getContentType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    
    const contentTypes: Record<string, string> = {
      json: "application/json",
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      ts: "application/typescript",
      md: "text/markdown",
      xml: "application/xml",
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
    };

    return contentTypes[ext || ""] || "application/octet-stream";
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Factory function to create Linode Object Storage filesystem
 */
export function createLinodeObjectStorageFileSystem(
  options: LinodeObjectStorageOptions
): LinodeObjectStorageFileSystem {
  return new LinodeObjectStorageFileSystem(options);
}

/**
 * Type alias for consistency with other filesystem implementations
 */
export type LinodeObjectStorageFileSystemOptions = LinodeObjectStorageOptions;
