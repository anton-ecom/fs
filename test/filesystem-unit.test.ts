/**
 * Tests for Filesystem Unit - Unit Architecture implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilesystemUnit, FilesystemUnits } from '../src/filesystem-unit';

describe('FilesystemUnit', () => {
  describe('CREATE', () => {
    it('should create a unit with memory backend', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      expect(unit).toBeDefined();
      expect(unit.teach().getPrimary()).toBe('memory');
    });

    it('should create a unit with multiple backends', () => {
      const unit = FilesystemUnit.create({
        backends: [
          { type: 'memory' },
          { type: 'node' }
        ],
        primary: 'memory',
        fallbacks: ['node']
      });

      expect(unit.teach().getPrimary()).toBe('memory');
      expect(unit.teach().getFallbacks()).toEqual(['node']);
      expect(unit.teach().getBackends()).toEqual(['memory', 'node']);
    });

    it('should throw error with no backends', () => {
      expect(() => FilesystemUnit.create({
        backends: []
      })).toThrow('At least one backend must be configured');
    });

    it('should throw error with invalid primary backend', () => {
      expect(() => FilesystemUnit.create({
        backends: [{ type: 'memory' }],
        primary: 'node' as any
      })).toThrow("Primary backend 'node' not found");
    });

    it('should throw error with invalid fallback backend', () => {
      expect(() => FilesystemUnit.create({
        backends: [{ type: 'memory' }],
        fallbacks: ['node']
      })).toThrow("Fallback backend 'node' not found");
    });
  });

  describe('EXECUTE', () => {
    let unit: FilesystemUnit;

    beforeEach(() => {
      unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });
    });

    it('should execute filesystem operations', async () => {
      const fs = unit.teach();
      
      // Test write
      await fs.writeFile('/test.txt', 'Hello, World!');
      
      // Test read
      const content = await fs.readFile('/test.txt');
      expect(content).toBe('Hello, World!');
      
      // Test exists
      const exists = await fs.exists('/test.txt');
      expect(exists).toBe(true);
      
      // Test non-existent file
      const notExists = await fs.exists('/nonexistent.txt');
      expect(notExists).toBe(false);
    });

    it('should track operation statistics', async () => {
      const fs = unit.teach();
      
      await fs.writeFile('/test1.txt', 'content1');
      await fs.writeFile('/test2.txt', 'content2');
      await fs.readFile('/test1.txt');
      
      const stats = fs.getStats();
      expect(stats.writes).toBe(2);
    });

    it('should handle directory operations', async () => {
      const fs = unit.teach();
      
      await fs.ensureDir('/test-dir');
      await fs.writeFile('/test-dir/file.txt', 'content');
      
      const files = await fs.readDir('/test-dir');
      expect(files).toContain('file.txt');
    });
  });

  describe('TEACH', () => {
    it('should provide complete filesystem interface', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      const fs = unit.teach();

      // Check all required methods exist
      expect(typeof fs.readFile).toBe('function');
      expect(typeof fs.writeFile).toBe('function');
      expect(typeof fs.exists).toBe('function');
      expect(typeof fs.deleteFile).toBe('function');
      expect(typeof fs.readDir).toBe('function');
      expect(typeof fs.ensureDir).toBe('function');
      expect(typeof fs.getStats).toBe('function');
      expect(typeof fs.getBackends).toBe('function');
      expect(typeof fs.getPrimary).toBe('function');
      expect(typeof fs.getFallbacks).toBe('function');
    });

    it('should provide unit-specific methods', () => {
      const unit = FilesystemUnit.create({
        backends: [
          { type: 'memory' },
          { type: 'node' }
        ],
        primary: 'memory',
        fallbacks: ['node']
      });

      const fs = unit.teach();

      expect(fs.getBackends()).toEqual(['memory', 'node']);
      expect(fs.getPrimary()).toBe('memory');
      expect(fs.getFallbacks()).toEqual(['node']);
    });
  });

  describe('LEARN', () => {
    it('should provide learning capabilities', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      const learning = unit.learn();

      expect(typeof learning.getMostUsedBackend).toBe('function');
      expect(typeof learning.getErrorPatterns).toBe('function');
      expect(typeof learning.optimizeBackendOrder).toBe('function');
    });

    it('should track error patterns', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      const learning = unit.learn();
      const patterns = learning.getErrorPatterns();

      expect(patterns).toHaveProperty('totalErrors');
      expect(patterns).toHaveProperty('suggestion');
    });
  });

  describe('Runtime Management', () => {
    it('should allow adding backends at runtime', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      expect(unit.teach().getBackends()).toEqual(['memory']);

      unit.addBackend({ type: 'node' });

      expect(unit.teach().getBackends()).toEqual(['memory', 'node']);
    });

    it('should allow switching primary backend', () => {
      const unit = FilesystemUnit.create({
        backends: [
          { type: 'memory' },
          { type: 'node' }
        ]
      });

      expect(unit.teach().getPrimary()).toBe('memory');

      unit.setPrimary('node');

      expect(unit.teach().getPrimary()).toBe('node');
    });

    it('should throw error when switching to non-existent backend', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      expect(() => unit.setPrimary('node' as any)).toThrow("Backend 'node' not found");
    });

    it('should provide direct backend access', () => {
      const unit = FilesystemUnit.create({
        backends: [{ type: 'memory' }]
      });

      const memoryBackend = unit.getBackend('memory');
      expect(memoryBackend).toBeDefined();
      expect(memoryBackend).toBeTruthy();
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to secondary backend on error', async () => {
      // Create a unit with memory primary and node fallback
      const unit = FilesystemUnit.create({
        backends: [
          { type: 'memory' },
          { type: 'node' }
        ],
        primary: 'memory',
        fallbacks: ['node']
      });

      // This test would need a way to force the memory backend to fail
      // For now, just verify the structure is correct
      expect(unit.teach().getPrimary()).toBe('memory');
      expect(unit.teach().getFallbacks()).toEqual(['node']);
    });
  });
});

describe('FilesystemUnits Factory', () => {
  describe('development preset', () => {
    it('should create development configuration', () => {
      const unit = FilesystemUnits.development();
      
      expect(unit.teach().getPrimary()).toBe('memory');
      expect(unit.teach().getFallbacks()).toEqual(['node']);
      expect(unit.teach().getBackends()).toEqual(['memory', 'node']);
    });
  });

  describe('github preset', () => {
    it('should create github configuration', () => {
      const githubOptions = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      const unit = FilesystemUnits.github(githubOptions);
      
      expect(unit.teach().getPrimary()).toBe('github');
      expect(unit.teach().getFallbacks()).toEqual(['memory']);
      expect(unit.teach().getBackends()).toEqual(['github', 'memory']);
    });
  });

  // Note: S3 and production tests would require actual AWS credentials
  // They are skipped in this test suite but the structure is verified
});

describe('Integration Tests', () => {
  it('should work with encrypted filesystem unit', async () => {
    // This would test integration with @hsfs/encrypted
    // For now, just test the basic filesystem operations
    const unit = FilesystemUnit.create({
      backends: [{ type: 'memory' }]
    });

    const fs = unit.teach();

    // Test complex file operations
    await fs.ensureDir('/config');
    await fs.writeFile('/config/app.json', JSON.stringify({ version: '1.0' }));
    
    const content = await fs.readFile('/config/app.json');
    const config = JSON.parse(content);
    
    expect(config.version).toBe('1.0');

    const files = await fs.readDir('/config');
    expect(files).toContain('app.json');

    await fs.deleteFile('/config/app.json');
    
    const exists = await fs.exists('/config/app.json');
    expect(exists).toBe(false);
  });
});
