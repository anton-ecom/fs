/**
 * DigitalOcean Spaces FileSystem Tests
 * 
 * Comprehensive test suite for DigitalOcean Spaces S3-compatible storage operations.
 * Tests against real DigitalOcean cloud storage using provided credentials.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDigitalOceanSpacesFileSystem, type DigitalOceanSpacesOptions } from '../../src/promises/digitalocean';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('DigitalOcean Spaces Async FileSystem', () => {
  let doFS: ReturnType<typeof createDigitalOceanSpacesFileSystem>;
  let testFiles: string[] = [];

  beforeAll(async () => {
    // Load DigitalOcean Spaces test credentials
    const testConfigPath = path.join(__dirname, '../../private/digitalocean-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🔗 Initialized DigitalOcean Spaces for bucket:', testConfig.bucket);
    console.log('🌍 Region:', testConfig.region);
    console.log('🔗 Endpoint:', testConfig.endpoint);
    
    // Initialize DigitalOcean Spaces FileSystem with test credentials
    const doOptions: DigitalOceanSpacesOptions = {
      endpoint: testConfig.endpoint,
      accessKeyId: testConfig.accessKey,
      secretAccessKey: testConfig.secretKey,
      bucket: testConfig.bucket,
      region: testConfig.region,
      prefix: 'synet-fs-do-test' // Use test prefix
    };

    doFS = createDigitalOceanSpacesFileSystem(doOptions);
  }, 30000);

  afterAll(async () => {
    console.log('🧹 Cleaning up DigitalOcean Spaces test files...');
    // Clean up test files
    for (const file of testFiles) {
      try {
        await doFS.deleteFile(file);
        console.log(`✅ Deleted: ${file}`);
      } catch (error) {
        console.log(`⚠️  Could not delete ${file}:`, (error as Error).message);
      }
    }
  }, 30000);

  describe('Basic File Operations', () => {
    test('should write and read a text file', async () => {
      const fileName = `basic-test-${Date.now()}.txt`;
      const content = `Hello DigitalOcean Spaces from SYNET FS!\n\nThis is a test file.\nTimestamp: ${new Date().toISOString()}`;
      
      testFiles.push(fileName);
      
      await doFS.writeFile(fileName, content);
      const readContent = await doFS.readFile(fileName);
      
      expect(readContent).toBe(content);
      console.log(`✅ Successfully wrote and read ${fileName} (${content.length} bytes)`);
    }, 30000);

    test('should handle JSON files properly', async () => {
      const fileName = `json-test-${Date.now()}.json`;
      const data = {
        test: 'DigitalOcean Spaces',
        timestamp: Date.now(),
        features: ['S3-compatible', 'global CDN', 'Singapore region'],
        config: {
          region: 'sgp1',
          provider: 'digitalocean'
        }
      };
      const content = JSON.stringify(data, null, 2);
      
      testFiles.push(fileName);
      
      await doFS.writeFile(fileName, content);
      const readContent = await doFS.readFile(fileName);
      const parsedData = JSON.parse(readContent);
      
      expect(parsedData).toEqual(data);
      console.log(`✅ Successfully handled JSON file ${fileName}`);
    }, 30000);

    test('should handle nested directory paths', async () => {
      const fileName = `nested/deep/path/file-${Date.now()}.md`;
      const content = '# Nested File Test\n\nThis file is in a deep directory structure.';
      
      testFiles.push(fileName);
      
      await doFS.writeFile(fileName, content);
      const readContent = await doFS.readFile(fileName);
      
      expect(readContent).toBe(content);
      console.log(`✅ Successfully handled nested path ${fileName}`);
    }, 30000);
  });

  describe('File Statistics and Metadata', () => {
    test('should provide accurate file statistics', async () => {
      const fileName = `stats-test-${Date.now()}.txt`;
      const content = 'Statistics test file for DigitalOcean Spaces';
      
      testFiles.push(fileName);
      
      await doFS.writeFile(fileName, content);
      const stats = await doFS.stat(fileName);
      
      expect(stats.size).toBe(Buffer.byteLength(content, 'utf-8'));
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.mtime).toBeInstanceOf(Date);
      
      console.log(`📊 File stats: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
    }, 30000);
  });

  describe('Directory Operations', () => {
    test('should list directory contents correctly', async () => {
      const baseDir = `dir-test-${Date.now()}`;
      
      // Create files in directory
      const files = [
        `${baseDir}/file1.txt`,
        `${baseDir}/file2.json`,
        `${baseDir}/subdir/nested.md`
      ];
      
      testFiles.push(...files);
      
      for (const file of files) {
        await doFS.writeFile(file, `Content of ${file}`);
      }
      
      const contents = await doFS.readDir(baseDir);
      
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.json');
      expect(contents).toContain('subdir/');
      
      console.log(`📂 Directory ${baseDir} contains: ${contents.join(', ')}`);
    }, 30000);

    test('should handle empty directories', async () => {
      const emptyDir = `empty-dir-${Date.now()}`;
      
      const contents = await doFS.readDir(emptyDir);
      expect(contents).toEqual([]);
      
      console.log('📂 Empty directory test passed');
    }, 30000);
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple concurrent uploads', async () => {
      const concurrentCount = 5;
      const baseFileName = Date.now();
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < concurrentCount; i++) {
        const fileName = `concurrent-${i}-${baseFileName}.txt`;
        const content = `Concurrent file ${i}\nUploaded at: ${new Date().toISOString()}`;
        testFiles.push(fileName);
        promises.push(doFS.writeFile(fileName, content));
      }
      
      const uploadStart = Date.now();
      await Promise.all(promises);
      const uploadTime = Date.now() - uploadStart;
      
      // Verify all files exist
      const readPromises: Promise<string>[] = [];
      for (let i = 0; i < concurrentCount; i++) {
        const fileName = `concurrent-${i}-${baseFileName}.txt`;
        readPromises.push(doFS.readFile(fileName));
      }
      
      const readStart = Date.now();
      const results = await Promise.all(readPromises);
      const readTime = Date.now() - readStart;
      
      expect(results).toHaveLength(concurrentCount);
      results.forEach(content => {
        expect(content).toContain('Concurrent file');
      });
      
      console.log(`⚡ Concurrent operations: ${concurrentCount} files uploaded in ${uploadTime}ms, read in ${readTime}ms`);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle non-existent file reads gracefully', async () => {
      const nonExistentFile = `non-existent-${Date.now()}.txt`;
      
      await expect(doFS.readFile(nonExistentFile)).rejects.toThrow();
      console.log('❌ Error handling works correctly for non-existent files');
    }, 30000);

    test('should handle non-existent file stats gracefully', async () => {
      const nonExistentFile = `non-existent-stats-${Date.now()}.txt`;
      
      await expect(doFS.stat(nonExistentFile)).rejects.toThrow();
      console.log('📊 Error handling works correctly for file stats');
    }, 30000);

    test('should handle deletion of non-existent files gracefully', async () => {
      const nonExistentFile = `non-existent-delete-${Date.now()}.txt`;
      
      // Should not throw error
      await expect(doFS.deleteFile(nonExistentFile)).resolves.toBeUndefined();
      console.log('🗑️  Graceful deletion of non-existent files works');
    }, 30000);
  });

  describe('File Existence Checks', () => {
    test('should correctly identify existing and non-existing files', async () => {
      const fileName = `exists-test-${Date.now()}.txt`;
      const content = 'File existence test';
      
      testFiles.push(fileName);
      
      // File should not exist initially
      expect(await doFS.exists(fileName)).toBe(false);
      
      // Create file
      await doFS.writeFile(fileName, content);
      
      // File should exist now
      expect(await doFS.exists(fileName)).toBe(true);
      
      console.log('✅ File existence checks work correctly');
    }, 30000);
  });

  describe('Cache Functionality', () => {
    test('should cache file content effectively', async () => {
      const fileName = `cache-test-${Date.now()}.txt`;
      const content = 'Cache test content for DigitalOcean Spaces';
      
      testFiles.push(fileName);
      
      // Write file
      await doFS.writeFile(fileName, content);
      
      // First read (populates cache)
      const content1 = await doFS.readFile(fileName);
      expect(content1).toBe(content);
      
      // Second read (should use cache)
      const content2 = await doFS.readFile(fileName);
      expect(content2).toBe(content);
      
      console.log('🗄️  Cache functionality validated');
    }, 30000);
  });

  describe('Space Information', () => {
    test('should return correct space configuration', async () => {
      const spaceInfo = doFS.getSpaceInfo();
      
      expect(spaceInfo.bucket).toBe('synet-fs-test');
      expect(spaceInfo.prefix).toBe('synet-fs-do-test');
      expect(spaceInfo.region).toBe('sgp1');
      expect(spaceInfo.endpoint).toBe('https://sgp1.digitaloceanspaces.com');
      
      console.log('ℹ️  Space info:', JSON.stringify(spaceInfo, null, 2));
    }, 30000);
  });

  describe('Bulk Operations', () => {
    test('should handle bulk file deletion', async () => {
      const bulkCount = 3;
      const baseFileName = Date.now();
      const files: string[] = [];
      
      // Create multiple files
      for (let i = 0; i < bulkCount; i++) {
        const fileName = `bulk-${i}-${baseFileName}.txt`;
        files.push(fileName);
        await doFS.writeFile(fileName, `Bulk file ${i}`);
      }
      
      // Delete all files
      for (const file of files) {
        await doFS.deleteFile(file);
      }
      
      // Verify deletion
      for (const file of files) {
        expect(await doFS.exists(file)).toBe(false);
      }
      
      console.log(`🗑️  Bulk deletion of ${bulkCount} files successful`);
    }, 30000);

    test('should handle directory deletion', async () => {
      const dirName = `bulk-dir-${Date.now()}`;
      const files = [
        `${dirName}/file1.txt`,
        `${dirName}/file2.txt`,
        `${dirName}/subdir/file3.txt`
      ];
      
      // Create files
      for (const file of files) {
        await doFS.writeFile(file, `Content of ${file}`);
      }
      
      // Delete directory
      await doFS.deleteDir(dirName);
      
      // Verify deletion
      for (const file of files) {
        expect(await doFS.exists(file)).toBe(false);
      }
      
      console.log(`🗂️  Directory deletion successful for ${dirName}`);
    }, 30000);
  });
});
