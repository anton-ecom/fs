/**
 * Sync Filesystem Unit - Pure Synchronous Operations
 *
 * This unit provides synchronous filesystem operations with direct method access.
 * No async/sync mixing, no runtime type checks, no zalgo.
 */

import type { IFileSystem } from "./filesystem.interface";

import { GitHubFileSystem, type GitHubFileSystemOptions } from "./github";
import { MemFileSystem } from "./memory";
import { NodeFileSystem } from "./node";
import { S3FileSystem, type S3FileSystemOptions } from "./s3";

/**
 * Supported sync filesystem backend types
 */
export type SyncFilesystemBackendType = "node" | "memory" | "github" | "s3";

/**
 * Options for different sync filesystem backends
 */
export type SyncFilesystemBackendOptions = {
  node: Record<string, never>;
  memory: Record<string, never>;
  github: GitHubFileSystemOptions;
  s3: S3FileSystemOptions;
};

/**
 * Sync filesystem creation configuration
 */
export interface SyncFilesystemConfig<
  T extends SyncFilesystemBackendType = SyncFilesystemBackendType,
> {
  type: T;
  options?: SyncFilesystemBackendOptions[T];
}

/**
 * Sync Filesystem Unit state
 */
export interface SyncFileSystemState {
  backend: IFileSystem;
  config: SyncFilesystemConfig;
  operations: {
    reads: number;
    writes: number;
    errors: number;
  };
}

/**
 * Sync Filesystem Unit - Pure synchronous filesystem operations
 */
export class FileSystem implements IFileSystem {
  private state: SyncFileSystemState;

  private constructor(state: SyncFileSystemState) {
    this.state = state;
  }

  /**
   * CREATE - Create a new sync Filesystem Unit
   */
  static create<T extends SyncFilesystemBackendType>(
    config: SyncFilesystemConfig<T>,
  ): FileSystem {
    const backend = FileSystem.createBackend(config);

    const state: SyncFileSystemState = {
      backend,
      config,
      operations: {
        reads: 0,
        writes: 0,
        errors: 0,
      },
    };

    return new FileSystem(state);
  }

  // ==========================================
  // NATIVE FILESYSTEM METHODS (with Sync suffix)
  // ==========================================

  /**
   * Read file content synchronously
   */
  readFileSync(path: string): string {
    try {
      this.state.operations.reads++;
      return this.state.backend.readFileSync(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Write file content synchronously
   */
  writeFileSync(path: string, data: string): void {
    try {
      this.state.operations.writes++;
      this.state.backend.writeFileSync(path, data);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Check if file/directory exists synchronously
   */
  existsSync(path: string): boolean {
    try {
      return this.state.backend.existsSync(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Delete file synchronously
   */
  deleteFileSync(path: string): void {
    try {
      this.state.backend.deleteFileSync(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Read directory contents synchronously
   */
  readDirSync(path: string): string[] {
    try {
      return this.state.backend.readDirSync(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Ensure directory exists synchronously
   */
  ensureDirSync(path: string): void {
    try {
      this.state.backend.ensureDirSync(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Delete directory synchronously
   */
  deleteDirSync(path: string): void {
    try {
      this.state.backend.deleteDirSync(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Set file permissions synchronously
   */
  chmodSync(path: string, mode: number): void {
    try {
      this.state.backend.chmodSync(path, mode);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Get file statistics synchronously
   */
  statSync(path: string): import("./filesystem.interface").FileStats {
    try {
      const result = this.state.backend.statSync?.(path);
      if (!result) {
        throw new Error(`statSync method not available on ${this.state.config.type} backend`);
      }
      return result;
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Clear directory contents synchronously
   */
  clear(dirPath: string): void {
    try {
      if (!this.state.backend.clear) {
        throw new Error(`clear method not available on ${this.state.config.type} backend`);
      }
      this.state.backend.clear(dirPath);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  // ==========================================
  // UNIT CAPABILITIES (for advanced features)
  // ==========================================

  /**
   * TEACH - Provide filesystem capabilities to other units
   */
  teach() {
    return {
      // Unit-specific methods for advanced use cases
      getStats: () => ({ ...this.state.operations }),
      getBackendType: () => this.state.config.type,
      getConfig: () => ({ ...this.state.config }),
      
      // Filesystem methods with Sync suffix (matches IFileSystem interface)
      existsSync: (path: string) => this.existsSync(path),
      readFileSync: (path: string) => this.readFileSync(path),
      writeFileSync: (path: string, data: string) => this.writeFileSync(path, data),
      deleteFileSync: (path: string) => this.deleteFileSync(path),
      deleteDirSync: (path: string) => this.deleteDirSync(path),
      readDirSync: (path: string) => this.readDirSync(path),
      ensureDirSync: (path: string) => this.ensureDirSync(path),
      chmodSync: (path: string, mode: number) => this.chmodSync(path, mode),
      statSync: (path: string) => this.statSync(path),
      clear: (dirPath: string) => this.clear(dirPath),
    };
  }

  // ==========================================
  // UNIT METADATA & UTILITIES
  // ==========================================

  /**
   * Get operation statistics
   */
  getStats() {
    return { ...this.state.operations };
  }

  /**
   * Get backend type
   */
  getBackendType() {
    return this.state.config.type;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.state.config };
  }

  /**
   * Get direct access to the backend (escape hatch)
   */
  getBackend(): IFileSystem {
    return this.state.backend;
  }

  /**
   * Switch to a new backend configuration
   */
  switchBackend<T extends SyncFilesystemBackendType>(
    config: SyncFilesystemConfig<T>,
  ): void {
    const newBackend = FileSystem.createBackend(config);
    this.state.backend = newBackend;
    this.state.config = config;
    // Reset stats when switching backends
    this.state.operations = { reads: 0, writes: 0, errors: 0 };
  }

  /**
   * Create a specific sync filesystem backend
   */
  private static createBackend<T extends SyncFilesystemBackendType>(
    config: SyncFilesystemConfig<T>,
  ): IFileSystem {
    const { type, options } = config;

    switch (type) {
      case "node":
        return new NodeFileSystem();

      case "memory":
        return new MemFileSystem();

      case "github": {
        const githubOptions = options as SyncFilesystemBackendOptions["github"];
        if (!githubOptions) {
          throw new Error("GitHub filesystem requires options");
        }
        return new GitHubFileSystem(githubOptions);
      }

      case "s3": {
        const s3Options = options as SyncFilesystemBackendOptions["s3"];
        if (!s3Options) {
          throw new Error("S3 filesystem requires options");
        }
        return new S3FileSystem(s3Options);
      }

      default:
        throw new Error(`Unsupported sync filesystem backend: ${type}`);
    }
  }

  isAsync(): boolean {
    return false; // This unit is always sync
  }

   
  getUsagePattern() {
        return {
        reads: this.state.operations.reads,
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
        }      
    }

    getErrorPatterns() {
      return {
        totalErrors: this.state.operations.errors,
        suggestion:
          this.state.operations.errors > 10
            ? `Consider switching from ${this.state.config.type} backend`
            : "System running smoothly",
        backendType: this.state.config.type,
      };
    }

      getPerformanceInsights() {
        return {
          backendType: this.state.config.type,
          isAsync: this.isAsync(),
          recommendation:
            this.state.operations.reads + this.state.operations.writes > 1000
              ? "Consider optimizing your filesystem usage"
              : "System performing well",
      };
    }

}
