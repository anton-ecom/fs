import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsFileSystem, createAnalyticsFileSystem, type Stats, type AnalyticsStatsEvent } from '../src/promises/analytics';
import { MemFileSystem } from './fixtures/async-memory';


describe('AnalyticsFileSystem (Async)', () => {
  let memFs: MemFileSystem;
  let analyticsFs: AnalyticsFileSystem;

  beforeEach(() => {
    memFs = new MemFileSystem();
    analyticsFs = new AnalyticsFileSystem(memFs);
  });

  describe('basic operations', () => {
    it('should track read operations', async () => {
      // Setup test file
      await memFs.writeFile('./test.txt', 'Hello World');
      
      // Perform read operations
      await analyticsFs.readFile('./test.txt');
      await analyticsFs.readFile('./test.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(2);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(2);
      expect(stats.fileReads[0].file).toBe('./test.txt');
      expect(stats.fileReads[0].access).toBe('read');
    });

    it('should track write operations', async () => {
      await analyticsFs.writeFile('./test1.txt', 'data1');
      await analyticsFs.writeFile('./test2.txt', 'data2');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.write).toBe(2);
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(2);
      expect(stats.fileReads[0].access).toBe('write');
      expect(stats.fileReads[1].access).toBe('write');
    });

    it('should track delete operations', async () => {
      // Setup test files
      await memFs.writeFile('./test1.txt', 'data1');
      await memFs.writeFile('./test2.txt', 'data2');
      
      await analyticsFs.deleteFile('./test1.txt');
      await analyticsFs.deleteFile('./test2.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.delete).toBe(2);
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.fileReads).toHaveLength(2);
      expect(stats.fileReads[0].access).toBe('delete');
    });

    it('should track mixed operations correctly', async () => {
      await analyticsFs.writeFile('./test.txt', 'data');
      await analyticsFs.readFile('./test.txt');
      await analyticsFs.readFile('./test.txt');
      await analyticsFs.deleteFile('./test.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(2);
      expect(stats.stats.write).toBe(1);
      expect(stats.stats.delete).toBe(1);
      expect(stats.fileReads).toHaveLength(4);
    });
  });

  describe('non-tracked operations', () => {
    it('should not track exists operations', async () => {
      await memFs.writeFile('./test.txt', 'data');
      
      await analyticsFs.exists('./test.txt');
      await analyticsFs.exists('./nonexistent.txt');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(0);
    });

    it('should not track directory operations', async () => {
      await analyticsFs.ensureDir('./testdir');
      await analyticsFs.readDir('./');
      await analyticsFs.deleteDir('./testdir');
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(0);
    });

    it('should not track chmod operations', async () => {
      await memFs.writeFile('./test.txt', 'data');
      await analyticsFs.chmod('./test.txt', 0o755);
      
      const stats = analyticsFs.getStats();
      expect(stats.stats.read).toBe(0);
      expect(stats.stats.write).toBe(0);
      expect(stats.stats.delete).toBe(0);
      expect(stats.fileReads).toHaveLength(0);
    });
  });

  describe('analytics data structure', () => {
    it('should include timestamps in file access records', async () => {
      const beforeTime = new Date().toISOString();
      await analyticsFs.writeFile('./test.txt', 'data');
      const afterTime = new Date().toISOString();
      
      const stats = analyticsFs.getStats();
      const record = stats.fileReads[0];
      
      expect(record.file).toBe('./test.txt');
      expect(record.access).toBe('write');
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(record.timestamp >= beforeTime).toBe(true);
      expect(record.timestamp <= afterTime).toBe(true);
    });

    it('should return immutable copies of stats', async () => {
      await analyticsFs.writeFile('./test.txt', 'data');
      
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
    it('should emit stats when threshold is reached', async () => {
      let emittedStats: Stats | null = null;
      const { instance, eventEmitter } = createAnalyticsFileSystem(memFs, { emitOn: 3 });
      
      eventEmitter.subscribe('analytics.stats', {
        update(event: AnalyticsStatsEvent) {
          emittedStats = event.data;
        }
      });
      
      // Perform operations to reach threshold
      await instance.writeFile('./test1.txt', 'data1');
      await instance.writeFile('./test2.txt', 'data2');
      expect(emittedStats).toBeNull(); // Not yet reached threshold
      
      await instance.readFile('./test1.txt'); // This should trigger emission
      
      expect(emittedStats).not.toBeNull();
  
    });

    it('should reset stats after emission', async () => {
      const { instance, eventEmitter } = createAnalyticsFileSystem(memFs, { emitOn: 2 });
      
      eventEmitter.subscribe('analytics.stats', {
        update() {
          // Event received
        }
      });
      
      // Trigger first emission
      await instance.writeFile('./test1.txt', 'data1');
      await instance.writeFile('./test2.txt', 'data2');
      
      // Stats should be reset
      const statsAfterEmission = instance.getStats();
      expect(statsAfterEmission.stats.read).toBe(0);
      expect(statsAfterEmission.stats.write).toBe(0);
      expect(statsAfterEmission.stats.delete).toBe(0);
      expect(statsAfterEmission.fileReads).toHaveLength(0);
      
      // Next operations should start fresh
      await instance.readFile('./test1.txt');
      const newStats = instance.getStats();
      expect(newStats.stats.read).toBe(1);
      expect(newStats.fileReads).toHaveLength(1);
    });

    it('should use default threshold of 100', async () => {
      let emissionCount = 0;
      const { instance, eventEmitter } = createAnalyticsFileSystem(memFs);
      
      eventEmitter.subscribe('analytics.stats', {
        update() {
          emissionCount++;
        }
      });
      
      // Perform 99 operations - should not emit
      for (let i = 0; i < 99; i++) {
        await instance.writeFile(`./test${i}.txt`, 'data');
      }
      expect(emissionCount).toBe(0);
      
      // 100th operation should trigger emission
      await instance.writeFile('./test99.txt', 'data');
      expect(emissionCount).toBe(1);
    });
  });

  describe('factory function', () => {
    it('should create instance with event emitter access', async () => {
      const { instance, eventEmitter } = createAnalyticsFileSystem(memFs, { emitOn: 1 });
      
      expect(instance).toBeInstanceOf(AnalyticsFileSystem);
      expect(eventEmitter).toBe(instance.getEventEmitter());
      
      let eventReceived = false;
      eventEmitter.subscribe('analytics.stats', {
        update() {
          eventReceived = true;
        }
      });
      
      await instance.writeFile('./test.txt', 'data');
      expect(eventReceived).toBe(true);
    });
  });

  describe('filesystem delegation', () => {
    it('should delegate all operations to base filesystem', async () => {
      // Write through analytics fs
      await analyticsFs.writeFile('./test.txt', 'Hello World');
      
      // Read directly from base fs
      expect(await memFs.readFile('./test.txt')).toBe('Hello World');
      
      // Read through analytics fs
      expect(await analyticsFs.readFile('./test.txt')).toBe('Hello World');
      
      // Delete through analytics fs
      await analyticsFs.deleteFile('./test.txt');
      
      // Verify deleted in base fs
      expect(await memFs.exists('./test.txt')).toBe(false);
    });

    it('should expose event emitter directly', () => {
      const eventEmitter = analyticsFs.getEventEmitter();
      expect(eventEmitter).toBeDefined();
      expect(typeof eventEmitter.subscribe).toBe('function');
      expect(typeof eventEmitter.emit).toBe('function');
    });
  });
});
