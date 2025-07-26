/**
 * Google Cloud Storage Async FileSystem Unit Tests
 * 
 * Tests the async GCS implementation with real cloud storage validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GCSFileSystem, createGCSFileSystem, type GCSFileSystemOptions } from '../promises/gcs';
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
  prefix: 'synet-fs-async-test' // Use a test prefix to avoid conflicts
};

describe('GCS Async FileSystem', () => {
  let gcsFS: GCSFileSystem;
  
  const testFiles: string[] = [];
  
  beforeAll(() => {
    gcsFS = createGCSFileSystem(gcsOptions);
    console.log(`🔧 Initialized GCS FileSystem for bucket: ${testConfig.bucketName}`);
  });

  afterAll(async () => {
    // Cleanup: Delete all test files
    console.log('🧹 Cleaning up test files...');
    
    for (const testFile of testFiles) {
      try {
        await gcsFS.deleteFile(testFile);
        console.log(`✅ Deleted: ${testFile}`);
      } catch (error) {
        console.log(`⚠️  Could not delete ${testFile}: ${error}`);
      }
    }

    // Clear cache
    gcsFS.clearCache();
  });

  describe('Basic File Operations', () => {
    it('should write and read a text file', async () => {
      const fileName = `basic-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = `Hello from SYNET FS GCS Async!\nTimestamp: ${new Date().toISOString()}\nTest ID: ${Math.random()}`;

      // Write file
      await gcsFS.writeFile(fileName, content);

      // Verify file exists
      const exists = await gcsFS.exists(fileName);
      expect(exists).toBe(true);

      // Read file back
      const readContent = await gcsFS.readFile(fileName);
      expect(readContent).toBe(content);

      console.log(`✅ Successfully wrote and read ${fileName} (${content.length} bytes)`);
    });

    it('should handle JSON files properly', async () => {
      const fileName = `json-test-${Date.now()}.json`;
      testFiles.push(fileName);
      
      const data = {
        timestamp: new Date().toISOString(),
        test: 'SYNET FS GCS Async Integration',
        version: '1.0.0',
        metadata: {
          backend: 'Google Cloud Storage',
          async: true,
          unitArchitecture: true
        },
        numbers: [1, 2, 3, 4, 5],
        nested: {
          deep: {
            value: 'deep nested value'
          }
        }
      };
      const content = JSON.stringify(data, null, 2);

      // Write JSON file
      await gcsFS.writeFile(fileName, content);

      // Verify file exists
      expect(await gcsFS.exists(fileName)).toBe(true);

      // Read and parse JSON
      const readContent = await gcsFS.readFile(fileName);
      const parsedData = JSON.parse(readContent);
      
      expect(parsedData.test).toBe(data.test);
      expect(parsedData.metadata.backend).toBe('Google Cloud Storage');
      expect(parsedData.nested.deep.value).toBe(data.nested.deep.value);

      console.log(`✅ Successfully handled JSON file ${fileName}`);
    });

    it('should handle nested directory paths', async () => {
      const fileName = `nested/deep/path/file-${Date.now()}.md`;
      testFiles.push(fileName);
      
      const content = `# Nested Path Test\n\nThis tests nested directory handling.\n\n- Timestamp: ${new Date().toISOString()}\n- Path: ${fileName}`;

      // Write file in nested path
      await gcsFS.writeFile(fileName, content);

      // Verify file exists
      expect(await gcsFS.exists(fileName)).toBe(true);

      // Read file back
      const readContent = await gcsFS.readFile(fileName);
      expect(readContent).toBe(content);

      console.log(`✅ Successfully handled nested path ${fileName}`);
    });
  });

  describe('File Statistics and Metadata', () => {
    it('should provide accurate file statistics', async () => {
      const fileName = `stats-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = 'This is a test file for statistics validation.';
      
      await gcsFS.writeFile(fileName, content);
      
      const stats = await gcsFS.stat(fileName);
      
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.isSymbolicLink()).toBe(false);
      expect(stats.size).toBe(content.length);
      expect(stats.mtime).toBeInstanceOf(Date);
      expect(stats.ctime).toBeInstanceOf(Date);
      expect(stats.atime).toBeInstanceOf(Date);
      expect(stats.mode).toBe(0o644);

      console.log(`📊 File stats: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
    });
  });

  describe('Directory Operations', () => {
    it('should list directory contents correctly', async () => {
      const baseDir = 'dir-test';
      const files = [
        `${baseDir}/file1.txt`,
        `${baseDir}/file2.json`,
        `${baseDir}/subdir/nested.md`
      ];
      
      testFiles.push(...files);

      // Create test files
      await Promise.all([
        gcsFS.writeFile(files[0], 'Content 1'),
        gcsFS.writeFile(files[1], '{"test": true}'),
        gcsFS.writeFile(files[2], '# Nested file')
      ]);

      // List directory contents
      const contents = await gcsFS.readDir(baseDir);
      
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.json');
      expect(contents).toContain('subdir/');

      console.log(`📂 Directory ${baseDir} contains: ${contents.join(', ')}`);
    });

    it('should handle empty directories', async () => {
      const emptyDir = 'empty-dir-test';
      
      const contents = await gcsFS.readDir(emptyDir);
      expect(contents).toEqual([]);

      console.log(`📂 Empty directory test passed`);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent uploads', async () => {
      const concurrentFiles = Array.from({ length: 5 }, (_, i) => ({
        name: `concurrent-${i}-${Date.now()}.txt`,
        content: `Concurrent file ${i} content - ${new Date().toISOString()}`
      }));

      testFiles.push(...concurrentFiles.map(f => f.name));

      // Upload all files concurrently
      const uploadStart = Date.now();
      await Promise.all(
        concurrentFiles.map(file => gcsFS.writeFile(file.name, file.content))
      );
      const uploadTime = Date.now() - uploadStart;

      // Verify all files exist and read them back concurrently
      const readStart = Date.now();
      const results = await Promise.all(
        concurrentFiles.map(async file => ({
          name: file.name,
          exists: await gcsFS.exists(file.name),
          content: await gcsFS.readFile(file.name),
          originalContent: file.content
        }))
      );
      const readTime = Date.now() - readStart;

      // Verify all operations succeeded
      for (const result of results) {
        expect(result.exists).toBe(true);
        expect(result.content).toBe(result.originalContent);
      }

      console.log(`⚡ Concurrent operations: ${concurrentFiles.length} files uploaded in ${uploadTime}ms, read in ${readTime}ms`);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file reads gracefully', async () => {
      const nonExistentFile = `non-existent-${Date.now()}.txt`;
      
      await expect(gcsFS.readFile(nonExistentFile)).rejects.toThrow();
      expect(await gcsFS.exists(nonExistentFile)).toBe(false);
    });

    it('should handle non-existent file stats gracefully', async () => {
      const nonExistentFile = `non-existent-stats-${Date.now()}.txt`;
      
      await expect(gcsFS.stat(nonExistentFile)).rejects.toThrow();
    });

    it('should handle deletion of non-existent files gracefully', async () => {
      const nonExistentFile = `non-existent-delete-${Date.now()}.txt`;
      
      // Should not throw for non-existent files
      await expect(gcsFS.deleteFile(nonExistentFile)).resolves.not.toThrow();
    });
  });

  describe('Cache Functionality', () => {
    it('should cache file content effectively', async () => {
      const fileName = `cache-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = 'Cache test content';
      await gcsFS.writeFile(fileName, content);

      // First read (from GCS)
      const firstRead = await gcsFS.readFile(fileName);
      
      // Second read (should be from cache)
      const secondRead = await gcsFS.readFile(fileName);
      
      expect(firstRead).toBe(secondRead);
      expect(firstRead).toBe(content);
      
      // Clear cache and read again
      gcsFS.clearCache();
      const thirdRead = await gcsFS.readFile(fileName);
      
      expect(thirdRead).toBe(content);

      console.log(`🗄️  Cache functionality validated`);
    });
  });

  describe('Bucket Information', () => {
    it('should return correct bucket configuration', () => {
      const info = gcsFS.getBucketInfo();
      
      expect(info.bucket).toBe(testConfig.bucketName);
      expect(info.projectId).toBe(testConfig.projectId);
      expect(info.prefix).toBe('synet-fs-async-test');

      console.log(`ℹ️  Bucket info: ${JSON.stringify(info, null, 2)}`);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk file deletion', async () => {
      const bulkFiles = Array.from({ length: 3 }, (_, i) => `bulk-delete-${i}-${Date.now()}.txt`);
      
      // Create files
      await Promise.all(
        bulkFiles.map(name => gcsFS.writeFile(name, `Content for ${name}`))
      );

      // Verify they exist
      for (const name of bulkFiles) {
        expect(await gcsFS.exists(name)).toBe(true);
      }

      // Delete them
      await Promise.all(
        bulkFiles.map(name => gcsFS.deleteFile(name))
      );

      // Verify they're gone
      for (const name of bulkFiles) {
        expect(await gcsFS.exists(name)).toBe(false);
      }

      console.log(`🗑️  Bulk deletion of ${bulkFiles.length} files successful`);
    });

    it('should handle directory deletion', async () => {
      const dirName = `bulk-dir-${Date.now()}`;
      const dirFiles = [
        `${dirName}/file1.txt`,
        `${dirName}/file2.txt`,
        `${dirName}/subdir/file3.txt`
      ];

      // Create files
      await Promise.all(
        dirFiles.map(name => gcsFS.writeFile(name, `Content for ${name}`))
      );

      // Verify they exist
      for (const name of dirFiles) {
        expect(await gcsFS.exists(name)).toBe(true);
      }

      // Delete directory
      await gcsFS.deleteDir(dirName);

      // Verify they're gone
      for (const name of dirFiles) {
        expect(await gcsFS.exists(name)).toBe(false);
      }

      console.log(`🗂️  Directory deletion successful for ${dirName}`);
    });
  });
});
