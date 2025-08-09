import type { IAsyncFileSystem } from "./async-filesystem.interface";

/**
 * Cache configuration options
 */
export interface CachedFileSystemOptions {
  /** Maximum number of files to cache (default: 100) */
  maxSize?: number;
  /** Time-to-live for cached entries in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to cache only read operations or also existence checks (default: true) */
  cacheExists?: boolean;
  /** Whether to cache directory listings (default: true) */
  cacheDirListing?: boolean;
}

/**
 * Cache entry containing the cached data and metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * LRU Cache with TTL support
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(
    private maxSize: number,
    private defaultTtl: number,
  ) {}

  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    };

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return undefined;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()),
    };
  }
}

/**
 * CachedFileSystem provides LRU caching with TTL for async file operations
 * Dramatically improves performance by caching frequently accessed files
 */
export class CachedFileSystem implements IAsyncFileSystem {
  private readCache: LRUCache<string>;
  private existsCache: LRUCache<boolean>;
  private dirCache: LRUCache<string[]>;
  private readonly options: Required<CachedFileSystemOptions>;

  constructor(
    private baseFileSystem: IAsyncFileSystem,
    options: CachedFileSystemOptions = {},
  ) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes
      cacheExists: options.cacheExists ?? true,
      cacheDirListing: options.cacheDirListing ?? true,
    };

    this.readCache = new LRUCache<string>(
      this.options.maxSize,
      this.options.ttl,
    );
    this.existsCache = new LRUCache<boolean>(
      this.options.maxSize,
      this.options.ttl,
    );
    this.dirCache = new LRUCache<string[]>(
      this.options.maxSize,
      this.options.ttl,
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      readCache: this.readCache.getStats(),
      existsCache: this.existsCache.getStats(),
      dirCache: this.dirCache.getStats(),
      options: this.options,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.readCache.clear();
    this.existsCache.clear();
    this.dirCache.clear();
  }

  /**
   * Invalidate cache for a specific file
   */
  invalidateFile(path: string): void {
    this.readCache.delete(path);
    this.existsCache.delete(path);

    // Also invalidate parent directory cache
    const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
    this.dirCache.delete(parentDir);
  }

  /**
   * Invalidate cache for a directory and all its children
   */
  invalidateDirectory(dirPath: string): void {
    const normalizedDir = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;

    // Clear directory listing cache
    this.dirCache.delete(dirPath);

    // Clear caches for all files in the directory
    for (const key of this.readCache.getStats().entries) {
      if (key.startsWith(normalizedDir)) {
        this.readCache.delete(key);
        this.existsCache.delete(key);
      }
    }
  }

  // IAsyncFileSystem implementation

  async exists(path: string): Promise<boolean> {
    if (!this.options.cacheExists) {
      return await this.baseFileSystem.exists(path);
    }

    const cached = this.existsCache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    const exists = await this.baseFileSystem.exists(path);
    this.existsCache.set(path, exists);
    return exists;
  }

  async readFile(path: string): Promise<string> {
    const cached = this.readCache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    const content = await this.baseFileSystem.readFile(path);
    this.readCache.set(path, content);
    return content;
  }

  async writeFile(path: string, data: string): Promise<void> {
    await this.baseFileSystem.writeFile(path, data);

    // Update cache with new content
    this.readCache.set(path, data);
    this.existsCache.set(path, true);

    // Invalidate parent directory cache
    const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
    this.dirCache.delete(parentDir);
  }

  async deleteFile(path: string): Promise<void> {
    await this.baseFileSystem.deleteFile(path);
    this.invalidateFile(path);
  }

  async deleteDir(path: string): Promise<void> {
    await this.baseFileSystem.deleteDir(path);
    this.invalidateDirectory(path);
  }

  async readDir(dirPath: string): Promise<string[]> {
    if (!this.options.cacheDirListing) {
      return await this.baseFileSystem.readDir(dirPath);
    }

    const cached = this.dirCache.get(dirPath);
    if (cached !== undefined) {
      return cached;
    }

    const entries = await this.baseFileSystem.readDir(dirPath);
    this.dirCache.set(dirPath, entries);
    return entries;
  }

  async ensureDir(path: string): Promise<void> {
    await this.baseFileSystem.ensureDir(path);

    // Invalidate parent directory cache
    const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
    this.dirCache.delete(parentDir);
  }

  async chmod(path: string, mode: number): Promise<void> {
    await this.baseFileSystem.chmod(path, mode);
    // Note: chmod doesn't affect file content or existence, so no cache invalidation needed
  }

  async clear?(dirPath: string): Promise<void> {
    if (this.baseFileSystem.clear) {
      await this.baseFileSystem.clear(dirPath);
      this.invalidateDirectory(dirPath);
    }
  }
}

/**
 * Convenience function to create a cached filesystem with common defaults
 */
export function createCachedFileSystem(
  baseFileSystem: IAsyncFileSystem,
  options?: CachedFileSystemOptions,
): CachedFileSystem {
  return new CachedFileSystem(baseFileSystem, options);
}
