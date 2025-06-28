import { describe, it, expect, beforeEach } from 'vitest';
import { WithIdFileSystem, FileFormat, type FileMetadata } from '../with-id';
import { MemFileSystem } from '../memory';

describe('WithIdFileSystem (Sync)', () => {
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
    it('should write and read files using original paths', () => {
      const content = '{"name": "John", "age": 30}';
      const filePath = './vault/profiles/user1.json';
      
      withIdFs.writeFileSync(filePath, content);
      const readContent = withIdFs.readFileSync(filePath);
      
      expect(readContent).toBe(content);
      expect(withIdFs.existsSync(filePath)).toBe(true);
    });

    it('should store files with ID-based names in underlying filesystem', () => {
      const content = 'Hello World';
      const filePath = './test.txt';
      
      withIdFs.writeFileSync(filePath, content);
      
      const metadata = withIdFs.getMetadata(filePath);
      
      // Check that file exists in underlying filesystem with stored path
      expect(memFs.existsSync(metadata.storedPath)).toBe(true);
      expect(memFs.readFileSync(metadata.storedPath)).toBe(content);
      
      // Original path should not exist in underlying filesystem
      expect(memFs.existsSync(filePath)).toBe(false);
    });

    it('should delete files and clean up metadata', () => {
      const filePath = './test.txt';
      withIdFs.writeFileSync(filePath, 'content');
      
      const metadata = withIdFs.getMetadata(filePath);
      const { id, alias } = metadata;
      
      expect(withIdFs.existsSync(filePath)).toBe(true);
      expect(withIdFs.listTrackedFiles()).toHaveLength(1);
      
      withIdFs.deleteFileSync(filePath);
      
      expect(withIdFs.existsSync(filePath)).toBe(false);
      expect(withIdFs.listTrackedFiles()).toHaveLength(0);
      
      // Metadata should be cleaned up
      expect(() => withIdFs.getByIdOrAlias(id)).toThrow('File not found');
      expect(() => withIdFs.getByIdOrAlias(alias)).toThrow('File not found');
    });
  });

  describe('ID and alias access', () => {
    it('should read files by ID', () => {
      const content = '{"user": "data"}';
      const filePath = './vault/profiles/user1.json';
      
      withIdFs.writeFileSync(filePath, content);
      const id = withIdFs.getId(filePath);
      
      const readContent = withIdFs.getByIdOrAlias(id);
      expect(readContent).toBe(content);
    });

    it('should read files by alias', () => {
      const content = 'Configuration data';
      const filePath = './config/app.txt';
      
      withIdFs.writeFileSync(filePath, content);
      const alias = withIdFs.getAlias(filePath);
      
      const readContent = withIdFs.getByIdOrAlias(alias);
      expect(readContent).toBe(content);
    });

    it('should validate file format when specified', () => {
      const jsonContent = '{"valid": "json"}';
      const filePath = './data.json';
      
      withIdFs.writeFileSync(filePath, jsonContent);
      const id = withIdFs.getId(filePath);
      
      // Should work with correct format
      expect(() => withIdFs.getByIdOrAlias(id, FileFormat.JSON)).not.toThrow();
      
      // Should throw with wrong format
      expect(() => withIdFs.getByIdOrAlias(id, FileFormat.PDF)).toThrow('File format mismatch');
    });

    it('should throw error for non-existent ID or alias', () => {
      expect(() => withIdFs.getByIdOrAlias('nonexistent')).toThrow('File not found');
      expect(() => withIdFs.getByIdOrAlias('fake-id-12345')).toThrow('File not found');
    });
  });

  describe('metadata management', () => {
    it('should track multiple files', () => {
      withIdFs.writeFileSync('./file1.txt', 'content1');
      withIdFs.writeFileSync('./dir/file2.json', '{"data": 2}');
      withIdFs.writeFileSync('./file3.md', '# Header');
      
      const trackedFiles = withIdFs.listTrackedFiles();
      expect(trackedFiles).toHaveLength(3);
      
      const paths = trackedFiles.map(f => f.originalPath);
      expect(paths).toContain('./file1.txt');
      expect(paths).toContain('./dir/file2.json');
      expect(paths).toContain('./file3.md');
    });

    it('should provide complete metadata', () => {
      const filePath = './vault/profiles/user1.json';
      withIdFs.writeFileSync(filePath, '{}');
      
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
    it('should handle directory deletion with metadata cleanup', () => {
      withIdFs.writeFileSync('./dir/file1.txt', 'content1');
      withIdFs.writeFileSync('./dir/subdir/file2.txt', 'content2');
      withIdFs.writeFileSync('./other/file3.txt', 'content3');
      
      expect(withIdFs.listTrackedFiles()).toHaveLength(3);
      
      withIdFs.deleteDirSync('./dir');
      
      const remaining = withIdFs.listTrackedFiles();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].originalPath).toBe('./other/file3.txt');
    });

    it('should delegate directory operations to base filesystem', () => {
      withIdFs.ensureDirSync('./testdir');
      expect(memFs.existsSync('./testdir')).toBe(true);
      
      withIdFs.writeFileSync('./testdir/file.txt', 'content');
      const dirs = withIdFs.readDirSync('./testdir');
      
      // Should contain the stored file name
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toMatch(/^file:testdir-file-[a-f0-9]{16}\.txt$/);
    });
  });

  describe('filesystem interface compliance', () => {
    it('should implement all IFileSystem methods', () => {
      const filePath = './test.txt';
      const content = 'test content';
      
      // Write and read
      withIdFs.writeFileSync(filePath, content);
      expect(withIdFs.readFileSync(filePath)).toBe(content);
      
      // Exists
      expect(withIdFs.existsSync(filePath)).toBe(true);
      expect(withIdFs.existsSync('./nonexistent.txt')).toBe(false);
      
      // Directory operations
      withIdFs.ensureDirSync('./newdir');
      expect(memFs.existsSync('./newdir')).toBe(true);
      
      // Chmod (should delegate to stored path)
      expect(() => withIdFs.chmodSync(filePath, 0o755)).not.toThrow();
      
      // Delete
      withIdFs.deleteFileSync(filePath);
      expect(withIdFs.existsSync(filePath)).toBe(false);
    });

    it('should handle clear operation if available', () => {
      withIdFs.writeFileSync('./dir/file1.txt', 'content1');
      withIdFs.writeFileSync('./dir/file2.txt', 'content2');
      
      expect(withIdFs.listTrackedFiles()).toHaveLength(2);
      
      if (withIdFs.clear) {
        withIdFs.clear('./dir');
        
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

    it('should handle files with no extension', () => {
      const filePath = './README';
      withIdFs.writeFileSync(filePath, 'content');
      
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
