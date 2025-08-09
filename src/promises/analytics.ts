import { type Event, EventEmitter } from "@synet/patterns";
import type { IAsyncFileSystem } from "./async-filesystem.interface";

/**
 * File operation types for analytics tracking
 */
export type FileAction = "read" | "write" | "delete";

/**
 * Individual file access record
 */
export interface FileAccess {
  file: string;
  timestamp: string; // ISO string
  access: FileAction;
}

/**
 * Analytics statistics summary
 */
export interface Stats {
  stats: {
    read: number;
    write: number;
    delete: number;
  };
  fileReads: FileAccess[];
}

/**
 * Configuration options for AnalyticsFileSystem
 */
export interface AnalyticsFileSystemOptions {
  /**
   * Number of operations before emitting stats event
   * @default 100
   */
  emitOn?: number;
}

/**
 * Event emitted when analytics threshold is reached
 */
export interface AnalyticsStatsEvent extends Event {
  type: "analytics.stats";
  data: Stats;
}

/**
 * Analytics filesystem that tracks filesystem operations and provides usage statistics
 * Wraps any IAsyncFileSystem implementation to provide analytics capabilities
 */
export class AnalyticsFileSystem implements IAsyncFileSystem {
  private eventEmitter: EventEmitter<AnalyticsStatsEvent>;
  private stats: Stats = {
    stats: { read: 0, write: 0, delete: 0 },
    fileReads: [],
  };
  private operationCount = 0;
  private readonly emitThreshold: number;

  constructor(
    private baseFileSystem: IAsyncFileSystem,
    private options: AnalyticsFileSystemOptions = {},
  ) {
    this.eventEmitter = new EventEmitter<AnalyticsStatsEvent>();
    this.emitThreshold = options.emitOn ?? 100;
  }

  /**
   * Get current analytics statistics
   */
  getStats(): Stats {
    return {
      stats: { ...this.stats.stats },
      fileReads: [...this.stats.fileReads],
    };
  }

  /**
   * Get the event emitter for analytics events
   */
  getEventEmitter(): EventEmitter<AnalyticsStatsEvent> {
    return this.eventEmitter;
  }

  /**
   * Record a file operation and check if stats should be emitted
   */
  private recordOperation(file: string, action: FileAction): void {
    // Update counters
    this.stats.stats[action]++;

    // Record file access
    this.stats.fileReads.push({
      file,
      timestamp: new Date().toISOString(),
      access: action,
    });

    this.operationCount++;

    // Emit stats if threshold reached
    if (this.operationCount >= this.emitThreshold) {
      this.emitStats();
    }
  }

  /**
   * Emit current stats and reset counters
   */
  private emitStats(): void {
    const currentStats = this.getStats();

    this.eventEmitter.emit({
      type: "analytics.stats",
      data: currentStats,
    });

    // Reset analytics data
    this.stats = {
      stats: { read: 0, write: 0, delete: 0 },
      fileReads: [],
    };
    this.operationCount = 0;
  }

  // IAsyncFileSystem implementation with analytics tracking

  async exists(path: string): Promise<boolean> {
    const result = await this.baseFileSystem.exists(path);
    // Note: exists operations are not tracked as read operations
    // as they don't actually read file content
    return result;
  }

  async readFile(path: string): Promise<string> {
    const result = await this.baseFileSystem.readFile(path);
    this.recordOperation(path, "read");
    return result;
  }

  async writeFile(path: string, data: string): Promise<void> {
    await this.baseFileSystem.writeFile(path, data);
    this.recordOperation(path, "write");
  }

  async deleteFile(path: string): Promise<void> {
    await this.baseFileSystem.deleteFile(path);
    this.recordOperation(path, "delete");
  }

  async deleteDir(path: string): Promise<void> {
    await this.baseFileSystem.deleteDir(path);
    // Directory operations are not tracked individually
    // Could be extended if needed
  }

  async readDir(dirPath: string): Promise<string[]> {
    const result = await this.baseFileSystem.readDir(dirPath);
    // Directory reads could be tracked if needed
    return result;
  }

  async ensureDir(path: string): Promise<void> {
    await this.baseFileSystem.ensureDir(path);
    // Directory operations are not tracked individually
  }

  async chmod(path: string, mode: number): Promise<void> {
    await this.baseFileSystem.chmod(path, mode);
    // Permission changes are not tracked as file operations
  }

  async clear?(dirPath: string): Promise<void> {
    if (this.baseFileSystem.clear) {
      await this.baseFileSystem.clear(dirPath);
    }
  }
}

/**
 * Factory function to create async AnalyticsFileSystem with easy access to event emitter
 * @param baseFileSystem The underlying filesystem implementation
 * @param options Configuration options
 * @returns Object containing the analytics filesystem instance and event emitter
 */
export function createAnalyticsFileSystem(
  baseFileSystem: IAsyncFileSystem,
  options: AnalyticsFileSystemOptions = {},
): {
  instance: AnalyticsFileSystem;
  eventEmitter: EventEmitter<AnalyticsStatsEvent>;
} {
  const instance = new AnalyticsFileSystem(baseFileSystem, options);

  return {
    instance,
    eventEmitter: instance.getEventEmitter(),
  };
}
