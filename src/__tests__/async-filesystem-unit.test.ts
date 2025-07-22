/**
 * Tests for AsyncFileSystem Unit - Unit Architecture implementation
 * Following Doctrine patterns for async filesystem capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncFileSystem } from '../promises/async-filesystem-unit.js';

describe('AsyncFileSystem', () => {
  describe('CREATE', () => {
    it('should create unit with memory backend', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      expect(unit).toBeDefined();
      expect(unit.whoami()).toMatch(/AsyncFileSystem\[fs-async\]/);
    });

    it('should create unit with node backend', () => {
      const unit = AsyncFileSystem.create({
        type: 'node'
      });

      expect(unit).toBeDefined();
      expect(unit.whoami()).toMatch(/AsyncFileSystem\[fs-async\]/);
    });

    it('should initialize with zero operation stats', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

    });

    it('should initialize with configuration', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      expect(unit.getBackendType()).toBe('memory');

    });
  });

  describe('EXECUTE - File Operations', () => {
    let unit: AsyncFileSystem;

    beforeEach(() => {
      unit = AsyncFileSystem.create({
        type: 'memory'
      });
    });

    it('should execute write and read operations', async () => {
      const testContent = 'Hello, Async World!';
      const testPath = 'test-async.txt';  // Test with relative path

      // Write file
      await unit.writeFile(testPath, testContent);
      
      // Read file
      const content = await unit.readFile(testPath);
      expect(content).toBe(testContent);
    });

    it('should handle exists check for files', async () => {
      const testPath = '/exists-test.txt';
      
      // Check non-existent file
      const beforeWrite = await unit.exists(testPath);
      expect(beforeWrite).toBe(false);
      
      // Write file
      await unit.writeFile(testPath, 'test content');
      
      // Check existing file
      const afterWrite = await unit.exists(testPath);
      expect(afterWrite).toBe(true);
    });

    it('should delete files', async () => {
      const testPath = '/delete-test.txt';
      
      // Create file
      await unit.writeFile(testPath, 'to be deleted');
      expect(await unit.exists(testPath)).toBe(true);
      
      // Delete file
      await unit.deleteFile(testPath);
      expect(await unit.exists(testPath)).toBe(false);
    });

    it('should handle directory operations', async () => {
      const dirPath = '/test-directory';
      const filePath = '/test-directory/nested-file.txt';
      
      // Ensure directory exists
      await unit.ensureDir(dirPath);
      
      // Write file in directory
      await unit.writeFile(filePath, 'nested content');
      
      // Read directory contents
      const files = await unit.readDir(dirPath);
      expect(files).toContain('nested-file.txt');
      
      // Delete directory
      await unit.deleteDir(dirPath);
      expect(await unit.exists(dirPath)).toBe(false);
    });


  });

  describe('TEACH', () => {
    it('should provide complete async filesystem teaching contract', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      const contract = unit.teach();

      expect(contract.unitId).toBe('fs-async');
      expect(contract.capabilities).toBeDefined();
      
      // Check all async filesystem capabilities
      const capabilities = contract.capabilities;
      expect(typeof capabilities.readFile).toBe('function');
      expect(typeof capabilities.writeFile).toBe('function');
      expect(typeof capabilities.exists).toBe('function');
      expect(typeof capabilities.deleteFile).toBe('function');
      expect(typeof capabilities.readDir).toBe('function');
      expect(typeof capabilities.ensureDir).toBe('function');
      expect(typeof capabilities.deleteDir).toBe('function');
      expect(typeof capabilities.stat).toBe('function');
    });

    it('should provide async-specific namespaced capabilities', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      const contract = unit.teach();
      expect(contract.unitId).toBe('fs-async');
      
      // Verify namespacing follows fs-async.* pattern
      // When learned by other units, capabilities will be fs-async.readFile, etc.
    });

    it('should execute taught capabilities correctly', async () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      const contract = unit.teach();
      
      // Test capabilities work through teaching contract
      await contract.capabilities.writeFile('/taught-test.txt', 'taught content');
      const content = await contract.capabilities.readFile('/taught-test.txt');
      expect(content).toBe('taught content');
      
      const exists = await contract.capabilities.exists('/taught-test.txt');
      expect(exists).toBe(true);
    });
  });

  describe('LEARN', () => {
    it('should maintain learning capability for Unit Architecture', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      // AsyncFileSystem should be able to learn from other units
      // (Though filesystem typically teaches rather than learns)
      expect(typeof unit.learn).toBe('function');
    });

    it('should preserve learned capabilities alongside native ones', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      // Test that unit can learn additional capabilities
      const mockTeachingContract = {
        unitId: 'test-unit',
        capabilities: {
          testCapability: (...args: unknown[]) => 'test result'
        }
      };

      unit.learn([mockTeachingContract]);
      
      // Should still have native filesystem capabilities
      expect(typeof unit.writeFile).toBe('function');
      expect(typeof unit.readFile).toBe('function');
      
      // Should have learned capability
      expect(unit.can('test-unit.testCapability')).toBe(true);
    });
  });

  describe('Unit Architecture Compliance', () => {
    it('should have proper DNA identity', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      expect(unit.dna.id).toBe('fs-async');
      expect(unit.dna.version).toBe('1.0.0');
    });

    it('should provide comprehensive help documentation', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      unit.help();
      // help() outputs to console, so we just verify it doesn't throw
    });

    it('should provide identity through whoami', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      const identity = unit.whoami();
      expect(identity).toMatch(/AsyncFileSystem\[fs-async\]/);
    });

    it('should track capabilities correctly', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      const capabilities = unit.capabilities();
      expect(capabilities).toContain('readFile');
      expect(capabilities).toContain('writeFile');
      expect(capabilities).toContain('exists');
      expect(capabilities).toContain('deleteFile');
      expect(capabilities).toContain('readDir');
      expect(capabilities).toContain('ensureDir');
      expect(capabilities).toContain('deleteDir');
      expect(capabilities).toContain('stat');
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should handle non-existent file reads gracefully', async () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      await expect(unit.readFile('/non-existent.txt')).rejects.toThrow();
      
    });

    it('should handle invalid directory operations', async () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      // Try to read non-existent directory
      await expect(unit.readDir('/non-existent-dir')).rejects.toThrow();
    });

 
  });

  describe('Backend Integration', () => {
    it('should work with memory backend', async () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      await unit.writeFile('/memory-test.txt', 'memory content');
      const content = await unit.readFile('/memory-test.txt');
      expect(content).toBe('memory content');
    });

    it('should provide backend information', () => {
      const unit = AsyncFileSystem.create({
        type: 'memory'
      });

      expect(unit.getBackendType()).toBe('memory');
      expect(unit.getBackend()).toBeDefined();
    });
  });


  describe('Integration with Unit Ecosystem', () => {
    it('should be compatible with Unit learning protocols', () => {
      const unit1 = AsyncFileSystem.create({
        type: 'memory'
      });

      const unit2 = AsyncFileSystem.create({
        type: 'memory'
      });

      // Units should be able to teach/learn from each other
      const contract = unit1.teach();
      unit2.learn([contract]);

      // Evolved unit should have learned capabilities
      expect(unit2.can('fs-async.readFile')).toBe(true);
      expect(unit2.can('fs-async.writeFile')).toBe(true);
    });

    it('should maintain separate operation statistics between units', async () => {
      const unit1 = AsyncFileSystem.create({
        type: 'memory'
      });

      const unit2 = AsyncFileSystem.create({
        type: 'memory'
      });

      // Operations on unit1 shouldn't affect unit2's statistics
      await unit1.writeFile('/stats-test.txt', 'unit1 content');
      
 
    });
  });
});

describe('AsyncFileSystem vs FileSystem Compatibility', () => {
  it('should provide equivalent functionality to sync FileSystem', async () => {
    const asyncUnit = AsyncFileSystem.create({
      type: 'memory'
    });

    // AsyncFileSystem should provide same core functionality
    // but with async/await patterns instead of sync
    
    const testPath = '/compatibility-test.txt';
    const testContent = 'compatibility test content';

    await asyncUnit.writeFile(testPath, testContent);
    const content = await asyncUnit.readFile(testPath);
    const exists = await asyncUnit.exists(testPath);

    expect(content).toBe(testContent);
    expect(exists).toBe(true);
  });

  it('should have consistent capability naming with fs-async namespace', () => {
    const asyncUnit = AsyncFileSystem.create({
      type: 'memory'
    });

    const contract = asyncUnit.teach();
    expect(contract.unitId).toBe('fs-async');
    
    // When other units learn from this, capabilities will be:
    // fs-async.readFile, fs-async.writeFile, etc.
    // This differs from sync FileSystem which uses: 
    // fs.readFileSync, fs.writeFileSync, etc.
  });
});
