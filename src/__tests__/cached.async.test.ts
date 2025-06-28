import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CachedFileSystem, createCachedFileSystem, type CachedFileSystemOptions } from '../promises/cached';
import { MemFileSystem } from '../promises/memory';

describe('CachedFileSystem (Async)', () => {
  let memFs: MemFileSystem;
  let cachedFs: CachedFileSystem;

  beforeEach(() => {
    memFs = new MemFileSystem();
    cachedFs = new CachedFileSystem(memFs);
  });

  describe('caching configuration', () => {
    it('should use default options when none provided', () => {
      const fs = new CachedFileSystem(memFs);
      const stats = fs.getCacheStats();
      
      expect(stats.options.maxSize).toBe(100);
      expect(stats.options.ttl).toBe(5 * 60 * 1000); // 5 minutes
      expect(stats.options.cacheExists).toBe(true);
      expect(stats.options.cacheDirListing).toBe(true);
    });

    it('should use custom options when provided', () => {
      const options: CachedFileSystemOptions = {
        maxSize: 50,
        ttl: 60000, // 1 minute
        cacheExists: false,
        cacheDirListing: false
      };
      
      const fs = new CachedFileSystem(memFs, options);
      const stats = fs.getCacheStats();
      
      expect(stats.options.maxSize).toBe(50);
      expect(stats.options.ttl).toBe(60000);
      expect(stats.options.cacheExists).toBe(false);
      expect(stats.options.cacheDirListing).toBe(false);
    });

    it('should create filesystem with convenience function', () => {
      const fs = createCachedFileSystem(memFs, { maxSize: 25 });
      const stats = fs.getCacheStats();
      
      expect(stats.options.maxSize).toBe(25);
    });
  });

  describe('read caching', () => {
    it('should cache file reads', async () => {
      const spy = vi.spyOn(memFs, 'readFile');
      
      await memFs.writeFile('./test.txt', 'content');
      
      // First read - should hit filesystem
      const content1 = await cachedFs.readFile('./test.txt');
      expect(content1).toBe('content');
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second read - should hit cache
      const content2 = await cachedFs.readFile('./test.txt');
      expect(content2).toBe('content');
      expect(spy).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should cache multiple files independently', async () => {
      await memFs.writeFile('./file1.txt', 'content1');
      await memFs.writeFile('./file2.txt', 'content2');
      
      const content1 = await cachedFs.readFile('./file1.txt');
      const content2 = await cachedFs.readFile('./file2.txt');
      
      expect(content1).toBe('content1');
      expect(content2).toBe('content2');
      
      const stats = cachedFs.getCacheStats();
      expect(stats.readCache.size).toBe(2);
    });

    it('should respect TTL and expire cached entries', async () => {
      const shortTtlFs = new CachedFileSystem(memFs, { ttl: 10 }); // 10ms TTL
      const spy = vi.spyOn(memFs, 'readFile');
      
      await memFs.writeFile('./test.txt', 'content');
      
      // First read
      await shortTtlFs.readFile('./test.txt');
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 15));
      
      // Second read after TTL expiry - should hit filesystem again
      await shortTtlFs.readFile('./test.txt');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('exists caching', () => {
    it('should cache existence checks when enabled', async () => {
      await memFs.writeFile('./test.txt', 'content');
      const spy = vi.spyOn(memFs, 'exists');
      
      // First check - should hit filesystem
      const exists1 = await cachedFs.exists('./test.txt');
      expect(exists1).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second check - should hit cache
      const exists2 = await cachedFs.exists('./test.txt');
      expect(exists2).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache existence checks when disabled', async () => {
      const fs = new CachedFileSystem(memFs, { cacheExists: false });
      await memFs.writeFile('./test.txt', 'content');
      const spy = vi.spyOn(memFs, 'exists');
      
      await fs.exists('./test.txt');
      await fs.exists('./test.txt');
      
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should cache non-existence as well', async () => {
      const spy = vi.spyOn(memFs, 'exists');
      
      // First check - file doesn't exist
      const exists1 = await cachedFs.exists('./nonexistent.txt');
      expect(exists1).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second check - should hit cache
      const exists2 = await cachedFs.exists('./nonexistent.txt');
      expect(exists2).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('directory listing caching', () => {
    it('should cache directory listings when enabled', async () => {
      const spy = vi.spyOn(memFs, 'readDir');
      
      await memFs.ensureDir('./testdir');
      await memFs.writeFile('./testdir/file1.txt', 'content1');
      await memFs.writeFile('./testdir/file2.txt', 'content2');
      
      // First read - should hit filesystem
      const entries1 = await cachedFs.readDir('./testdir');
      expect(entries1).toContain('file1.txt');
      expect(entries1).toContain('file2.txt');
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second read - should hit cache
      const entries2 = await cachedFs.readDir('./testdir');
      expect(entries2).toEqual(entries1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache directory listings when disabled', async () => {
      const fs = new CachedFileSystem(memFs, { cacheDirListing: false });
      const spy = vi.spyOn(memFs, 'readDir');
      
      await memFs.ensureDir('./testdir');
      
      await fs.readDir('./testdir');
      await fs.readDir('./testdir');
      
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache invalidation', () => {
    it('should update cache on write operations', async () => {
      const readSpy = vi.spyOn(memFs, 'readFile');
      
      // Write file and read it
      await cachedFs.writeFile('./test.txt', 'original');
      const content1 = await cachedFs.readFile('./test.txt');
      expect(content1).toBe('original');
      expect(readSpy).toHaveBeenCalledTimes(0); // Should come from cache
      
      // Write new content
      await cachedFs.writeFile('./test.txt', 'updated');
      const content2 = await cachedFs.readFile('./test.txt');
      expect(content2).toBe('updated');
      expect(readSpy).toHaveBeenCalledTimes(0); // Should come from cache
    });

    it('should invalidate cache on file deletion', async () => {
      const readSpy = vi.spyOn(memFs, 'readFile');
      
      await cachedFs.writeFile('./test.txt', 'content');
      await cachedFs.readFile('./test.txt'); // Cache it
      
      await cachedFs.deleteFile('./test.txt');
      
      // Next read should hit filesystem (and fail)
      await expect(cachedFs.readFile('./test.txt')).rejects.toThrow();
      expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it('should invalidate directory cache when files are added', async () => {
      const dirSpy = vi.spyOn(memFs, 'readDir');
      
      // Ensure directory exists first (this may call readDir internally)
      await cachedFs.ensureDir('./testdir');
      
      // Ensure directory is empty first
      const initialFiles = await memFs.readDir('./testdir');
      // Clear any existing files
      for (const file of initialFiles) {
        await memFs.deleteFile(`./testdir/${file}`);
      }
      
      // Reset spy after setup to count only our test calls
      dirSpy.mockClear();
      
      // Read directory - should cache empty result
      const entries1 = await cachedFs.readDir('./testdir');
      expect(entries1).toEqual([]);
      expect(dirSpy).toHaveBeenCalledTimes(1);
      
      // Add file - should invalidate parent directory cache
      await cachedFs.writeFile('./testdir/newfile.txt', 'content');
      
      // Next directory read should hit filesystem
      const entries2 = await cachedFs.readDir('./testdir');
      expect(entries2).toContain('newfile.txt');
      expect(dirSpy).toHaveBeenCalledTimes(2);
    });

    it('should manually invalidate specific files', async () => {
      const readSpy = vi.spyOn(memFs, 'readFile');
      
      await cachedFs.writeFile('./test.txt', 'content');
      await cachedFs.readFile('./test.txt'); // Cache it
      
      // Manually invalidate
      cachedFs.invalidateFile('./test.txt');
      
      // Next read should hit filesystem
      await cachedFs.readFile('./test.txt');
      expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it('should manually invalidate entire directories', async () => {
      await cachedFs.writeFile('./testdir/file1.txt', 'content1');
      await cachedFs.writeFile('./testdir/file2.txt', 'content2');
      
      // Cache the files
      await cachedFs.readFile('./testdir/file1.txt');
      await cachedFs.readFile('./testdir/file2.txt');
      
      const stats1 = cachedFs.getCacheStats();
      expect(stats1.readCache.size).toBe(2);
      
      // Invalidate directory
      cachedFs.invalidateDirectory('./testdir');
      
      const stats2 = cachedFs.getCacheStats();
      expect(stats2.readCache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when cache is full', async () => {
      const smallCacheFs = new CachedFileSystem(memFs, { maxSize: 2 });
      
      // Fill cache to capacity
      await smallCacheFs.writeFile('./file1.txt', 'content1');
      await smallCacheFs.writeFile('./file2.txt', 'content2');
      
      await smallCacheFs.readFile('./file1.txt'); // Access file1
      await smallCacheFs.readFile('./file2.txt'); // Access file2
      
      let stats = smallCacheFs.getCacheStats();
      expect(stats.readCache.size).toBe(2);
      
      // Add third file - should evict LRU (file1)
      await smallCacheFs.writeFile('./file3.txt', 'content3');
      await smallCacheFs.readFile('./file3.txt');
      
      stats = smallCacheFs.getCacheStats();
      expect(stats.readCache.size).toBe(2);
      expect(stats.readCache.entries).not.toContain('./file1.txt');
      expect(stats.readCache.entries).toContain('./file2.txt');
      expect(stats.readCache.entries).toContain('./file3.txt');
    });

    it('should update access order on cache hits', async () => {
      const smallCacheFs = new CachedFileSystem(memFs, { maxSize: 2 });
      
      await smallCacheFs.writeFile('./file1.txt', 'content1');
      await smallCacheFs.writeFile('./file2.txt', 'content2');
      
      await smallCacheFs.readFile('./file1.txt'); // Access file1
      await smallCacheFs.readFile('./file2.txt'); // Access file2
      await smallCacheFs.readFile('./file1.txt'); // Access file1 again (make it MRU)
      
      // Add third file - should evict file2 (now LRU)
      await smallCacheFs.writeFile('./file3.txt', 'content3');
      await smallCacheFs.readFile('./file3.txt');
      
      const stats = smallCacheFs.getCacheStats();
      expect(stats.readCache.entries).toContain('./file1.txt'); // Should still be cached
      expect(stats.readCache.entries).not.toContain('./file2.txt'); // Should be evicted
      expect(stats.readCache.entries).toContain('./file3.txt');
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', async () => {
      await cachedFs.writeFile('./file1.txt', 'content1');
      await cachedFs.writeFile('./file2.txt', 'content2');
      await cachedFs.readFile('./file1.txt'); // Explicit read (though already cached by write)
      
      // Clear all caches and then call exists to test the cache properly
      cachedFs.clearCache();
      await cachedFs.readFile('./file1.txt');  // Re-add to read cache
      await cachedFs.readFile('./file2.txt');  // Re-add to read cache
      await cachedFs.exists('./file2.txt');    // This adds to exists cache
      
      const stats = cachedFs.getCacheStats();
      
      expect(stats.readCache.size).toBe(2); // Both files cached by read calls
      expect(stats.existsCache.size).toBe(1); // Only file2 in exists cache
      expect(stats.readCache.entries).toContain('./file1.txt');
      expect(stats.readCache.entries).toContain('./file2.txt');
      expect(stats.existsCache.entries).toContain('./file2.txt');
      expect(stats.options.maxSize).toBe(100);
    });

    it('should clear all caches', async () => {
      await cachedFs.writeFile('./test.txt', 'content');
      await cachedFs.readFile('./test.txt');
      await cachedFs.exists('./test.txt');
      
      expect(cachedFs.getCacheStats().readCache.size).toBe(1);
      expect(cachedFs.getCacheStats().existsCache.size).toBe(1);
      
      cachedFs.clearCache();
      
      expect(cachedFs.getCacheStats().readCache.size).toBe(0);
      expect(cachedFs.getCacheStats().existsCache.size).toBe(0);
    });
  });

  describe('filesystem interface compliance', () => {
    it('should implement all IAsyncFileSystem methods', async () => {
      const content = 'test content';
      const filePath = './test.txt';
      
      // Write and read
      await cachedFs.writeFile(filePath, content);
      expect(await cachedFs.readFile(filePath)).toBe(content);
      
      // Exists
      expect(await cachedFs.exists(filePath)).toBe(true);
      expect(await cachedFs.exists('./nonexistent.txt')).toBe(false);
      
      // Directory operations
      await cachedFs.ensureDir('./newdir');
      expect(await memFs.exists('./newdir')).toBe(true);
      
      await cachedFs.writeFile('./newdir/file.txt', 'content');
      const dirEntries = await cachedFs.readDir('./newdir');
      expect(dirEntries).toContain('file.txt');
      
      // Chmod
      await expect(cachedFs.chmod(filePath, 0o755)).resolves.not.toThrow();
      
      // Delete
      await cachedFs.deleteFile(filePath);
      expect(await cachedFs.exists(filePath)).toBe(false);
      
      await cachedFs.deleteDir('./newdir');
      expect(await memFs.exists('./newdir')).toBe(false);
    });

    it('should handle clear operation if available', async () => {
      await cachedFs.writeFile('./test/file.txt', 'content');
      await cachedFs.readFile('./test/file.txt'); // Cache it
      
      if (cachedFs.clear) {
        await cachedFs.clear('./test');
        
        // Should have invalidated cache
        const stats = cachedFs.getCacheStats();
        expect(stats.readCache.entries).not.toContain('./test/file.txt');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent access to same file', async () => {
      const spy = vi.spyOn(memFs, 'readFile');
      
      await cachedFs.writeFile('./test.txt', 'content');
      
      // Multiple concurrent reads should only hit filesystem once
      const [content1, content2, content3] = await Promise.all([
        cachedFs.readFile('./test.txt'),
        cachedFs.readFile('./test.txt'),
        cachedFs.readFile('./test.txt')
      ]);
      
      expect(content1).toBe('content');
      expect(content2).toBe('content');
      expect(content3).toBe('content');
      expect(spy).toHaveBeenCalledTimes(0); // All from cache after write
    });

    it('should handle empty files', async () => {
      await cachedFs.writeFile('./empty.txt', '');
      const content = await cachedFs.readFile('./empty.txt');
      
      expect(content).toBe('');
      
      const stats = cachedFs.getCacheStats();
      expect(stats.readCache.size).toBe(1);
    });

    it('should handle files with special characters in paths', async () => {
      const specialPath = './special chars & symbols (test).txt';
      
      await cachedFs.writeFile(specialPath, 'content');
      const content = await cachedFs.readFile(specialPath);
      
      expect(content).toBe('content');
      
      const stats = cachedFs.getCacheStats();
      expect(stats.readCache.entries).toContain(specialPath);
    });
  });
});
