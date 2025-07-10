/**
 * Tests for Simplified Filesystem Unit
 */

import { describe, it, expect } from 'vitest';
import { FilesystemUnit, FilesystemUnits } from '../filesystem-unit';

describe('Simplified FilesystemUnit', () => {
  describe('CREATE', () => {
    it('should create a unit with memory backend', () => {
      const unit = FilesystemUnit.create({
        type: 'memory'
      });

      expect(unit).toBeDefined();
      expect(unit.teach().getBackendType()).toBe('memory');
    });

    it('should create a unit with node backend', () => {
      const unit = FilesystemUnit.create({
        type: 'node',
        async: true
      });

      expect(unit.teach().getBackendType()).toBe('node');
      expect(unit.teach().isAsync()).toBe(true);
    });

    it('should create a unit with github backend', () => {
      const githubOptions = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      const unit = FilesystemUnit.create({
        type: 'github',
        options: githubOptions
      });

      expect(unit.teach().getBackendType()).toBe('github');
      expect(unit.teach().getConfig().options).toEqual(githubOptions);
    });

    it('should throw error when github backend missing options', () => {
      expect(() => FilesystemUnit.create({
        type: 'github'
      })).toThrow('GitHub filesystem requires options');
    });

    it('should throw error when s3 backend missing options', () => {
      expect(() => FilesystemUnit.create({
        type: 's3'
      })).toThrow('S3 filesystem requires options');
    });
  });

  describe('EXECUTE', () => {
    it('should execute filesystem operations', async () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
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
      const unit = FilesystemUnit.create({ type: 'memory' });
      const fs = unit.teach();
      
      await fs.writeFile('/test1.txt', 'content1');
      await fs.writeFile('/test2.txt', 'content2');
      await fs.readFile('/test1.txt');
      
      const stats = fs.getStats();
      expect(stats.writes).toBe(2);
      expect(stats.reads).toBe(1);
      expect(stats.errors).toBe(0);
    });

    it('should handle directory operations', async () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const fs = unit.teach();
      
      await fs.ensureDir('/test-dir');
      await fs.writeFile('/test-dir/file.txt', 'content');
      
      const files = await fs.readDir('/test-dir');
      expect(files).toContain('file.txt');
    });

    it('should track errors', async () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const fs = unit.teach();
      
      // Try to read non-existent file
      try {
        await fs.readFile('/nonexistent.txt');
      } catch {
        // Expected error
      }
      
      const stats = fs.getStats();
      expect(stats.errors).toBe(1);
    });
  });

  describe('TEACH', () => {
    it('should provide complete filesystem interface', () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const fs = unit.teach();

      // Check all required methods exist
      expect(typeof fs.readFile).toBe('function');
      expect(typeof fs.writeFile).toBe('function');
      expect(typeof fs.exists).toBe('function');
      expect(typeof fs.deleteFile).toBe('function');
      expect(typeof fs.readDir).toBe('function');
      expect(typeof fs.ensureDir).toBe('function');
      expect(typeof fs.getStats).toBe('function');
      expect(typeof fs.getBackendType).toBe('function');
      expect(typeof fs.getConfig).toBe('function');
      expect(typeof fs.isAsync).toBe('function');
    });

    it('should provide backend information', () => {
      const unit = FilesystemUnit.create({ 
        type: 'memory', 
        async: true 
      });
      const fs = unit.teach();

      expect(fs.getBackendType()).toBe('memory');
      expect(fs.isAsync()).toBe(true);
      expect(fs.getConfig().type).toBe('memory');
      expect(fs.getConfig().async).toBe(true);
    });
  });

  describe('LEARN', () => {
    it('should provide learning capabilities', () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const learning = unit.learn();

      expect(typeof learning.getUsagePattern).toBe('function');
      expect(typeof learning.getErrorPatterns).toBe('function');
      expect(typeof learning.getPerformanceInsights).toBe('function');
    });

    it('should track usage patterns', async () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const fs = unit.teach();
      const learning = unit.learn();
      
      // Generate some usage
      await fs.writeFile('/test.txt', 'content');
      await fs.readFile('/test.txt');
      await fs.readFile('/test.txt');
      
      const pattern = learning.getUsagePattern();
      expect(pattern.backendType).toBe('memory');
      expect(pattern.totalOperations).toBe(3);
      expect(pattern.readWriteRatio).toBe(2); // 2 reads / 1 write
    });

    it('should provide error insights', () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const learning = unit.learn();
      
      const errorPattern = learning.getErrorPatterns();
      expect(errorPattern.backendType).toBe('memory');
      expect(errorPattern.totalErrors).toBe(0);
      expect(errorPattern.suggestion).toBe('System running smoothly');
    });

    it('should provide performance insights', () => {
      const unit = FilesystemUnit.create({ 
        type: 'node', 
        async: true 
      });
      const learning = unit.learn();
      
      const insights = learning.getPerformanceInsights();
      expect(insights.backendType).toBe('node');
      expect(insights.isAsync).toBe(true);
      expect(insights.recommendation).toContain('async backend');
    });
  });

  describe('Runtime Management', () => {
    it('should allow switching backends', () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      
      expect(unit.teach().getBackendType()).toBe('memory');
      
      unit.switchBackend({ type: 'node' });
      
      expect(unit.teach().getBackendType()).toBe('node');
    });

    it('should reset stats when switching backends', async () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      const fs = unit.teach();
      
      // Generate some stats
      await fs.writeFile('/test.txt', 'content');
      expect(fs.getStats().writes).toBe(1);
      
      // Switch backend
      unit.switchBackend({ type: 'node' });
      
      // Stats should be reset
      expect(unit.teach().getStats().writes).toBe(0);
    });

    it('should provide direct backend access', () => {
      const unit = FilesystemUnit.create({ type: 'memory' });
      
      const backend = unit.getBackend();
      expect(backend).toBeDefined();
    });
  });
});

describe('FilesystemUnits Factory', () => {
  it('should create memory unit', () => {
    const unit = FilesystemUnits.memory();
    expect(unit.teach().getBackendType()).toBe('memory');
  });

  it('should create node unit', () => {
    const unit = FilesystemUnits.node(true);
    expect(unit.teach().getBackendType()).toBe('node');
    expect(unit.teach().isAsync()).toBe(true);
  });

  it('should create github unit', () => {
    const githubOptions = {
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    };
    
    const unit = FilesystemUnits.github(githubOptions);
    expect(unit.teach().getBackendType()).toBe('github');
  });

  it('should create development preset', () => {
    const unit = FilesystemUnits.development();
    expect(unit.teach().getBackendType()).toBe('memory');
  });

  it('should create production preset', () => {
    const s3Options = {
      region: 'us-east-1',
      bucket: 'test-bucket'
    };
    
    const unit = FilesystemUnits.production(s3Options);
    expect(unit.teach().getBackendType()).toBe('s3');
    expect(unit.teach().isAsync()).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should work with complex file operations', async () => {
    const unit = FilesystemUnit.create({ type: 'memory' });
    const fs = unit.teach();

    // Test complex file operations
    await fs.ensureDir('/config');
    await fs.writeFile('/config/app.json', JSON.stringify({ 
      version: '1.0',
      features: ['identity', 'storage']
    }));
    
    const content = await fs.readFile('/config/app.json');
    const config = JSON.parse(content);
    
    expect(config.version).toBe('1.0');
    expect(config.features).toContain('identity');

    const files = await fs.readDir('/config');
    expect(files).toContain('app.json');

    await fs.deleteFile('/config/app.json');
    
    const exists = await fs.exists('/config/app.json');
    expect(exists).toBe(false);
  });

  it('should provide comprehensive analytics', async () => {
    const unit = FilesystemUnit.create({ type: 'memory' });
    const fs = unit.teach();
    const learning = unit.learn();

    // Generate usage
    await fs.writeFile('/file1.txt', 'content1');
    await fs.writeFile('/file2.txt', 'content2');
    await fs.readFile('/file1.txt');
    await fs.exists('/file2.txt');

    const stats = fs.getStats();
    const pattern = learning.getUsagePattern();
    const insights = learning.getPerformanceInsights();

    expect(stats.writes).toBe(2);
    expect(stats.reads).toBe(1);
    expect(pattern.totalOperations).toBe(3); // writeFile counts reads in this implementation
    expect(insights.backendType).toBe('memory');
  });
});
