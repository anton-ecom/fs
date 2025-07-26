/**
 * Azure Blob Storage Async FileSystem Test
 * 
 * This test validates Azure Blob Storage integration with real cloud credentials.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AzureBlobStorageFileSystem, createAzureBlobStorageFileSystem, type AzureBlobStorageOptions } from '../promises/azure';
import * as fs from 'fs';
import * as path from 'path';

// Load test credentials
const testConfigPath = path.join(__dirname, '../../private/azyre-test-access.json');
const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

const azureOptions: AzureBlobStorageOptions = {
  connectionString: testConfig.connectionString,
  containerName: testConfig.containerName,
  prefix: 'synet-fs-azure-test' // Use a test prefix to avoid conflicts
};

describe('Azure Blob Storage Async FileSystem', () => {
  let azureFS: AzureBlobStorageFileSystem;
  
  const testFiles: string[] = [];
  
  beforeAll(() => {
    azureFS = createAzureBlobStorageFileSystem(azureOptions);
    console.log(`🔗 Initialized Azure Blob Storage for container: ${testConfig.containerName}`);
  }, 30000); // 30 second timeout for initialization

  afterAll(async () => {
    // Cleanup: Delete all test files
    console.log('🧹 Cleaning up Azure test files...');
    
    for (const testFile of testFiles) {
      try {
        await azureFS.deleteFile(testFile);
        console.log(`✅ Deleted: ${testFile}`);
      } catch (error) {
        console.log(`⚠️  Could not delete ${testFile}: ${error}`);
      }
    }

    // Clear cache
    azureFS.clearCache();
  }, 60000); // 60 second timeout for cleanup

  describe('Basic File Operations', () => {
    it('should write and read a text file', async () => {
      const fileName = `basic-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = `Azure Blob Storage test\nTimestamp: ${new Date().toISOString()}\nSize test: ${'x'.repeat(100)}`;

      await azureFS.writeFile(fileName, content);
      
      expect(await azureFS.exists(fileName)).toBe(true);
      
      const readContent = await azureFS.readFile(fileName);
      expect(readContent).toBe(content);

      console.log(`✅ Successfully wrote and read ${fileName} (${content.length} bytes)`);
    }, 30000);

    it('should handle JSON files properly', async () => {
      const fileName = `json-test-${Date.now()}.json`;
      testFiles.push(fileName);
      
      const data = { 
        message: 'Hello Azure Blob Storage', 
        timestamp: Date.now(), 
        nested: { value: 42, array: [1, 2, 3] } 
      };
      const content = JSON.stringify(data, null, 2);

      await azureFS.writeFile(fileName, content);
      const readContent = await azureFS.readFile(fileName);
      const parsedData = JSON.parse(readContent);
      
      expect(parsedData).toEqual(data);
      console.log(`✅ Successfully handled JSON file ${fileName}`);
    }, 30000);

    it('should handle nested directory paths', async () => {
      const fileName = `nested/deep/path/file-${Date.now()}.md`;
      testFiles.push(fileName);
      
      const content = '# Azure Nested File Test\n\nThis file is in a nested structure.';

      await azureFS.writeFile(fileName, content);
      expect(await azureFS.exists(fileName)).toBe(true);
      
      const readContent = await azureFS.readFile(fileName);
      expect(readContent).toBe(content);
      
      console.log(`✅ Successfully handled nested path ${fileName}`);
    }, 30000);
  });

  describe('File Statistics and Metadata', () => {
    it('should provide accurate file statistics', async () => {
      const fileName = `stats-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = 'Statistics test file for Azure Blob Storage';

      await azureFS.writeFile(fileName, content);
      const stats = await azureFS.stat(fileName);
      
      expect(stats.size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(stats.mtime).toBeInstanceOf(Date);
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      
      console.log(`📊 File stats: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
    }, 30000);
  });

  describe('Directory Operations', () => {
    it('should list directory contents correctly', async () => {
      const baseDir = `dir-test-${Date.now()}`;
      
      // Create test structure
      const file1 = `${baseDir}/file1.txt`;
      const file2 = `${baseDir}/file2.json`;
      const file3 = `${baseDir}/subdir/nested.md`;
      
      testFiles.push(file1, file2, file3);
      
      await azureFS.writeFile(file1, 'Content 1');
      await azureFS.writeFile(file2, '{"test": true}');
      await azureFS.writeFile(file3, '# Nested content');
      
      const contents = await azureFS.readDir(baseDir);
      
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.json');
      expect(contents).toContain('subdir/');
      
      console.log(`📂 Directory ${baseDir} contains: ${contents.join(', ')}`);
    }, 30000);

    it('should handle empty directories', async () => {
      const emptyDir = `empty-dir-${Date.now()}`;
      
      const contents = await azureFS.readDir(emptyDir);
      expect(contents).toEqual([]);
      
      console.log(`📂 Empty directory test passed`);
    }, 30000);
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent uploads', async () => {
      const startTime = Date.now();
      const promises: Promise<void>[] = [];
      const baseTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        const fileName = `concurrent-${i}-${baseTime}.txt`;
        testFiles.push(fileName);
        const content = `Concurrent test file ${i} - ${Date.now()}`;
        promises.push(azureFS.writeFile(fileName, content));
      }
      
      await Promise.all(promises);
      const uploadDuration = Date.now() - startTime;
      
      // Verify all files exist and read one to test
      const readStart = Date.now();
      const readContent = await azureFS.readFile(`concurrent-0-${baseTime}.txt`);
      const readDuration = Date.now() - readStart;
      
      expect(readContent).toContain('Concurrent test file 0');
      
      console.log(`⚡ Concurrent operations: 5 files uploaded in ${uploadDuration}ms, read in ${readDuration}ms`);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent file reads gracefully', async () => {
      const nonExistentFile = `non-existent-${Date.now()}.txt`;
      
      expect(await azureFS.exists(nonExistentFile)).toBe(false);
      
      await expect(azureFS.readFile(nonExistentFile)).rejects.toThrow();
      
      console.log(`❌ Error handling works correctly for non-existent files`);
    }, 30000);

    it('should handle non-existent file stats gracefully', async () => {
      const nonExistentFile = `non-existent-stats-${Date.now()}.txt`;
      
      await expect(azureFS.stat(nonExistentFile)).rejects.toThrow();
      
      console.log(`📊 Error handling works correctly for file stats`);
    }, 30000);

    it('should handle deletion of non-existent files gracefully', async () => {
      const nonExistentFile = `non-existent-delete-${Date.now()}.txt`;
      
      // Should not throw error
      await azureFS.deleteFile(nonExistentFile);
      
      console.log(`🗑️  Graceful deletion of non-existent files works`);
    }, 30000);
  });

  describe('Cache Functionality', () => {
    it('should cache file content effectively', async () => {
      const fileName = `cache-test-${Date.now()}.txt`;
      testFiles.push(fileName);
      
      const content = 'This file will be cached';

      await azureFS.writeFile(fileName, content);
      
      // First read (should cache)
      const readContent1 = await azureFS.readFile(fileName);
      
      // Second read (should use cache)
      const readContent2 = await azureFS.readFile(fileName);
      
      expect(readContent1).toBe(content);
      expect(readContent2).toBe(content);
      
      // Clear cache and read again
      azureFS.clearCache();
      const readContent3 = await azureFS.readFile(fileName);
      expect(readContent3).toBe(content);
      
      console.log(`🗄️  Cache functionality validated`);
    }, 30000);
  });

  describe('Container Information', () => {
    it('should return correct container configuration', async () => {
      const info = azureFS.getContainerInfo();
      
      expect(info.containerName).toBe(testConfig.containerName);
      expect(info.prefix).toBe('synet-fs-azure-test');
      expect(info.hasConnectionString).toBe(true);
      
      console.log(`ℹ️  Container info: ${JSON.stringify(info, null, 2)}`);
    }, 30000);
  });

  describe('Bulk Operations', () => {
    it('should handle bulk file deletion', async () => {
      const baseDir = `bulk-${Date.now()}`;
      
      // Create multiple files
      const files: string[] = [];
      for (let i = 0; i < 3; i++) {
        const fileName = `${baseDir}/file${i}.txt`;
        files.push(fileName);
        await azureFS.writeFile(fileName, `Content ${i}`);
      }
      
      // Verify files exist
      for (const file of files) {
        expect(await azureFS.exists(file)).toBe(true);
      }
      
      // Delete all files using directory deletion
      await azureFS.deleteDir(baseDir);
      
      // Verify files are gone
      for (const file of files) {
        expect(await azureFS.exists(file)).toBe(false);
      }
      
      console.log(`🗑️  Bulk deletion of ${files.length} files successful`);
    }, 30000);

    it('should handle directory deletion', async () => {
      const baseDir = `bulk-dir-${Date.now()}`;
      
      // Create nested structure
      await azureFS.writeFile(`${baseDir}/file1.txt`, 'File 1');
      await azureFS.writeFile(`${baseDir}/subdir/file2.txt`, 'File 2');
      await azureFS.writeFile(`${baseDir}/subdir/nested/file3.txt`, 'File 3');
      
      // Verify structure exists
      expect(await azureFS.exists(`${baseDir}/file1.txt`)).toBe(true);
      expect(await azureFS.exists(`${baseDir}/subdir/file2.txt`)).toBe(true);
      expect(await azureFS.exists(`${baseDir}/subdir/nested/file3.txt`)).toBe(true);
      
      // Delete entire directory
      await azureFS.deleteDir(baseDir);
      
      // Verify everything is gone
      expect(await azureFS.exists(`${baseDir}/file1.txt`)).toBe(false);
      expect(await azureFS.exists(`${baseDir}/subdir/file2.txt`)).toBe(false);
      expect(await azureFS.exists(`${baseDir}/subdir/nested/file3.txt`)).toBe(false);
      
      console.log(`🗂️  Directory deletion successful for ${baseDir}`);
    }, 30000);
  });
});
