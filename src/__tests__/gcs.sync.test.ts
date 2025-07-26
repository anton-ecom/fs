/**
 * GCS Sync Implementation Test
 * 
 * This test specifically evaluates the viability of the busy-wait sync approach
 * for Google Cloud Storage operations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GCSFileSystem, createGCSFileSystem, type GCSFileSystemOptions } from '../gcs';
import * as fs from 'fs';
import * as path from 'path';

// Load test credentials
const testConfigPath = path.join(__dirname, '../../private/google-test-access.json');
const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
const serviceAccountPath = path.join(__dirname, '../../private', testConfig.key);

const gcsOptions: GCSFileSystemOptions = {
  projectId: testConfig.projectId,
  bucket: testConfig.bucketName,
  keyFilename: serviceAccountPath,
  prefix: 'synet-fs-sync-test' // Use a test prefix to avoid conflicts
};

describe('GCS Sync FileSystem - Busy Wait Viability Test', () => {
  let syncFS: GCSFileSystem;
  
  const testFiles: string[] = [];
  
  beforeAll(() => {
    syncFS = createGCSFileSystem(gcsOptions);
    console.log(`🔧 Initialized GCS Sync FileSystem for bucket: ${testConfig.bucketName}`);
  }, 60000); // 60 second timeout for initialization

  afterAll(() => {
    // Cleanup: Delete all test files
    console.log('🧹 Cleaning up sync test files...');
    
    for (const testFile of testFiles) {
      try {
        syncFS.deleteFileSync(testFile);
        console.log(`✅ Deleted: ${testFile}`);
      } catch (error) {
        console.log(`⚠️  Could not delete ${testFile}: ${error}`);
      }
    }

    // Clear cache
    syncFS.clearCache();
  });

  describe('Basic Sync Operations Performance', () => {
    it('should perform sync write operation with timing', () => {
      const fileName = `sync-write-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = `Sync write test\nTimestamp: ${new Date().toISOString()}\nSize test: ${'x'.repeat(100)}`;

      console.time('Sync Write Operation');
      
      expect(() => {
        syncFS.writeFileSync(fileName, content);
      }).not.toThrow();
      
      console.timeEnd('Sync Write Operation');

      console.log(`✅ Sync write completed for ${fileName} (${content.length} bytes)`);
    }, 60000); // 60 second timeout

    it('should perform sync read operation with timing', () => {
      const fileName = testFiles[0]; // Use the file from previous test
      
      console.time('Sync Read Operation');
      
      const readContent = syncFS.readFileSync(fileName);
      
      console.timeEnd('Sync Read Operation');

      expect(readContent).toContain('Sync write test');
      console.log(`✅ Sync read completed for ${fileName} (${readContent.length} bytes)`);
    });

    it('should perform sync exists check with timing', () => {
      const fileName = testFiles[0];
      
      console.time('Sync Exists Check');
      
      const exists = syncFS.existsSync(fileName);
      
      console.timeEnd('Sync Exists Check');

      expect(exists).toBe(true);
      console.log(`✅ Sync exists check completed: ${exists}`);
    });

    it('should get file stats synchronously', () => {
      const fileName = testFiles[0];
      
      console.time('Sync Stat Operation');
      
      const stats = syncFS.statSync(fileName);
      
      console.timeEnd('Sync Stat Operation');

      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      
      console.log(`📊 Sync stats: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
    });
  });

  describe('Multiple Sync Operations Stress Test', () => {
    it('should handle multiple consecutive sync writes', () => {
      const baseFileName = `multi-sync-${Date.now()}`;
      const numFiles = 3; // Keep it small to avoid long test times
      
      console.time('Multiple Sync Writes');
      
      for (let i = 0; i < numFiles; i++) {
        const fileName = `${baseFileName}-${i}.txt`;
        testFiles.push(fileName);
        
        const content = `File ${i}\nContent for sync test\nTimestamp: ${new Date().toISOString()}`;
        
        console.time(`Write ${i}`);
        syncFS.writeFileSync(fileName, content);
        console.timeEnd(`Write ${i}`);
      }
      
      console.timeEnd('Multiple Sync Writes');
      
      console.log(`✅ Completed ${numFiles} consecutive sync writes`);
    });

    it('should handle multiple consecutive sync reads', () => {
      const recentFiles = testFiles.slice(-3); // Get the last 3 files
      
      console.time('Multiple Sync Reads');
      
      const contents: string[] = [];
      for (let i = 0; i < recentFiles.length; i++) {
        console.time(`Read ${i}`);
        const content = syncFS.readFileSync(recentFiles[i]);
        console.timeEnd(`Read ${i}`);
        contents.push(content);
      }
      
      console.timeEnd('Multiple Sync Reads');
      
      expect(contents).toHaveLength(recentFiles.length);
      console.log(`✅ Completed ${recentFiles.length} consecutive sync reads`);
    });
  });

  describe('Cache Performance Test', () => {
    it('should show cache performance improvement', () => {
      const fileName = testFiles[0];
      
      // Clear cache first
      syncFS.clearCache();
      
      console.time('First read (no cache)');
      const content1 = syncFS.readFileSync(fileName);
      console.timeEnd('First read (no cache)');
      
      console.time('Second read (cached)');
      const content2 = syncFS.readFileSync(fileName);
      console.timeEnd('Second read (cached)');
      
      console.time('Third read (cached)');
      const content3 = syncFS.readFileSync(fileName);
      console.timeEnd('Third read (cached)');
      
      expect(content1).toBe(content2);
      expect(content2).toBe(content3);
      
      console.log(`🗄️  Cache performance test completed - content consistent`);
    });
  });

  describe('Directory Operations Sync Test', () => {
    it('should handle sync directory listing', () => {
      // First create a nested file
      const dirFileName = `sync-dir/nested-${Date.now()}.txt`;
      testFiles.push(dirFileName);
      
      console.time('Sync Directory Write');
      syncFS.writeFileSync(dirFileName, 'Nested file content for sync test');
      console.timeEnd('Sync Directory Write');
      
      console.time('Sync Directory List');
      const dirContents = syncFS.readDirSync('sync-dir');
      console.timeEnd('Sync Directory List');
      
      expect(dirContents.length).toBeGreaterThan(0);
      console.log(`📂 Sync directory listing: ${dirContents.join(', ')}`);
    });
  });

  describe('Error Handling Sync Test', () => {
    it('should handle non-existent file gracefully', () => {
      const nonExistentFile = `non-existent-${Date.now()}.txt`;
      
      console.time('Sync Non-existent Check');
      const exists = syncFS.existsSync(nonExistentFile);
      console.timeEnd('Sync Non-existent Check');
      
      expect(exists).toBe(false);
      
      console.time('Sync Non-existent Read Error');
      expect(() => syncFS.readFileSync(nonExistentFile)).toThrow();
      console.timeEnd('Sync Non-existent Read Error');
      
      console.log(`❌ Sync error handling works correctly`);
    });
  });

  describe('Large File Test', () => {
    it('should handle moderately sized file sync operations', () => {
      const fileName = `large-sync-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      // Create a 10KB file (not too large to avoid timeouts)
      const largeContent = 'Large file test content\n'.repeat(400); // ~10KB
      
      console.time('Large File Sync Write');
      syncFS.writeFileSync(fileName, largeContent);
      console.timeEnd('Large File Sync Write');
      
      console.time('Large File Sync Read');
      const readContent = syncFS.readFileSync(fileName);
      console.timeEnd('Large File Sync Read');
      
      expect(readContent.length).toBe(largeContent.length);
      console.log(`📦 Large file sync test: ${readContent.length} bytes processed`);
    });
  });

  describe('Bucket Information', () => {
    it('should return sync bucket info immediately', () => {
      console.time('Sync Bucket Info');
      const info = syncFS.getBucketInfo();
      console.timeEnd('Sync Bucket Info');
      
      expect(info.bucket).toBe(testConfig.bucketName);
      expect(info.projectId).toBe(testConfig.projectId);
      expect(info.prefix).toBe('synet-fs-sync-test');
      
      console.log(`ℹ️  Sync bucket info: ${JSON.stringify(info, null, 2)}`);
    });
  });
});
