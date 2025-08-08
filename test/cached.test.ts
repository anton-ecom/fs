import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CachedFileSystem, createCachedFileSystem, type CachedFileSystemOptions } from '../src/cached';
import { MemFileSystem } from './fixtures/memory';

describe('CachedFileSystem (Sync)', () => {
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
    it('should cache file reads', () => {
      const spy = vi.spyOn(memFs, 'readFileSync');
      
      memFs.writeFileSync('./test.txt', 'content');
      
      // First read - should hit filesystem
      const content1 = cachedFs.readFileSync('./test.txt');
      expect(content1).toBe('content');
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second read - should hit cache
      const content2 = cachedFs.readFileSync('./test.txt');
      expect(content2).toBe('content');
      expect(spy).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should cache multiple files independently', () => {
      memFs.writeFileSync('./file1.txt', 'content1');
      memFs.writeFileSync('./file2.txt', 'content2');
      
      const content1 = cachedFs.readFileSync('./file1.txt');
      const content2 = cachedFs.readFileSync('./file2.txt');
      
      expect(content1).toBe('content1');
      expect(content2).toBe('content2');
      
      const stats = cachedFs.getCacheStats();
      expect(stats.readCache.size).toBe(2);
    });

    it('should respect TTL and expire cached entries', () => {
      const shortTtlFs = new CachedFileSystem(memFs, { ttl: 10 }); // 10ms TTL
      const spy = vi.spyOn(memFs, 'readFileSync');
      
      memFs.writeFileSync('./test.txt', 'content');
      
      // First read
      shortTtlFs.readFileSync('./test.txt');
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Wait for TTL to expire
      return new Promise(resolve => {
        setTimeout(() => {
          // Second read after TTL expiry - should hit filesystem again
          shortTtlFs.readFileSync('./test.txt');
          expect(spy).toHaveBeenCalledTimes(2);
          resolve(undefined);
        }, 15);
      });
    });
  });

  describe('exists caching', () => {
    it('should cache existence checks when enabled', () => {
      memFs.writeFileSync('./test.txt', 'content');
      const spy = vi.spyOn(memFs, 'existsSync');
      
      // First check - should hit filesystem
      const exists1 = cachedFs.existsSync('./test.txt');
      expect(exists1).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second check - should hit cache
      const exists2 = cachedFs.existsSync('./test.txt');
      expect(exists2).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache existence checks when disabled', () => {
      const fs = new CachedFileSystem(memFs, { cacheExists: false });
      memFs.writeFileSync('./test.txt', 'content');
      const spy = vi.spyOn(memFs, 'existsSync');
      
      fs.existsSync('./test.txt');
      fs.existsSync('./test.txt');
      
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should cache non-existence as well', () => {
      const spy = vi.spyOn(memFs, 'existsSync');
      
      // First check - file doesn't exist
      const exists1 = cachedFs.existsSync('./nonexistent.txt');
      expect(exists1).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second check - should hit cache
      const exists2 = cachedFs.existsSync('./nonexistent.txt');
      expect(exists2).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('directory listing caching', () => {
    it('should cache directory listings when enabled', () => {
      const spy = vi.spyOn(memFs, 'readDirSync');
      
      memFs.ensureDirSync('./testdir');
      memFs.writeFileSync('./testdir/file1.txt', 'content1');
      memFs.writeFileSync('./testdir/file2.txt', 'content2');
      
      // First read - should hit filesystem
      const entries1 = cachedFs.readDirSync('./testdir');
      expect(entries1).toContain('file1.txt');
      expect(entries1).toContain('file2.txt');
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second read - should hit cache
      const entries2 = cachedFs.readDirSync('./testdir');
      expect(entries2).toEqual(entries1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache directory listings when disabled', () => {
      const fs = new CachedFileSystem(memFs, { cacheDirListing: false });
      const spy = vi.spyOn(memFs, 'readDirSync');
      
      memFs.ensureDirSync('./testdir');
      
      fs.readDirSync('./testdir');
      fs.readDirSync('./testdir');
      
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache invalidation', () => {
    it('should update cache on write operations', () => {
      const readSpy = vi.spyOn(memFs, 'readFileSync');
      
      // Write file and read it
      cachedFs.writeFileSync('./test.txt', 'original');
      const content1 = cachedFs.readFileSync('./test.txt');
      expect(content1).toBe('original');
      expect(readSpy).toHaveBeenCalledTimes(0); // Should come from cache
      
      // Write new content
      cachedFs.writeFileSync('./test.txt', 'updated');
      const content2 = cachedFs.readFileSync('./test.txt');
      expect(content2).toBe('updated');
      expect(readSpy).toHaveBeenCalledTimes(0); // Should come from cache
    });

    it('should invalidate cache on file deletion', () => {
      const readSpy = vi.spyOn(memFs, 'readFileSync');
      
      cachedFs.writeFileSync('./test.txt', 'content');
      cachedFs.readFileSync('./test.txt'); // Cache it
      
      cachedFs.deleteFileSync('./test.txt');
      
      // Next read should hit filesystem (and fail)
      expect(() => cachedFs.readFileSync('./test.txt')).toThrow();
      expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it('should invalidate directory cache when files are added', () => {
      const dirSpy = vi.spyOn(memFs, 'readDirSync');
      
      // Ensure directory exists first (this may call readDirSync internally)
      cachedFs.ensureDirSync('./testdir');
      
      // Ensure directory is empty first
      const initialFiles = memFs.readDirSync('./testdir');
      // Clear any existing files
      for (const file of initialFiles) {
        memFs.deleteFileSync(`./testdir/${file}`);
      }
      
      // Reset spy after setup to count only our test calls
      dirSpy.mockClear();
      
      // Read directory - should cache empty result
      const entries1 = cachedFs.readDirSync('./testdir');
      expect(entries1).toEqual([]);
      expect(dirSpy).toHaveBeenCalledTimes(1);
      
      // Add file - should invalidate parent directory cache
      cachedFs.writeFileSync('./testdir/newfile.txt', 'content');
      
      // Next directory read should hit filesystem
      const entries2 = cachedFs.readDirSync('./testdir');
      expect(entries2).toContain('newfile.txt');
      expect(dirSpy).toHaveBeenCalledTimes(2);
    });

    it('should manually invalidate specific files', () => {
      const readSpy = vi.spyOn(memFs, 'readFileSync');
      
      cachedFs.writeFileSync('./test.txt', 'content');
      cachedFs.readFileSync('./test.txt'); // Cache it
      
      // Manually invalidate
      cachedFs.invalidateFile('./test.txt');
      
      // Next read should hit filesystem
      cachedFs.readFileSync('./test.txt');
      expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it('should manually invalidate entire directories', () => {
      cachedFs.writeFileSync('./testdir/file1.txt', 'content1');
      cachedFs.writeFileSync('./testdir/file2.txt', 'content2');
      
      // Cache the files
      cachedFs.readFileSync('./testdir/file1.txt');
      cachedFs.readFileSync('./testdir/file2.txt');
      
      const stats1 = cachedFs.getCacheStats();
      expect(stats1.readCache.size).toBe(2);
      
      // Invalidate directory
      cachedFs.invalidateDirectory('./testdir');
      
      const stats2 = cachedFs.getCacheStats();
      expect(stats2.readCache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when cache is full', () => {
      const smallCacheFs = new CachedFileSystem(memFs, { maxSize: 2 });
      
      // Fill cache to capacity
      smallCacheFs.writeFileSync('./file1.txt', 'content1');
      smallCacheFs.writeFileSync('./file2.txt', 'content2');
      
      smallCacheFs.readFileSync('./file1.txt'); // Access file1
      smallCacheFs.readFileSync('./file2.txt'); // Access file2
      
      let stats = smallCacheFs.getCacheStats();
      expect(stats.readCache.size).toBe(2);
      
      // Add third file - should evict LRU (file1)
      smallCacheFs.writeFileSync('./file3.txt', 'content3');
      smallCacheFs.readFileSync('./file3.txt');
      
      stats = smallCacheFs.getCacheStats();
      expect(stats.readCache.size).toBe(2);
      expect(stats.readCache.entries).not.toContain('./file1.txt');
      expect(stats.readCache.entries).toContain('./file2.txt');
      expect(stats.readCache.entries).toContain('./file3.txt');
    });

    it('should update access order on cache hits', () => {
      const smallCacheFs = new CachedFileSystem(memFs, { maxSize: 2 });
      
      smallCacheFs.writeFileSync('./file1.txt', 'content1');
      smallCacheFs.writeFileSync('./file2.txt', 'content2');
      
      smallCacheFs.readFileSync('./file1.txt'); // Access file1
      smallCacheFs.readFileSync('./file2.txt'); // Access file2
      smallCacheFs.readFileSync('./file1.txt'); // Access file1 again (make it MRU)
      
      // Add third file - should evict file2 (now LRU)
      smallCacheFs.writeFileSync('./file3.txt', 'content3');
      smallCacheFs.readFileSync('./file3.txt');
      
      const stats = smallCacheFs.getCacheStats();
      expect(stats.readCache.entries).toContain('./file1.txt'); // Should still be cached
      expect(stats.readCache.entries).not.toContain('./file2.txt'); // Should be evicted
      expect(stats.readCache.entries).toContain('./file3.txt');
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      cachedFs.writeFileSync('./file1.txt', 'content1');
      cachedFs.writeFileSync('./file2.txt', 'content2');
      cachedFs.readFileSync('./file1.txt'); // Explicit read (though already cached by write)
      
      // Clear all caches and then call existsSync to test the cache properly
      cachedFs.clearCache();
      cachedFs.readFileSync('./file1.txt');  // Re-add to read cache
      cachedFs.readFileSync('./file2.txt');  // Re-add to read cache
      cachedFs.existsSync('./file2.txt');    // This adds to exists cache
      
      const stats = cachedFs.getCacheStats();
      
      expect(stats.readCache.size).toBe(2); // Both files cached by read calls
      expect(stats.existsCache.size).toBe(1); // Only file2 in exists cache
      expect(stats.readCache.entries).toContain('./file1.txt');
      expect(stats.readCache.entries).toContain('./file2.txt');
      expect(stats.existsCache.entries).toContain('./file2.txt');
      expect(stats.options.maxSize).toBe(100);
    });

    it('should clear all caches', () => {
      cachedFs.writeFileSync('./test.txt', 'content');
      cachedFs.readFileSync('./test.txt');
      cachedFs.existsSync('./test.txt');
      
      expect(cachedFs.getCacheStats().readCache.size).toBe(1);
      expect(cachedFs.getCacheStats().existsCache.size).toBe(1);
      
      cachedFs.clearCache();
      
      expect(cachedFs.getCacheStats().readCache.size).toBe(0);
      expect(cachedFs.getCacheStats().existsCache.size).toBe(0);
    });
  });

  describe('filesystem interface compliance', () => {
    it('should implement all IFileSystem methods', () => {
      const content = 'test content';
      const filePath = './test.txt';
      
      // Write and read
      cachedFs.writeFileSync(filePath, content);
      expect(cachedFs.readFileSync(filePath)).toBe(content);
      
      // Exists
      expect(cachedFs.existsSync(filePath)).toBe(true);
      expect(cachedFs.existsSync('./nonexistent.txt')).toBe(false);
      
      // Directory operations
      cachedFs.ensureDirSync('./newdir');
      expect(memFs.existsSync('./newdir')).toBe(true);
      
      cachedFs.writeFileSync('./newdir/file.txt', 'content');
      const dirEntries = cachedFs.readDirSync('./newdir');
      expect(dirEntries).toContain('file.txt');
      
      // Chmod
      expect(() => cachedFs.chmodSync(filePath, 0o755)).not.toThrow();
      
      // Delete
      cachedFs.deleteFileSync(filePath);
      expect(cachedFs.existsSync(filePath)).toBe(false);
      
      cachedFs.deleteDirSync('./newdir');
      expect(memFs.existsSync('./newdir')).toBe(false);
    });

    it('should handle clear operation if available', () => {
      cachedFs.writeFileSync('./test/file.txt', 'content');
      cachedFs.readFileSync('./test/file.txt'); // Cache it
      
      if (cachedFs.clear) {
        cachedFs.clear('./test');
        
        // Should have invalidated cache
        const stats = cachedFs.getCacheStats();
        expect(stats.readCache.entries).not.toContain('./test/file.txt');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent access to same file', () => {
      const spy = vi.spyOn(memFs, 'readFileSync');
      
      cachedFs.writeFileSync('./test.txt', 'content');
      
      // Multiple concurrent reads should only hit filesystem once
      const content1 = cachedFs.readFileSync('./test.txt');
      const content2 = cachedFs.readFileSync('./test.txt');
      const content3 = cachedFs.readFileSync('./test.txt');
      
      expect(content1).toBe('content');
      expect(content2).toBe('content');
      expect(content3).toBe('content');
      expect(spy).toHaveBeenCalledTimes(0); // All from cache after write
    });

    it('should handle empty files', () => {
      cachedFs.writeFileSync('./empty.txt', '');
      const content = cachedFs.readFileSync('./empty.txt');
      
      expect(content).toBe('');
      
      const stats = cachedFs.getCacheStats();
      expect(stats.readCache.size).toBe(1);
    });

    it('should handle files with special characters in paths', () => {
      const specialPath = './special chars & symbols (test).txt';
      
      cachedFs.writeFileSync(specialPath, 'content');
      const content = cachedFs.readFileSync(specialPath);
      
      expect(content).toBe('content');
      
      const stats = cachedFs.getCacheStats();
      expect(stats.readCache.entries).toContain(specialPath);
    });
  });
});
