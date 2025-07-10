/**
 * Simplified Filesystem Unit - Single Backend Architecture
 *
 * This unit can CREATE any supported filesystem backend, EXECUTE filesystem operations,
 * TEACH filesystem capabilities to other units, and LEARN new filesystem patterns.
 *
 * Simplified version: One backend at a time, dynamically chosen.
 */

import type { IFileSystem } from "./filesystem.interface";
import type { IAsyncFileSystem } from "./promises/filesystem.interface";

import { GitHubFileSystem, type GitHubFileSystemOptions } from "./github";
import { MemFileSystem } from "./memory";
// Import all sync backends
import { NodeFileSystem } from "./node";
import { S3FileSystem, type S3FileSystemOptions } from "./s3";

import { GitHubFileSystem as AsyncGitHubFileSystem } from "./promises/github";
import { MemFileSystem as AsyncMemFileSystem } from "./promises/memory";
// Import all async backends
import { NodeFileSystem as AsyncNodeFileSystem } from "./promises/node";
import { S3FileSystem as AsyncS3FileSystem } from "./promises/s3";

/**
 * Supported filesystem backend types
 */
export type FilesystemBackendType = "node" | "memory" | "github" | "s3";

/**
 * Options for different filesystem backends
 */
export type FilesystemBackendOptions = {
  node: Record<string, never>;
  memory: Record<string, never>;
  github: GitHubFileSystemOptions;
  s3: S3FileSystemOptions;
};

/**
 * Filesystem creation configuration
 */
export interface FilesystemConfig<
  T extends FilesystemBackendType = FilesystemBackendType,
> {
  type: T;
  options?: FilesystemBackendOptions[T];
  async?: boolean;
}

/**
 * Filesystem Unit state
 */
export interface FilesystemUnitState {
  backend: IFileSystem | IAsyncFileSystem;
  config: FilesystemConfig;
  operations: {
    reads: number;
    writes: number;
    errors: number;
  };
}

/**
 * Simplified Filesystem Unit - Core Unit for filesystem operations with a single backend
 */
export class FilesystemUnit {
  private state: FilesystemUnitState;

  private constructor(state: FilesystemUnitState) {
    this.state = state;
  }

  /**
   * CREATE - Create a new Filesystem Unit with a single backend
   */
  static create<T extends FilesystemBackendType>(
    config: FilesystemConfig<T>,
  ): FilesystemUnit {
    const backend = FilesystemUnit.createBackend(config);

    const state: FilesystemUnitState = {
      backend,
      config,
      operations: {
        reads: 0,
        writes: 0,
        errors: 0,
      },
    };

    return new FilesystemUnit(state);
  }

  /**
   * EXECUTE - Execute filesystem operations with error tracking
   */
  async execute<T>(
    operation: (fs: IFileSystem | IAsyncFileSystem) => T | Promise<T>,
  ): Promise<T> {
    try {
      const result = await operation(this.state.backend);
      return result;
    } catch (error) {
      this.state.operations.errors++;
      console.warn(
        `Filesystem operation failed on ${this.state.config.type}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * TEACH - Provide filesystem capabilities to other units
   */
  teach() {
    return {
      // Core filesystem methods
      readFile: (path: string): Promise<string> =>
        this.execute((fs) => {
          this.state.operations.reads++;
          return this.isAsync(fs) ? fs.readFile(path) : fs.readFileSync(path);
        }),

      writeFile: (path: string, data: string): Promise<void> =>
        this.execute((fs) => {
          this.state.operations.writes++;
          return this.isAsync(fs)
            ? fs.writeFile(path, data)
            : fs.writeFileSync(path, data);
        }),

      exists: (path: string): Promise<boolean> =>
        this.execute((fs) =>
          this.isAsync(fs) ? fs.exists(path) : fs.existsSync(path),
        ),

      deleteFile: (path: string): Promise<void> =>
        this.execute((fs) =>
          this.isAsync(fs) ? fs.deleteFile(path) : fs.deleteFileSync(path),
        ),

      readDir: (path: string): Promise<string[]> =>
        this.execute((fs) =>
          this.isAsync(fs) ? fs.readDir(path) : fs.readDirSync(path),
        ),

      ensureDir: (path: string): Promise<void> =>
        this.execute((fs) =>
          this.isAsync(fs) ? fs.ensureDir(path) : fs.ensureDirSync(path),
        ),

      // Unit-specific methods
      getStats: () => ({ ...this.state.operations }),
      getBackendType: () => this.state.config.type,
      getConfig: () => ({ ...this.state.config }),
      isAsync: () => this.isAsync(this.state.backend),
    };
  }

  /**
   * LEARN - Observe and learn from filesystem usage patterns
   */
  learn() {
    return {
      // Usage analytics
      getUsagePattern: () => ({
        backendType: this.state.config.type,
        totalOperations:
          this.state.operations.reads + this.state.operations.writes,
        readWriteRatio:
          this.state.operations.writes > 0
            ? this.state.operations.reads / this.state.operations.writes
            : this.state.operations.reads,
        errorRate:
          this.state.operations.errors /
            (this.state.operations.reads + this.state.operations.writes) || 0,
      }),

      getErrorPatterns: () => ({
        totalErrors: this.state.operations.errors,
        suggestion:
          this.state.operations.errors > 10
            ? `Consider switching from ${this.state.config.type} backend`
            : "System running smoothly",
        backendType: this.state.config.type,
      }),

      getPerformanceInsights: () => ({
        backendType: this.state.config.type,
        isAsync: this.isAsync(this.state.backend),
        recommendation: this.isAsync(this.state.backend)
          ? "Using async backend - good for I/O intensive operations"
          : "Using sync backend - good for simple operations",
      }),
    };
  }

  /**
   * Create a specific filesystem backend
   */
  private static createBackend<T extends FilesystemBackendType>(
    config: FilesystemConfig<T>,
  ): IFileSystem | IAsyncFileSystem {
    const { type, options, async = false } = config;

    switch (type) {
      case "node":
        return async ? new AsyncNodeFileSystem() : new NodeFileSystem();

      case "memory":
        return async ? new AsyncMemFileSystem() : new MemFileSystem();

      case "github": {
        const githubOptions = options as FilesystemBackendOptions["github"];
        if (!githubOptions) {
          throw new Error("GitHub filesystem requires options");
        }
        return async
          ? new AsyncGitHubFileSystem(githubOptions)
          : new GitHubFileSystem(githubOptions);
      }

      case "s3": {
        const s3Options = options as FilesystemBackendOptions["s3"];
        if (!s3Options) {
          throw new Error("S3 filesystem requires options");
        }
        return async
          ? new AsyncS3FileSystem(s3Options)
          : new S3FileSystem(s3Options);
      }

      default:
        throw new Error(`Unsupported filesystem backend: ${type}`);
    }
  }

  /**
   * Type guard to check if filesystem is async
   */
  private isAsync(fs: IFileSystem | IAsyncFileSystem): fs is IAsyncFileSystem {
    return (
      "readFile" in fs &&
      typeof (fs as IAsyncFileSystem).readFile === "function"
    );
  }

  /**
   * Get direct access to the backend (escape hatch)
   */
  getBackend<T extends IFileSystem | IAsyncFileSystem>(): T {
    return this.state.backend as T;
  }

  /**
   * Switch to a new backend configuration
   */
  switchBackend<T extends FilesystemBackendType>(
    config: FilesystemConfig<T>,
  ): void {
    const newBackend = FilesystemUnit.createBackend(config);
    this.state.backend = newBackend;
    this.state.config = config;
    // Reset stats when switching backends
    this.state.operations = { reads: 0, writes: 0, errors: 0 };
  }
}

/**
 * Convenience factory for common filesystem configurations
 */
export const FilesystemUnits = {
  /**
   * Local development: Memory storage
   */
  memory: (async = false) =>
    FilesystemUnit.create({
      type: "memory",
      async,
    }),

  /**
   * Local filesystem storage
   */
  node: (async = false) =>
    FilesystemUnit.create({
      type: "node",
      async,
    }),

  /**
   * GitHub-backed storage
   */
  github: (options: GitHubFileSystemOptions, async = false) =>
    FilesystemUnit.create({
      type: "github",
      options,
      async,
    }),

  /**
   * S3 cloud storage
   */
  s3: (options: S3FileSystemOptions, async = true) =>
    FilesystemUnit.create({
      type: "s3",
      options,
      async,
    }),

  /**
   * Development setup: Memory storage (fast for testing)
   */
  development: () =>
    FilesystemUnit.create({
      type: "memory",
    }),

  /**
   * Production setup: S3 storage
   */
  production: (s3Options: S3FileSystemOptions) =>
    FilesystemUnit.create({
      type: "s3",
      options: s3Options,
      async: true,
    }),
};
