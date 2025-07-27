import {
  BlobClient,
  type BlobDeleteResponse,
  type BlobDownloadResponseParsed,
  BlobServiceClient,
  type ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";

/**
 * Azure Blob Storage filesystem configuration options
 */
export interface AzureBlobStorageOptions {
  /** Azure Storage account connection string (recommended for simplicity) */
  connectionString?: string;
  /** Storage account name (alternative to connection string) */
  accountName?: string;
  /** Storage account key (alternative to connection string) */
  accountKey?: string;
  /** Container name (equivalent to S3 bucket) */
  containerName: string;
  /** Base prefix for all operations (acts as root directory) */
  prefix?: string;
  /** Custom blob service endpoint */
  blobServiceEndpoint?: string;
}

/**
 * In-memory cache for file metadata and content
 */
interface AzureBlobCache {
  content?: string;
  size: number;
  lastModified: Date;
  etag: string;
}

/**
 * Azure Blob Storage-based async filesystem implementation
 *
 * Provides filesystem operations on Azure Blob Storage.
 * Each file operation corresponds to Azure blob operations.
 * Directories are handled virtually through blob name prefixes.
 */
export class AzureBlobStorageFileSystem implements IAsyncFileSystem {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private options: Required<
    Omit<
      AzureBlobStorageOptions,
      "connectionString" | "accountName" | "accountKey" | "blobServiceEndpoint"
    >
  > &
    Pick<
      AzureBlobStorageOptions,
      "connectionString" | "accountName" | "accountKey" | "blobServiceEndpoint"
    >;
  private cache = new Map<string, AzureBlobCache>();

  constructor(options: AzureBlobStorageOptions) {
    // Set defaults
    this.options = {
      containerName: options.containerName,
      prefix: options.prefix || "",
      connectionString: options.connectionString,
      accountName: options.accountName,
      accountKey: options.accountKey,
      blobServiceEndpoint: options.blobServiceEndpoint,
    };

    // Initialize Azure Blob Service Client
    if (options.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        options.connectionString,
      );
    } else if (options.accountName && options.accountKey) {
      const url = `https://${options.accountName}.blob.core.windows.net`;
      const sharedKeyCredential = new StorageSharedKeyCredential(
        options.accountName,
        options.accountKey,
      );
      this.blobServiceClient = new BlobServiceClient(url, sharedKeyCredential);
    } else {
      throw new Error(
        "Either connectionString or accountName/accountKey must be provided",
      );
    }

    this.containerClient = this.blobServiceClient.getContainerClient(
      options.containerName,
    );
  }

  /**
   * Get Azure blob name from filesystem path
   */
  private getAzureBlobName(path: string): string {
    const cleanPath = path.replace(/^\/+/, "");
    if (this.options.prefix) {
      const cleanPrefix = this.options.prefix
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      return cleanPrefix ? `${cleanPrefix}/${cleanPath}` : cleanPath;
    }
    return cleanPath;
  }

  /**
   * Get filesystem path from Azure blob name
   */
  private getFilesystemPath(blobName: string): string {
    if (this.options.prefix) {
      const cleanPrefix = this.options.prefix
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      if (cleanPrefix && blobName.startsWith(`${cleanPrefix}/`)) {
        return blobName.substring(cleanPrefix.length + 1);
      }
    }
    return blobName;
  }

  /**
   * Check if a file exists in Azure Blob Storage
   */
  async exists(path: string): Promise<boolean> {
    try {
      const blobName = this.getAzureBlobName(path);

      // Check cache first
      if (this.cache.has(blobName)) {
        return true;
      }

      // Check Azure Blob Storage
      const blobClient = this.containerClient.getBlobClient(blobName);
      const exists = await blobClient.exists();

      if (exists) {
        // Try to get metadata to cache it
        try {
          const properties = await blobClient.getProperties();
          this.cache.set(blobName, {
            size: properties.contentLength || 0,
            lastModified: properties.lastModified || new Date(),
            etag: properties.etag || "",
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
        `[AzureBlobStorageFileSystem] Failed to check file existence for ${path}: ${error}`,
      );
    }
  }

  /**
   * Read a file from Azure Blob Storage
   */
  async readFile(path: string): Promise<string> {
    try {
      const blobName = this.getAzureBlobName(path);

      // Check cache first
      const cached = this.cache.get(blobName);
      if (cached?.content) {
        return cached.content;
      }

      // Download from Azure Blob Storage
      const blobClient = this.containerClient.getBlobClient(blobName);
      const downloadResponse: BlobDownloadResponseParsed =
        await blobClient.download();

      if (!downloadResponse.readableStreamBody) {
        throw new Error(
          `[AzureBlobStorageFileSystem] No content found for file: ${path}`,
        );
      }

      // Convert stream to string
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }

      const content = Buffer.concat(chunks).toString("utf-8");

      // Cache the content and metadata
      this.cache.set(blobName, {
        content,
        size: content.length,
        lastModified: downloadResponse.lastModified || new Date(),
        etag: downloadResponse.etag || "",
      });

      return content;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[AzureBlobStorageFileSystem] File not found: ${path}`);
      }
      throw new Error(
        `[AzureBlobStorageFileSystem] Failed to read file ${path}: ${error}`,
      );
    }
  }

  /**
   * Write a file to Azure Blob Storage
   */
  async writeFile(path: string, data: string): Promise<void> {
    try {
      const blobName = this.getAzureBlobName(path);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const buffer = Buffer.from(data, "utf-8");
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(path),
        },
      });

      // Update cache
      this.cache.set(blobName, {
        content: data,
        size: buffer.length,
        lastModified: new Date(),
        etag: "", // Will be updated on next read
      });
    } catch (error: unknown) {
      throw new Error(
        `[AzureBlobStorageFileSystem] Failed to write file ${path}: ${error}`,
      );
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const blobName = this.getAzureBlobName(path);
      const blobClient = this.containerClient.getBlobClient(blobName);

      await blobClient.delete();

      // Remove from cache
      this.cache.delete(blobName);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        // File doesn't exist, consider deletion successful
        return;
      }
      throw new Error(
        `[AzureBlobStorageFileSystem] Failed to delete file ${path}: ${error}`,
      );
    }
  }

  /**
   * List directory contents
   */
  async readDir(dirPath: string): Promise<string[]> {
    try {
      const prefix = this.getAzureBlobName(dirPath);
      const normalizedPrefix = prefix
        ? prefix.endsWith("/")
          ? prefix
          : `${prefix}/`
        : "";

      const items = new Set<string>();

      // List all blobs with the prefix
      for await (const blob of this.containerClient.listBlobsFlat({
        prefix: normalizedPrefix,
      })) {
        const relativePath = this.getFilesystemPath(blob.name);

        if (!relativePath || relativePath === dirPath) {
          continue;
        }

        // Remove the directory prefix to get relative path
        let itemPath = relativePath;
        if (dirPath && dirPath !== "." && dirPath !== "/") {
          const dirPrefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
          if (relativePath.startsWith(dirPrefix)) {
            itemPath = relativePath.substring(dirPrefix.length);
          }
        }

        if (!itemPath) continue;

        // Extract the immediate child (file or subdirectory)
        const pathParts = itemPath.split("/");
        if (pathParts.length === 1) {
          // Direct file
          items.add(pathParts[0]);
        } else if (pathParts.length > 1) {
          // Subdirectory - add directory name with trailing slash
          items.add(`${pathParts[0]}/`);
        }
      }

      return Array.from(items).sort();
    } catch (error: unknown) {
      throw new Error(
        `[AzureBlobStorageFileSystem] Failed to read directory ${dirPath}: ${error}`,
      );
    }
  }

  /**
   * Ensure directory exists (no-op for blob storage)
   */
  async ensureDir(dirPath: string): Promise<void> {
    // Azure Blob Storage doesn't have directories, so this is a no-op
    // Directories are created implicitly when files are created
  }

  /**
   * Delete directory and all its contents
   */
  async deleteDir(dirPath: string): Promise<void> {
    try {
      const prefix = this.getAzureBlobName(dirPath);
      const normalizedPrefix = prefix
        ? prefix.endsWith("/")
          ? prefix
          : `${prefix}/`
        : "";

      const deletePromises: Promise<void>[] = [];

      for await (const blob of this.containerClient.listBlobsFlat({
        prefix: normalizedPrefix,
      })) {
        const blobClient = this.containerClient.getBlobClient(blob.name);
        deletePromises.push(
          blobClient
            .delete()
            .then(() => {})
            .catch(() => {}), // Ignore individual failures
        );

        // Remove from cache
        this.cache.delete(blob.name);
      }

      await Promise.all(deletePromises);
    } catch (error: unknown) {
      throw new Error(
        `[AzureBlobStorageFileSystem] Failed to delete directory ${dirPath}: ${error}`,
      );
    }
  }

  /**
   * Change file permissions (no-op for blob storage)
   */
  async chmod(path: string, mode: number): Promise<void> {
    // Azure Blob Storage doesn't support file permissions
    // This is a no-op for compatibility
  }

  /**
   * Get file statistics
   */
  async stat(path: string): Promise<FileStats> {
    try {
      const blobName = this.getAzureBlobName(path);

      // Check cache first
      const cached = this.cache.get(blobName);
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

      // Get from Azure Blob Storage
      const blobClient = this.containerClient.getBlobClient(blobName);
      const properties = await blobClient.getProperties();

      const stats: FileStats = {
        size: properties.contentLength || 0,
        mtime: properties.lastModified || new Date(),
        ctime: properties.lastModified || new Date(),
        atime: properties.lastModified || new Date(),
        mode: 0o644,
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
      };

      // Cache the metadata
      this.cache.set(blobName, {
        size: stats.size,
        lastModified: stats.mtime,
        etag: properties.etag || "",
      });

      return stats;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[AzureBlobStorageFileSystem] File not found: ${path}`);
      }
      throw new Error(
        `[AzureBlobStorageFileSystem] Failed to get file stats for ${path}: ${error}`,
      );
    }
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get container information
   */
  getContainerInfo() {
    return {
      containerName: this.options.containerName,
      prefix: this.options.prefix,
      hasConnectionString: !!this.options.connectionString,
      hasAccountCredentials: !!(
        this.options.accountName && this.options.accountKey
      ),
      blobServiceEndpoint: this.options.blobServiceEndpoint,
    };
  }

  /**
   * Determine content type based on file extension
   */
  private getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      json: "application/json",
      txt: "text/plain",
      md: "text/markdown",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      ts: "application/typescript",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      zip: "application/zip",
    };
    return contentTypes[ext || ""] || "application/octet-stream";
  }

  /**
   * Check if error is a "not found" error
   */
  private isNotFoundError(error: unknown): boolean {
    if (typeof error === "object" && error !== null) {
      const err = error as {
        statusCode?: number;
        code?: string;
        message?: string;
      };
      return (
        err.statusCode === 404 ||
        err.code === "BlobNotFound" ||
        err.code === "ContainerNotFound" ||
        (err.message?.includes("BlobNotFound") ?? false)
      );
    }
    return false;
  }
}

/**
 * Create a new Azure Blob Storage filesystem instance
 * @param options Azure Blob Storage configuration
 */
export function createAzureBlobStorageFileSystem(
  options: AzureBlobStorageOptions,
): AzureBlobStorageFileSystem {
  return new AzureBlobStorageFileSystem(options);
}
