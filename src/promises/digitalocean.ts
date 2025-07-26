/**
 * DigitalOcean Spaces FileSystem Implementation
 * 
 * Provides async filesystem operations using DigitalOcean Spaces (S3-compatible) storage.
 * Uses AWS SDK v3 for S3-compatible operations with DigitalOcean endpoints.
 * 
 * Features:
 * - Full S3-compatible API through DigitalOcean Spaces
 * - Async-only operations (no sync support for cloud storage)
 * - Intelligent caching for improved performance
 * - Directory simulation using object prefixes
 * - Concurrent operations support
 * - Comprehensive error handling
 * 
 * @example
 * ```typescript
 * import { createDigitalOceanSpacesFileSystem } from '@synet/fs';
 * 
 * const doFS = createDigitalOceanSpacesFileSystem({
 *   endpoint: 'https://nyc3.digitaloceanspaces.com',
 *   accessKeyId: 'your-access-key',
 *   secretAccessKey: 'your-secret-key',
 *   bucket: 'my-space',
 *   region: 'nyc3'
 * });
 * 
 * await doFS.writeFile('config.json', JSON.stringify(config));
 * const data = await doFS.readFile('config.json');
 * ```
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type GetObjectCommandOutput,
  type HeadObjectCommandOutput,
  type ListObjectsV2CommandOutput
} from '@aws-sdk/client-s3';
import { type IAsyncFileSystem, type FileStats } from './filesystem.interface';

/**
 * Configuration options for DigitalOcean Spaces FileSystem
 */
export interface DigitalOceanSpacesOptions {
  /** DigitalOcean Spaces endpoint (e.g., https://nyc3.digitaloceanspaces.com) */
  endpoint: string;
  /** DO Spaces access key ID */
  accessKeyId: string;
  /** DO Spaces secret access key */
  secretAccessKey: string;
  /** DO Spaces bucket/space name */
  bucket: string;
  /** DO region (e.g., nyc3, sgp1, ams3) */
  region: string;
  /** Optional prefix for all operations (useful for namespacing) */
  prefix?: string;
}

/**
 * Cache entry for DO Spaces object metadata
 */
interface DOSpacesCacheEntry {
  size: number;
  lastModified: Date;
  etag: string;
}

/**
 * DigitalOcean Spaces FileSystem implementation using S3-compatible API
 * 
 * Provides async filesystem operations against DigitalOcean Spaces storage,
 * which is fully S3-compatible with some DigitalOcean-specific optimizations.
 */
export class DigitalOceanSpacesFileSystem implements IAsyncFileSystem {
  private s3Client: S3Client;
  private options: Required<DigitalOceanSpacesOptions>;
  private cache = new Map<string, DOSpacesCacheEntry>();

  constructor(options: DigitalOceanSpacesOptions) {
    // Set defaults and validate options
    this.options = {
      endpoint: options.endpoint,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      bucket: options.bucket,
      region: options.region,
      prefix: options.prefix || ''
    };

    if (!this.options.endpoint) {
      throw new Error('[DigitalOceanSpacesFileSystem] endpoint is required');
    }
    if (!this.options.accessKeyId) {
      throw new Error('[DigitalOceanSpacesFileSystem] accessKeyId is required');
    }
    if (!this.options.secretAccessKey) {
      throw new Error('[DigitalOceanSpacesFileSystem] secretAccessKey is required');
    }
    if (!this.options.bucket) {
      throw new Error('[DigitalOceanSpacesFileSystem] bucket is required');
    }
    if (!this.options.region) {
      throw new Error('[DigitalOceanSpacesFileSystem] region is required');
    }

    // Parse and normalize the endpoint - remove bucket name if included
    let normalizedEndpoint = this.options.endpoint;
    if (normalizedEndpoint.includes(`${this.options.bucket}.`)) {
      // Remove bucket from endpoint if it's already there
      normalizedEndpoint = normalizedEndpoint.replace(`${this.options.bucket}.`, '');
    }

    // Initialize S3 client configured for DigitalOcean Spaces
    this.s3Client = new S3Client({
      region: this.options.region,
      endpoint: normalizedEndpoint,
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey
      },
      // DigitalOcean Spaces configuration
      forcePathStyle: false, // DO Spaces uses virtual-hosted style
      maxAttempts: 3
    });
  }

  /**
   * Get the DO Spaces object key with prefix applied
   */
  private getDOKey(path: string): string {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return this.options.prefix ? `${this.options.prefix}/${normalizedPath}` : normalizedPath;
  }

  /**
   * Remove prefix from DO Spaces object key to get local path
   */
  private getLocalPath(key: string): string {
    if (this.options.prefix && key.startsWith(`${this.options.prefix}/`)) {
      return key.slice(this.options.prefix.length + 1);
    }
    return key;
  }

  /**
   * Check if an error is a "not found" error
   */
  private isNotFoundError(error: unknown): boolean {
    return (error as any)?.name === 'NoSuchKey' || 
           (error as any)?.$metadata?.httpStatusCode === 404;
  }

  /**
   * Convert DO Spaces response stream to string
   */
  private async streamToString(stream: any): Promise<string> {
    if (!stream) return '';
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  }

  /**
   * Read file content from DigitalOcean Spaces
   */
  async readFile(path: string): Promise<string> {
    try {
      const key = this.getDOKey(path);
      
      // Check cache first
      const cached = this.cache.get(key);
      if (cached) {
        // Note: In a real implementation, you might want to validate cache freshness
        // For now, we'll still fetch from DO Spaces but cache metadata
      }

      const command = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key
      });

      const response: GetObjectCommandOutput = await this.s3Client.send(command);
      const content = await this.streamToString(response.Body);

      // Cache metadata
      if (response.ContentLength !== undefined && response.LastModified) {
        this.cache.set(key, {
          size: response.ContentLength,
          lastModified: response.LastModified,
          etag: response.ETag || ''
        });
      }

      return content;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[DigitalOceanSpacesFileSystem] File not found: ${path}`);
      }
      throw new Error(`[DigitalOceanSpacesFileSystem] Failed to read file ${path}: ${error}`);
    }
  }

  /**
   * Write file content to DigitalOcean Spaces
   */
  async writeFile(path: string, content: string): Promise<void> {
    try {
      const key = this.getDOKey(path);
      
      const command = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: content,
        ContentType: this.getContentType(path)
      });

      const response = await this.s3Client.send(command);

      // Update cache
      this.cache.set(key, {
        size: Buffer.byteLength(content, 'utf-8'),
        lastModified: new Date(),
        etag: response.ETag || ''
      });
    } catch (error: unknown) {
      throw new Error(`[DigitalOceanSpacesFileSystem] Failed to write file ${path}: ${error}`);
    }
  }

  /**
   * Check if file exists in DigitalOcean Spaces
   */
  async exists(path: string): Promise<boolean> {
    try {
      const key = this.getDOKey(path);
      
      // Check cache first
      if (this.cache.has(key)) {
        return true;
      }

      const command = new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key
      });

      const response: HeadObjectCommandOutput = await this.s3Client.send(command);
      
      // Cache metadata
      if (response.ContentLength !== undefined && response.LastModified) {
        this.cache.set(key, {
          size: response.ContentLength,
          lastModified: response.LastModified,
          etag: response.ETag || ''
        });
      }

      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw new Error(`[DigitalOceanSpacesFileSystem] Failed to check file existence for ${path}: ${error}`);
    }
  }

  /**
   * Delete file from DigitalOcean Spaces
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const key = this.getDOKey(path);
      
      const command = new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: key
      });

      await this.s3Client.send(command);
      
      // Remove from cache
      this.cache.delete(key);
    } catch (error: unknown) {
      if (!this.isNotFoundError(error)) {
        throw new Error(`[DigitalOceanSpacesFileSystem] Failed to delete file ${path}: ${error}`);
      }
      // Silently succeed if file doesn't exist
    }
  }

  /**
   * List directory contents (simulated using object prefixes)
   */
  async readDir(path: string): Promise<string[]> {
    try {
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      const prefix = this.getDOKey(normalizedPath);
      
      const command = new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: prefix,
        Delimiter: '/'
      });

      const response: ListObjectsV2CommandOutput = await this.s3Client.send(command);
      const entries: string[] = [];

      // Add files in current directory
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== prefix) {
            const localPath = this.getLocalPath(object.Key);
            const fileName = localPath.substring(normalizedPath.length);
            if (fileName && !fileName.includes('/')) {
              entries.push(fileName);
              
              // Cache metadata
              if (object.Size !== undefined && object.LastModified) {
                this.cache.set(object.Key, {
                  size: object.Size,
                  lastModified: object.LastModified,
                  etag: object.ETag || ''
                });
              }
            }
          }
        }
      }

      // Add subdirectories
      if (response.CommonPrefixes) {
        for (const commonPrefix of response.CommonPrefixes) {
          if (commonPrefix.Prefix) {
            const localPath = this.getLocalPath(commonPrefix.Prefix);
            const dirName = localPath.substring(normalizedPath.length).replace(/\/$/, '');
            if (dirName) {
              entries.push(`${dirName}/`);
            }
          }
        }
      }

      return entries.sort();
    } catch (error: unknown) {
      throw new Error(`[DigitalOceanSpacesFileSystem] Failed to read directory ${path}: ${error}`);
    }
  }

  /**
   * Delete directory and all its contents from DigitalOcean Spaces
   */
  async deleteDir(path: string): Promise<void> {
    try {
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      const prefix = this.getDOKey(normalizedPath);
      
      // List all objects with the prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: prefix
      });

      const listResponse: ListObjectsV2CommandOutput = await this.s3Client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return; // Directory is empty or doesn't exist
      }

      // Delete objects in batches (DO Spaces supports batch delete like S3)
      const objects = listResponse.Contents.map(obj => ({ Key: obj.Key! })).filter(obj => obj.Key);
      
      if (objects.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: {
            Objects: objects
          }
        });

        await this.s3Client.send(deleteCommand);
        
        // Remove from cache
        for (const obj of objects) {
          this.cache.delete(obj.Key);
        }
      }
    } catch (error: unknown) {
      throw new Error(`[DigitalOceanSpacesFileSystem] Failed to delete directory ${path}: ${error}`);
    }
  }

  /**
   * Get file statistics
   */
  async stat(path: string): Promise<FileStats> {
    try {
      const key = this.getDOKey(path);
      
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
          isSymbolicLink: () => false
        };
      }

      // Get from DigitalOcean Spaces
      const command = new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key
      });

      const response: HeadObjectCommandOutput = await this.s3Client.send(command);
      
      const stats: FileStats = {
        size: response.ContentLength || 0,
        mtime: response.LastModified || new Date(),
        ctime: response.LastModified || new Date(),
        atime: response.LastModified || new Date(),
        mode: 0o644,
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false
      };

      // Cache the metadata
      this.cache.set(key, {
        size: stats.size,
        lastModified: stats.mtime,
        etag: response.ETag || ''
      });

      return stats;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[DigitalOceanSpacesFileSystem] File not found: ${path}`);
      }
      throw new Error(`[DigitalOceanSpacesFileSystem] Failed to get file stats for ${path}: ${error}`);
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'json': 'application/json',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'xml': 'application/xml',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Ensure directory exists (no-op for DO Spaces as directories are virtual)
   */
  async ensureDir(path: string): Promise<void> {
    // DigitalOcean Spaces (like S3) doesn't have real directories - they're simulated via prefixes
    // This is a no-op but we could optionally create a placeholder file
    return Promise.resolve();
  }

  /**
   * Change file permissions (no-op for DO Spaces as it doesn't support POSIX permissions)
   */
  async chmod(path: string, mode: number): Promise<void> {
    // DigitalOcean Spaces doesn't support POSIX file permissions
    // This is a no-op for cloud storage compatibility
    return Promise.resolve();
  }

  /**
   * Get DigitalOcean Spaces bucket and configuration information
   */
  getSpaceInfo(): {
    bucket: string;
    prefix: string;
    region: string;
    endpoint: string;
  } {
    return {
      bucket: this.options.bucket,
      prefix: this.options.prefix,
      region: this.options.region,
      endpoint: this.options.endpoint
    };
  }
}

/**
 * Factory function to create a new DigitalOcean Spaces FileSystem instance
 */
export function createDigitalOceanSpacesFileSystem(options: DigitalOceanSpacesOptions): DigitalOceanSpacesFileSystem {
  return new DigitalOceanSpacesFileSystem(options);
}
