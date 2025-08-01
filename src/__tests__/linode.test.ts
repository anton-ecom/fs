import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FS } from '../fs.js';
import type { LinodeObjectStorageFileSystemOptions } from '../promises/linode.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test credentials
const testConfigPath = path.join(__dirname, '../../private/linode-test-access.json');
const testAccess = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

describe('Linode Object Storage FileSystem', () => {
  let fs: ReturnType<typeof FS.async.linode>;
  const testDir = 'test-synet-fs';
  const testFile = `${testDir}/test-file.txt`;
  const testContent = 'Hello from SYNET FS on Linode Object Storage!';

  const linodeConfig: LinodeObjectStorageFileSystemOptions = {
    region: testAccess.region,
    bucket: testAccess.bucket,
    accessKey: testAccess.accessKey,
    secretKey: testAccess.secretKey,
    prefix: 'fs-test', // Use prefix to avoid conflicts
  };

  beforeAll(async () => {
    fs = FS.async.linode(linodeConfig);
    
    // Clean up any existing test files
    try {
      await fs.deleteDir(testDir);
    } catch {
      // Directory might not exist, that's OK
    }
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.deleteDir(testDir);
    } catch {
      // Cleanup failed, but that's OK for tests
    }
  }, 15000); // Increase timeout for cleanup

  it('should create filesystem instance', () => {
    expect(fs).toBeDefined();
    expect(typeof fs.readFile).toBe('function');
    expect(typeof fs.writeFile).toBe('function');
  });

  it('should write and read files', async () => {
    await fs.writeFile(testFile, testContent);
    const content = await fs.readFile(testFile);
    expect(content).toBe(testContent);
  });

  it('should check file existence', async () => {
    await fs.writeFile(testFile, testContent);
    
    const exists = await fs.exists(testFile);
    expect(exists).toBe(true);
    
    const notExists = await fs.exists(`${testDir}/non-existent.txt`);
    expect(notExists).toBe(false);
  });

  it('should get file stats', async () => {
    await fs.writeFile(testFile, testContent);
    
    const stats = await fs.stat(testFile);
    expect(stats.size).toBe(testContent.length);
    expect(stats.isFile()).toBe(true);
    expect(stats.isDirectory()).toBe(false);
    expect(stats.mtime).toBeInstanceOf(Date);
  });

  it('should list directory contents', async () => {
    await fs.writeFile(`${testDir}/file1.txt`, 'content1');
    await fs.writeFile(`${testDir}/file2.txt`, 'content2');
    await fs.writeFile(`${testDir}/subfolder/file3.txt`, 'content3');
    
    const contents = await fs.readDir(testDir);
    expect(contents).toContain('file1.txt');
    expect(contents).toContain('file2.txt');
    expect(contents).toContain('subfolder');
  });

  it('should delete files', async () => {
    await fs.writeFile(testFile, testContent);
    expect(await fs.exists(testFile)).toBe(true);
    
    await fs.deleteFile(testFile);
    expect(await fs.exists(testFile)).toBe(false);
  });

  it('should handle different content types', async () => {
    const jsonContent = JSON.stringify({ test: 'data', number: 42 });
    const jsonFile = `${testDir}/test.json`;
    
    await fs.writeFile(jsonFile, jsonContent);
    const retrieved = await fs.readFile(jsonFile);
    
    expect(retrieved).toBe(jsonContent);
    expect(JSON.parse(retrieved)).toEqual({ test: 'data', number: 42 });
  });

  it('should handle nested directories', async () => {
    const nestedFile = `${testDir}/deep/nested/structure/file.txt`;
    const nestedContent = 'Nested file content';
    
    await fs.writeFile(nestedFile, nestedContent);
    const content = await fs.readFile(nestedFile);
    expect(content).toBe(nestedContent);
    
    // Check that parent directories are listed correctly
    const deepContents = await fs.readDir(`${testDir}/deep/nested`);
    expect(deepContents).toContain('structure');
  });

  it('should handle errors gracefully', async () => {
    // Try to read non-existent file
    await expect(fs.readFile('non-existent-file.txt')).rejects.toThrow();
    
    // Try to get stats for non-existent file
    await expect(fs.stat('non-existent-file.txt')).rejects.toThrow();
  });

  it('should maintain cache correctly', async () => {
    await fs.writeFile(testFile, testContent);
    
    // First read should cache the file
    const content1 = await fs.readFile(testFile);
    expect(content1).toBe(testContent);
    
    // Second read should use cache
    const content2 = await fs.readFile(testFile);
    expect(content2).toBe(testContent);
    
    // Verify cache stats (if available)
    if ('getCacheStats' in fs) {
      const cacheStats = (fs as { getCacheStats(): { size: number; keys: string[] } }).getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    }
  });

  it('should handle concurrent operations', async () => {
    const writePromises: Promise<void>[] = [];
    
    // Write multiple files concurrently
    for (let i = 0; i < 5; i++) {
      writePromises.push(
        fs.writeFile(`${testDir}/concurrent-${i}.txt`, `Content ${i}`)
      );
    }
    
    await Promise.all(writePromises);
    
    // Read them back
    const readPromises: Promise<string>[] = [];
    for (let i = 0; i < 5; i++) {
      readPromises.push(fs.readFile(`${testDir}/concurrent-${i}.txt`));
    }
    
    const contents = await Promise.all(readPromises);
    
    for (let i = 0; i < 5; i++) {
      expect(contents[i]).toBe(`Content ${i}`);
    }
  });
});
