import { describe, it, expect, beforeEach } from 'vitest';
import { WithIdFileSystem, FileFormat, type FileMetadata } from '../promises/with-id';
import { MemFileSystem } from '../promises/memory';

describe('WithIdFileSystem (Async)', () => {
  let memFs: MemFileSystem;
  let withIdFs: WithIdFileSystem;

  beforeEach(() => {
    memFs = new MemFileSystem();
    withIdFs = new WithIdFileSystem(memFs);
  });

  describe('ID and alias generation', () => {
    it('should generate deterministic IDs for file paths', () => {
      const id1 = withIdFs.getId('./vault/profiles/user1.json');
      const id2 = withIdFs.getId('./vault/profiles/user1.json');
      const id3 = withIdFs.getId('./vault/profiles/user2.json');
      
      expect(id1).toBe(id2); // Same path = same ID
      expect(id1).not.toBe(id3); // Different path = different ID
      expect(id1).toMatch(/^[a-f0-9]{16}$/); // 16 character hex string
    });

    it('should generate readable aliases from file paths', () => {
      const alias1 = withIdFs.getAlias('./vault/profiles/user1.json');
      const alias2 = withIdFs.getAlias('vault/profiles/user1.json');
      const alias3 = withIdFs.getAlias('/vault/profiles/user2.json');
      
      expect(alias1).toBe('vault-profiles-user1');
      expect(alias2).toBe('vault-profiles-user1');
      expect(alias3).toBe('vault-profiles-user2');
    });

    it('should detect file formats correctly', () => {
      const jsonMeta = withIdFs.getMetadata('./config.json');
      const txtMeta = withIdFs.getMetadata('./readme.txt');
      const mdMeta = withIdFs.getMetadata('./docs.md');
      const pdfMeta = withIdFs.getMetadata('./report.pdf');
      const csvMeta = withIdFs.getMetadata('./data.csv');
      const unknownMeta = withIdFs.getMetadata('./unknown.xyz');
      
      expect(jsonMeta.format).toBe(FileFormat.JSON);
      expect(txtMeta.format).toBe(FileFormat.TXT);
      expect(mdMeta.format).toBe(FileFormat.MD);
      expect(pdfMeta.format).toBe(FileFormat.PDF);
      expect(csvMeta.format).toBe(FileFormat.CSV);
      expect(unknownMeta.format).toBe(FileFormat.TXT); // Default fallback
    });

    it('should generate stored paths with correct format', () => {
      const metadata = withIdFs.getMetadata('./vault/profiles/user1.json');
      
      expect(metadata.storedPath).toMatch(/^\.\/vault\/profiles\/user1:vault-profiles-user1-[a-f0-9]{16}\.json$/);
      expect(metadata.originalPath).toBe('./vault/profiles/user1.json');
      expect(metadata.alias).toBe('vault-profiles-user1');
      expect(metadata.id).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('file operations', () => {
    it('should write and read files using original paths', async () => {
      const content = '{"name": "John", "age": 30}';
      const filePath = './vault/profiles/user1.json';
      
      await withIdFs.writeFile(filePath, content);
      const readContent = await withIdFs.readFile(filePath);
      
      expect(readContent).toBe(content);
      expect(await withIdFs.exists(filePath)).toBe(true);
    });

    it('should store files with ID-based names in underlying filesystem', async () => {
      const content = 'Hello World';
      const filePath = './test.txt';
      
      await withIdFs.writeFile(filePath, content);
      
      const metadata = withIdFs.getMetadata(filePath);
      
      // Check that file exists in underlying filesystem with stored path
      expect(await memFs.exists(metadata.storedPath)).toBe(true);
      expect(await memFs.readFile(metadata.storedPath)).toBe(content);
      
      // Original path should not exist in underlying filesystem
      expect(await memFs.exists(filePath)).toBe(false);
    });

    it('should delete files and clean up metadata', async () => {
      const filePath = './test.txt';
      await withIdFs.writeFile(filePath, 'content');
      
      const metadata = withIdFs.getMetadata(filePath);
      const { id, alias } = metadata;
      
      expect(await withIdFs.exists(filePath)).toBe(true);
      expect(withIdFs.listTrackedFiles()).toHaveLength(1);
      
      await withIdFs.deleteFile(filePath);
      
      expect(await withIdFs.exists(filePath)).toBe(false);
      expect(withIdFs.listTrackedFiles()).toHaveLength(0);
      
      // Metadata should be cleaned up
      await expect(withIdFs.getByIdOrAlias(id)).rejects.toThrow('File not found');
      await expect(withIdFs.getByIdOrAlias(alias)).rejects.toThrow('File not found');
    });
  });

  describe('ID and alias access', () => {
    it('should read files by ID', async () => {
      const content = '{"user": "data"}';
      const filePath = './vault/profiles/user1.json';
      
      await withIdFs.writeFile(filePath, content);
      const id = withIdFs.getId(filePath);
      
      const readContent = await withIdFs.getByIdOrAlias(id);
      expect(readContent).toBe(content);
    });

    it('should read files by alias', async () => {
      const content = 'Configuration data';
      const filePath = './config/app.txt';
      
      await withIdFs.writeFile(filePath, content);
      const alias = withIdFs.getAlias(filePath);
      
      const readContent = await withIdFs.getByIdOrAlias(alias);
      expect(readContent).toBe(content);
    });

    it('should validate file format when specified', async () => {
      const jsonContent = '{"valid": "json"}';
      const filePath = './data.json';
      
      await withIdFs.writeFile(filePath, jsonContent);
      const id = withIdFs.getId(filePath);
      
      // Should work with correct format
      await expect(withIdFs.getByIdOrAlias(id, FileFormat.JSON)).resolves.toBe(jsonContent);
      
      // Should throw with wrong format
      await expect(withIdFs.getByIdOrAlias(id, FileFormat.PDF)).rejects.toThrow('File format mismatch');
    });

    it('should throw error for non-existent ID or alias', async () => {
      await expect(withIdFs.getByIdOrAlias('nonexistent')).rejects.toThrow('File not found');
      await expect(withIdFs.getByIdOrAlias('fake-id-12345')).rejects.toThrow('File not found');
    });
  });

  describe('metadata management', () => {
    it('should track multiple files', async () => {
      await withIdFs.writeFile('./file1.txt', 'content1');
      await withIdFs.writeFile('./dir/file2.json', '{"data": 2}');
      await withIdFs.writeFile('./file3.md', '# Header');
      
      const trackedFiles = withIdFs.listTrackedFiles();
      expect(trackedFiles).toHaveLength(3);
      
      const paths = trackedFiles.map(f => f.originalPath);
      expect(paths).toContain('./file1.txt');
      expect(paths).toContain('./dir/file2.json');
      expect(paths).toContain('./file3.md');
    });

    it('should provide complete metadata', async () => {
      const filePath = './vault/profiles/user1.json';
      await withIdFs.writeFile(filePath, '{}');
      
      const metadata = withIdFs.getMetadata(filePath);
      
      expect(metadata).toMatchObject({
        originalPath: './vault/profiles/user1.json',
        alias: 'vault-profiles-user1',
        format: FileFormat.JSON
      });
      expect(metadata.id).toMatch(/^[a-f0-9]{16}$/);
      expect(metadata.storedPath).toMatch(/user1:vault-profiles-user1-[a-f0-9]{16}\.json$/);
    });

    it('should return consistent metadata for same path', () => {
      const filePath = './test.txt';
      
      const meta1 = withIdFs.getMetadata(filePath);
      const meta2 = withIdFs.getMetadata(filePath);
      
      expect(meta1).toEqual(meta2);
      expect(meta1.id).toBe(meta2.id);
      expect(meta1.alias).toBe(meta2.alias);
    });
  });

  describe('directory operations', () => {
    it('should handle directory deletion with metadata cleanup', async () => {
      await withIdFs.writeFile('./dir/file1.txt', 'content1');
      await withIdFs.writeFile('./dir/subdir/file2.txt', 'content2');
      await withIdFs.writeFile('./other/file3.txt', 'content3');
      
      expect(withIdFs.listTrackedFiles()).toHaveLength(3);
      
      await withIdFs.deleteDir('./dir');
      
      const remaining = withIdFs.listTrackedFiles();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].originalPath).toBe('./other/file3.txt');
    });

    it('should delegate directory operations to base filesystem', async () => {
      await withIdFs.ensureDir('./testdir');
      expect(await memFs.exists('./testdir')).toBe(true);
      
      await withIdFs.writeFile('./testdir/file.txt', 'content');
      const dirs = await withIdFs.readDir('./testdir');
      
      // Should contain the stored file name
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toMatch(/^file:testdir-file-[a-f0-9]{16}\.txt$/);
    });
  });

  describe('filesystem interface compliance', () => {
    it('should implement all IAsyncFileSystem methods', async () => {
      const filePath = './test.txt';
      const content = 'test content';
      
      // Write and read
      await withIdFs.writeFile(filePath, content);
      expect(await withIdFs.readFile(filePath)).toBe(content);
      
      // Exists
      expect(await withIdFs.exists(filePath)).toBe(true);
      expect(await withIdFs.exists('./nonexistent.txt')).toBe(false);
      
      // Directory operations
      await withIdFs.ensureDir('./newdir');
      expect(await memFs.exists('./newdir')).toBe(true);
      
      // Chmod (should delegate to stored path)
      await expect(withIdFs.chmod(filePath, 0o755)).resolves.not.toThrow();
      
      // Delete
      await withIdFs.deleteFile(filePath);
      expect(await withIdFs.exists(filePath)).toBe(false);
    });

    it('should handle clear operation if available', async () => {
      await withIdFs.writeFile('./dir/file1.txt', 'content1');
      await withIdFs.writeFile('./dir/file2.txt', 'content2');
      
      expect(withIdFs.listTrackedFiles()).toHaveLength(2);
      
      if (withIdFs.clear) {
        await withIdFs.clear('./dir');
        
        // Should clean up metadata for cleared directory
        const remaining = withIdFs.listTrackedFiles().filter(f => 
          f.originalPath.startsWith('./dir')
        );
        expect(remaining).toHaveLength(0);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle paths with different separators consistently', () => {
      const path1 = './dir/file.txt';
      const path2 = '.\\dir\\file.txt';
      
      const id1 = withIdFs.getId(path1);
      const id2 = withIdFs.getId(path2);
      const alias1 = withIdFs.getAlias(path1);
      const alias2 = withIdFs.getAlias(path2);
      
      expect(id1).toBe(id2);
      expect(alias1).toBe(alias2);
    });

    it('should handle files with no extension', async () => {
      const filePath = './README';
      await withIdFs.writeFile(filePath, 'content');
      
      const metadata = withIdFs.getMetadata(filePath);
      expect(metadata.format).toBe(FileFormat.TXT);
      expect(metadata.storedPath).toMatch(/README:README-[a-f0-9]{16}$/);
    });

    it('should handle complex file extensions', () => {
      const configPath = './app.config';
      const markdownPath = './doc.markdown';
      
      expect(withIdFs.getMetadata(configPath).format).toBe(FileFormat.CONFIG);
      expect(withIdFs.getMetadata(markdownPath).format).toBe(FileFormat.MD);
    });
  });
});
