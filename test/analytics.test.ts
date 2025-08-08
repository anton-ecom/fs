import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsFileSystem, createAnalyticsFileSystem, type Stats, type AnalyticsStatsEvent } from '../src/analytics';
import { TestFileSystem } from './fixtures/test-filesystem';

describe('AnalyticsFileSystem (Sync)', () => {
  let testFs: TestFileSystem;
  let analyticsFs: AnalyticsFileSystem;

  beforeEach(() => {
    testFs = new TestFileSystem();
    analyticsFs = new AnalyticsFileSystem(testFs);
  });

  describe('basic operations', () => {
    it('should track read operations', () => {
      // Setup test file
      testFs.writeFileSync('./test.txt', 'Hello World');
      
      // Perform read operations
      analyticsFs.readFileSync('./test.txt');
      analyticsFs.readFileSync('./test.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(2);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(2);
      expect(stats.fileReads[0].file).toBe('./test.txt');
      expect(stats.fileReads[0].access).toBe('read');
    });

    it('should track write operations', () => {
      analyticsFs.writeFileSync('./test1.txt', 'data1');
      analyticsFs.writeFileSync('./test2.txt', 'data2');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.write).toBe(2);
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(2);
      expect(stats.fileReads[0].access).toBe('write');
      expect(stats.fileReads[1].access).toBe('write');
    });

    it('should track delete operations', () => {
      // Setup test files
      testFs.writeFileSync('./test1.txt', 'data1');
      testFs.writeFileSync('./test2.txt', 'data2');
      
      analyticsFs.deleteFileSync('./test1.txt');
      analyticsFs.deleteFileSync('./test2.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.delete).toBe(2);
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.fileReads).toHaveLength(2);
      expect(stats.fileReads[0].access).toBe('delete');
    });

    it('should track mixed operations correctly', () => {
      analyticsFs.writeFileSync('./test.txt', 'data');
      analyticsFs.readFileSync('./test.txt');
      analyticsFs.readFileSync('./test.txt');
      analyticsFs.deleteFileSync('./test.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(2);
      expect(stats.stats.write).toBe(1);
      expect(stats.stats.delete).toBe(1);
      expect(stats.fileReads).toHaveLength(4);
    });
  });

  describe('non-tracked operations', () => {
    it('should not track existsSync operations', () => {
      testFs.writeFileSync('./test.txt', 'data');
      
      analyticsFs.existsSync('./test.txt');
      analyticsFs.existsSync('./nonexistent.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(0);
    });

    it('should not track directory operations', () => {
      analyticsFs.ensureDirSync('./testdir');
      analyticsFs.readDirSync('./');
      analyticsFs.deleteDirSync('./testdir');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(0);
    });

    it('should not track chmod operations', () => {
      testFs.writeFileSync('./test.txt', 'data');
      analyticsFs.chmodSync('./test.txt', 0o755);
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(0);
    });
  });

  describe('analytics data structure', () => {
    it('should include timestamps in file access records', () => {
      const beforeTime = new Date().toISOString();
      analyticsFs.writeFileSync('./test.txt', 'data');
      const afterTime = new Date().toISOString();
      
      const stats = analyticsFs.getStats();
      const record = stats.fileReads[0];
      
      expect(record.file).toBe('./test.txt');
      expect(record.access).toBe('write');
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(record.timestamp >= beforeTime).toBe(true);
      expect(record.timestamp <= afterTime).toBe(true);
    });

    it('should return immutable copies of stats', () => {
      analyticsFs.writeFileSync('./test.txt', 'data');
      
      const stats1 = analyticsFs.getStats();
      const stats2 = analyticsFs.getStats();
      
      // Modify returned objects
      stats1.stats.read = 999;
      stats1.fileReads.push({ file: 'fake', timestamp: 'fake', access: 'read' });
      
      // Original should be unchanged
      expect(stats2.stats.read).toBe(0);
      expect(stats2.fileReads).toHaveLength(1);
    });
  });

  describe('event emission', () => {
    it('should emit stats when threshold is reached', () => {
      let emittedStats: Stats | null = null;
      const { instance, eventEmitter } = createAnalyticsFileSystem(testFs, { emitOn: 3 });
      
      eventEmitter.subscribe('analytics.stats', {
        update(event: AnalyticsStatsEvent) {
          emittedStats = event.data;
        }
      });
      
      // Perform operations to reach threshold
      instance.writeFileSync('./test1.txt', 'data1');
      instance.writeFileSync('./test2.txt', 'data2');
      expect(emittedStats).toBeNull(); // Not yet reached threshold
      
      instance.readFileSync('./test1.txt'); // This should trigger emission
      
      expect(emittedStats).not.toBeNull();
 
    });

    it('should reset stats after emission', () => {
      const { instance, eventEmitter } = createAnalyticsFileSystem(testFs, { emitOn: 2 });
      
      eventEmitter.subscribe('analytics.stats', {
        update() {
          // Event received
        }
      });
      
      // Trigger first emission
      instance.writeFileSync('./test1.txt', 'data1');
      instance.writeFileSync('./test2.txt', 'data2');
      
      // Stats should be reset
      const statsAfterEmission = instance.getStats();
      expect(statsAfterEmission.stats.read).toBe(0);
      expect(statsAfterEmission.stats.write).toBe(0);
      expect(statsAfterEmission.stats.delete).toBe(0);
      expect(statsAfterEmission.fileReads).toHaveLength(0);
      
      // Next operations should start fresh
      instance.readFileSync('./test1.txt');
      const newStats = instance.getStats();
      expect(newStats.stats.read).toBe(1);
      expect(newStats.fileReads).toHaveLength(1);
    });

    it('should use default threshold of 100', () => {
      let emissionCount = 0;
      const { instance, eventEmitter } = createAnalyticsFileSystem(testFs);
      
      eventEmitter.subscribe('analytics.stats', {
        update() {
          emissionCount++;
        }
      });
      
      // Perform 99 operations - should not emit
      for (let i = 0; i < 99; i++) {
        instance.writeFileSync(`./test${i}.txt`, 'data');
      }
      expect(emissionCount).toBe(0);
      
      // 100th operation should trigger emission
      instance.writeFileSync('./test99.txt', 'data');
      expect(emissionCount).toBe(1);
    });
  });

  describe('factory function', () => {
    it('should create instance with event emitter access', () => {
      const { instance, eventEmitter } = createAnalyticsFileSystem(testFs, { emitOn: 1 });
      
      expect(instance).toBeInstanceOf(AnalyticsFileSystem);
      expect(eventEmitter).toBe(instance.getEventEmitter());
      
      let eventReceived = false;
      eventEmitter.subscribe('analytics.stats', {
        update() {
          eventReceived = true;
        }
      });
      
      instance.writeFileSync('./test.txt', 'data');
      expect(eventReceived).toBe(true);
    });
  });

  describe('filesystem delegation', () => {
    it('should delegate all operations to base filesystem', () => {
      // Write through analytics fs
      analyticsFs.writeFileSync('./test.txt', 'Hello World');
      
      // Read directly from base fs
      expect(testFs.readFileSync('./test.txt')).toBe('Hello World');
      
      // Read through analytics fs
      expect(analyticsFs.readFileSync('./test.txt')).toBe('Hello World');
      
      // Delete through analytics fs
      analyticsFs.deleteFileSync('./test.txt');
      
      // Verify deleted in base fs
      expect(testFs.existsSync('./test.txt')).toBe(false);
    });

    it('should expose event emitter directly', () => {
      const eventEmitter = analyticsFs.getEventEmitter();
      expect(eventEmitter).toBeDefined();
      expect(typeof eventEmitter.subscribe).toBe('function');
      expect(typeof eventEmitter.emit).toBe('function');
    });
  });
});
