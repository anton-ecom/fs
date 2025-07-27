import { type Event, EventEmitter } from "@synet/patterns";
import type { IFileSystem } from "./filesystem.interface";

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
 * Wraps any IFileSystem implementation to provide analytics capabilities
 */
export class AnalyticsFileSystem implements IFileSystem {
  private eventEmitter: EventEmitter<AnalyticsStatsEvent>;
  private stats: Stats = {
    stats: { read: 0, write: 0, delete: 0 },
    fileReads: [],
  };
  private operationCount = 0;
  private readonly emitThreshold: number;

  constructor(
    private baseFileSystem: IFileSystem,
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

  // IFileSystem implementation with analytics tracking

  existsSync(path: string): boolean {
    const result = this.baseFileSystem.existsSync(path);
    // Note: exists operations are not tracked as read operations
    // as they don't actually read file content
    return result;
  }

  readFileSync(path: string): string {
    const result = this.baseFileSystem.readFileSync(path);
    this.recordOperation(path, "read");
    return result;
  }

  writeFileSync(path: string, data: string): void {
    this.baseFileSystem.writeFileSync(path, data);
    this.recordOperation(path, "write");
  }

  deleteFileSync(path: string): void {
    this.baseFileSystem.deleteFileSync(path);
    this.recordOperation(path, "delete");
  }

  deleteDirSync(path: string): void {
    this.baseFileSystem.deleteDirSync(path);
    // Directory operations are not tracked individually
    // Could be extended if needed
  }

  readDirSync(dirPath: string): string[] {
    const result = this.baseFileSystem.readDirSync(dirPath);
    // Directory reads could be tracked if needed
    return result;
  }

  ensureDirSync(path: string): void {
    this.baseFileSystem.ensureDirSync(path);
    // Directory operations are not tracked individually
  }

  chmodSync(path: string, mode: number): void {
    this.baseFileSystem.chmodSync(path, mode);
    // Permission changes are not tracked as file operations
  }

  clear?(dirPath: string): void {
    if (this.baseFileSystem.clear) {
      this.baseFileSystem.clear(dirPath);
    }
  }
}

/**
 * Factory function to create AnalyticsFileSystem with easy access to event emitter
 * @param baseFileSystem The underlying filesystem implementation
 * @param options Configuration options
 * @returns Object containing the analytics filesystem instance and event emitter
 */
export function createAnalyticsFileSystem(
  baseFileSystem: IFileSystem,
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
