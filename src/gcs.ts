import { Storage, Bucket, File } from '@google-cloud/storage';
import type { IFileSystem, FileStats } from "./filesystem.interface";

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
 * Google Cloud Storage-based filesystem implementation
 * 
 * Provides filesystem operations on Google Cloud Storage.
 * Each file operation corresponds to GCS object operations.
 * Directories are handled virtually through object name prefixes.
 * 
 * Note: This is a synchronous implementation that uses sync-style methods
 * but internally makes async calls. It works, but not for production. For pure async implementation,
 * @use GCSFileSystemAsync.
 */
export class GCSFileSystem implements IFileSystem {
  private storage: Storage;
  private bucket: Bucket;
  private options: Required<Omit<GCSFileSystemOptions, 'keyFilename' | 'credentials' | 'apiEndpoint'>> & 
    Pick<GCSFileSystemOptions, 'keyFilename' | 'credentials' | 'apiEndpoint'>;
  private cache = new Map<string, GCSFileCache>();

  constructor(options: GCSFileSystemOptions) {
    this.options = {
      prefix: '',
      ...options
    };

    this.storage = new Storage({
      projectId: this.options.projectId,
      keyFilename: this.options.keyFilename,
      credentials: this.options.credentials,
      apiEndpoint: this.options.apiEndpoint
    });

    this.bucket = this.storage.bucket(this.options.bucket);
  }

  /**
   * Synchronously check if a file exists in GCS
   * @param path File path in the bucket
   */
  existsSync(path: string): boolean {
    try {
      const objectName = this.getGCSObjectName(path);
      
      // Check cache first
      if (this.cache.has(objectName)) {
        return true;
      }

      // Check GCS
      const file = this.bucket.file(objectName);
      const [exists] = this.makeSync(() => file.exists());

      if (exists) {
        // Try to get metadata to cache it
        try {
          const [metadata] = this.makeSync(() => file.getMetadata());
          this.cache.set(objectName, {
            size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0),
            lastModified: new Date(metadata.timeCreated || metadata.updated || Date.now()),
            etag: metadata.etag || ''
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
      throw new Error(`[GCSFileSystem] Failed to check file existence for ${path}: ${error}`);
    }
  }

  /**
   * Synchronously read a file from GCS
   * @param path File path in the bucket
   */
  readFileSync(path: string): string {
    try {
      const objectName = this.getGCSObjectName(path);
      
      // Check cache first
      const cached = this.cache.get(objectName);
      if (cached?.content) {
        return cached.content;
      }

      // Fetch from GCS
      const file = this.bucket.file(objectName);
      const [content] = this.makeSync(() => file.download());
      const contentStr = content.toString('utf8');
      
      // Get metadata for caching
      try {
        const [metadata] = this.makeSync(() => file.getMetadata());
        this.cache.set(objectName, {
          content: contentStr,
          size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0),
          lastModified: new Date(metadata.timeCreated || metadata.updated || Date.now()),
          etag: metadata.etag || ''
        });
      } catch {
        // Cache without metadata if it fails
        this.cache.set(objectName, {
          content: contentStr,
          size: Buffer.byteLength(contentStr, 'utf8'),
          lastModified: new Date(),
          etag: ''
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
   * Synchronously write a file to GCS
   * @param path File path in the bucket
   * @param data File content
   */
  writeFileSync(path: string): void;
  writeFileSync(path: string, data: string): void;
  writeFileSync(path: string, data?: string): void {
    if (data === undefined) {
      throw new Error('[GCSFileSystem] Data parameter is required for writeFileSync');
    }

    try {
      const objectName = this.getGCSObjectName(path);
      const file = this.bucket.file(objectName);
      
      const saveOptions = {
        metadata: {
          contentType: this.getContentType(path)
        }
      };

      this.makeSync(() => file.save(data, saveOptions));

      // Update cache
      this.cache.set(objectName, {
        content: data,
        size: Buffer.byteLength(data, 'utf8'),
        lastModified: new Date(),
        etag: '' // Will be updated when we next read metadata
      });

    } catch (error: unknown) {
      throw new Error(`[GCSFileSystem] Failed to write file ${path}: ${error}`);
    }
  }

  /**
   * Synchronously delete a file from GCS
   * @param path File path in the bucket
   */
  deleteFileSync(path: string): void {
    try {
      const objectName = this.getGCSObjectName(path);
      const file = this.bucket.file(objectName);
      
      this.makeSync(() => file.delete());

      // Remove from cache
      this.cache.delete(objectName);

    } catch (error: unknown) {
      // Remove from cache even if delete fails
      this.cache.delete(this.getGCSObjectName(path));
      
      // GCS delete throws error if object doesn't exist, unlike S3
      if (!this.isNotFoundError(error)) {
        throw new Error(`[GCSFileSystem] Failed to delete file ${path}: ${error}`);
      }
    }
  }

  /**
   * Synchronously delete a directory (delete all objects with prefix)
   * @param path Directory path
   */
  deleteDirSync(path: string): void {
    try {
      const prefix = this.getGCSObjectName(path);
      const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
      
      // List all objects with the prefix
      const [files] = this.makeSync(() => 
        this.bucket.getFiles({ prefix: normalizedPrefix })
      );

      if (files.length === 0) {
        return; // Nothing to delete
      }

      // Delete each object
      for (const file of files) {
        this.makeSync(() => file.delete());
        
        // Remove from cache
        this.cache.delete(file.name);
      }

    } catch (error: unknown) {
      throw new Error(`[GCSFileSystem] Failed to delete directory ${path}: ${error}`);
    }
  }

  /**
   * Synchronously ensure a directory exists (no-op for GCS)
   * @param dirPath Directory path
   */
  ensureDirSync(dirPath: string): void {
    // GCS doesn't have directories - they're implicit through object names
    // This is a no-op for compatibility
  }

  /**
   * Synchronously read directory contents
   * @param dirPath Directory path
   */
  readDirSync(dirPath: string): string[] {
    try {
      const prefix = this.getGCSObjectName(dirPath);
      const normalizedPrefix = prefix === '' ? '' : (prefix.endsWith('/') ? prefix : `${prefix}/`);
      
      // Get all files with the prefix
      const [files] = this.makeSync(() => 
        this.bucket.getFiles({ 
          prefix: normalizedPrefix
        })
      );

      const result: string[] = [];
      const seenDirectories = new Set<string>();

      // Process files to extract directory structure
      for (const file of files) {
        if (file.name && file.name !== normalizedPrefix) {
          const relativeName = file.name.replace(normalizedPrefix, '');
          
          // Skip empty relative names
          if (!relativeName) continue;
          
          // If it contains a slash, it's in a subdirectory
          if (relativeName.includes('/')) {
            const dirName = relativeName.split('/')[0];
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
      throw new Error(`[GCSFileSystem] Failed to read directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Set object permissions (simplified implementation)
   * @param path File path
   * @param mode Permission mode (simplified to public/private)
   */
  chmodSync(path: string, mode: number): void {
    // GCS has complex IAM permissions
    // This could be extended to set object ACLs, but for simplicity we'll make it a no-op
    // In a real implementation, you might use file.acl.add() or file.makePublic()
  }

  /**
   * Get file statistics
   * @param path File path
   */
  statSync(path: string): FileStats {
    try {
      const objectName = this.getGCSObjectName(path);
      
      // Check cache first
      const cached = this.cache.get(objectName);
      if (cached) {
        return this.createFileStats(cached.size, cached.lastModified, false);
      }

      // Fetch metadata from GCS
      const file = this.bucket.file(objectName);
      const [metadata] = this.makeSync(() => file.getMetadata());

      const size = typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0);
      const lastModified = new Date(metadata.timeCreated || metadata.updated || Date.now());
      
      // Cache metadata
      this.cache.set(objectName, {
        size,
        lastModified,
        etag: metadata.etag || ''
      });

      return this.createFileStats(size, lastModified, false);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error(`[GCSFileSystem] File not found: ${path}`);
      }
      throw new Error(`[GCSFileSystem] Failed to get file stats for ${path}: ${error}`);
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
      prefix: this.options.prefix
    };
  }

  /**
   * Get full GCS object name from filesystem path
   * @param path Filesystem path
   */
  private getGCSObjectName(path: string): string {
    // Remove leading slashes and normalize
    const normalizedPath = path.replace(/^\.?\/+/, '').replace(/\/+/g, '/');
    
    // Apply prefix if configured
    if (this.options.prefix) {
      const normalizedPrefix = this.options.prefix.replace(/^\/+|\/+$/g, '');
      return normalizedPrefix ? `${normalizedPrefix}/${normalizedPath}` : normalizedPath;
    }
    
    return normalizedPath;
  }

  /**
   * Get content type based on file extension
   * @param path File path
   */
  private getContentType(path: string): string {
    const ext = path.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'xml': 'application/xml',
      'md': 'text/markdown',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'pdf': 'application/pdf'
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Check if error is a "not found" error
   * @param error Error object
   */
  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    
    // Check for GCS API not found error
    if ('code' in error && (error as { code: number }).code === 404) {
      return true;
    }
    
    // Check for error message patterns
    if ('message' in error && typeof (error as { message: string }).message === 'string') {
      const message = (error as { message: string }).message.toLowerCase();
      return message.includes('not found') || message.includes('no such object');
    }
    
    return false;
  }

  /**
   * Create file statistics object
   * @param size File size in bytes
   * @param lastModified Last modified date
   * @param isDirectory Is the file a directory
   */
  private createFileStats(size: number, lastModified: Date, isDirectory: boolean): FileStats {
    return {
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isSymbolicLink: () => false, // GCS doesn't support symlinks
      size,
      mtime: lastModified,
      ctime: lastModified, // GCS doesn't have separate creation time
      atime: lastModified, // GCS doesn't track access time
      mode: 0o644 // Default permissions for GCS objects
    };
  }

  /**
   * Make synchronous call to async function
   * This is a helper for the sync API - not recommended for production use
   * @param asyncFn Async function to execute
   */
  private makeSync<T>(asyncFn: () => Promise<T>): T {
    let result: T | undefined;
    let error: unknown;
    let completed = false;

    asyncFn()
      .then(res => {
        result = res;
        completed = true;
      })
      .catch(err => {
        error = err;
        completed = true;
      });

    // Busy wait for completion (not ideal, but necessary for sync API)
    const start = Date.now();
    const timeout = 30000; // 30 second timeout

    while (!completed && (Date.now() - start) < timeout) {
      // Busy wait - empty loop body is intentional
    }

    if (!completed) {
      throw new Error('[GCSFileSystem] GCS operation timed out');
    }

    if (error) {
      throw error;
    }

    if (result === undefined) {
      throw new Error('[GCSFileSystem] Unexpected undefined result from GCS operation');
    }

    return result;
  }
}

/**
 * Create a new GCS filesystem instance
 * @param options GCS filesystem configuration
 */
export function createGCSFileSystem(options: GCSFileSystemOptions): GCSFileSystem {
  return new GCSFileSystem(options);
}
