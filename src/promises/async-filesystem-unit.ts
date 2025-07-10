/**
 * Async Filesystem Unit - Pure Asynchronous Operations
 *
 * This unit provides asynchronous filesystem operations with direct method access.
 * No async/sync mixing, no runtime type checks, no zalgo.
 */

import type { IAsyncFileSystem } from "./filesystem.interface";

import { GitHubFileSystem, type GitHubFileSystemOptions } from "./github";
import { MemFileSystem } from "./memory";
import { NodeFileSystem } from "./node";
import { S3FileSystem, type S3FileSystemOptions } from "./s3";

/**
 * Supported async filesystem backend types
 */
export type AsyncFilesystemBackendType = "node" | "memory" | "github" | "s3";

/**
 * Options for different async filesystem backends
 */
export type AsyncFilesystemBackendOptions = {
  node: Record<string, never>;
  memory: Record<string, never>;
  github: GitHubFileSystemOptions;
  s3: S3FileSystemOptions;
};

/**
 * Async filesystem creation configuration
 */
export interface AsyncFilesystemConfig<
  T extends AsyncFilesystemBackendType = AsyncFilesystemBackendType,
> {
  type: T;
  options?: AsyncFilesystemBackendOptions[T];
}

/**
 * Async Filesystem Unit state
 */
export interface AsyncFileSystemState {
  backend: IAsyncFileSystem;
  config: AsyncFilesystemConfig;
  operations: {
    reads: number;
    writes: number;
    errors: number;
  };
}

/**
 * Async Filesystem Unit - Pure asynchronous filesystem operations
 */
export class AsyncFileSystem implements IAsyncFileSystem {
  private state: AsyncFileSystemState;

  private constructor(state: AsyncFileSystemState) {
    this.state = state;
  }

  /**
   * CREATE - Create a new async Filesystem Unit
   */
  static create<T extends AsyncFilesystemBackendType>(
    config: AsyncFilesystemConfig<T>,
  ): AsyncFileSystem {
    const backend = AsyncFileSystem.createBackend(config);

    const state: AsyncFileSystemState = {
      backend,
      config,
      operations: {
        reads: 0,
        writes: 0,
        errors: 0,
      },
    };

    return new AsyncFileSystem(state);
  }

  // ==========================================
  // NATIVE FILESYSTEM METHODS (ASYNC)
  // ==========================================

  /**
   * Read file content asynchronously
   */
  async readFile(path: string): Promise<string> {
    try {
      this.state.operations.reads++;
      return await this.state.backend.readFile(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Write file content asynchronously
   */
  async writeFile(path: string, data: string): Promise<void> {
    try {
      this.state.operations.writes++;
      await this.state.backend.writeFile(path, data);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Check if file/directory exists asynchronously
   */
  async exists(path: string): Promise<boolean> {
    try {
      return await this.state.backend.exists(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Delete file asynchronously
   */
  async deleteFile(path: string): Promise<void> {
    try {
      await this.state.backend.deleteFile(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Read directory contents asynchronously
   */
  async readDir(path: string): Promise<string[]> {
    try {
      return await this.state.backend.readDir(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Ensure directory exists asynchronously
   */
  async ensureDir(path: string): Promise<void> {
    try {
      await this.state.backend.ensureDir(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Delete directory asynchronously
   */
  async deleteDir(path: string): Promise<void> {
    try {
      await this.state.backend.deleteDir(path);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Set file permissions asynchronously
   */
  async chmod(path: string, mode: number): Promise<void> {
    try {
      await this.state.backend.chmod(path, mode);
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Get file statistics asynchronously
   */
  async stat(path: string): Promise<import("./filesystem.interface").FileStats> {
    try {
      const result = await this.state.backend.stat?.(path);
      if (!result) {
        throw new Error(`stat method not available on ${this.state.config.type} backend`);
      }
      return result;
    } catch (error) {
      this.state.operations.errors++;
      throw error;
    }
  }

  /**
   * Clear directory contents asynchronously
   */
  async clear(dirPath: string): Promise<void> {
    try {
      if (!this.state.backend.clear) {
        throw new Error(`clear method not available on ${this.state.config.type} backend`);
      }
      await this.state.backend.clear(dirPath);
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
      
      // Wrapped methods for teaching pattern (optional usage)
      readFile: (path: string) => this.readFile(path),
      writeFile: (path: string, data: string) => this.writeFile(path, data),
      exists: (path: string) => this.exists(path),
      deleteFile: (path: string) => this.deleteFile(path),
      readDir: (path: string) => this.readDir(path),
      ensureDir: (path: string) => this.ensureDir(path),
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
  getBackend(): IAsyncFileSystem {
    return this.state.backend;
  }

  /**
   * Switch to a new backend configuration
   */
  switchBackend<T extends AsyncFilesystemBackendType>(
    config: AsyncFilesystemConfig<T>,
  ): void {
    const newBackend = AsyncFileSystem.createBackend(config);
    this.state.backend = newBackend;
    this.state.config = config;
    // Reset stats when switching backends
    this.state.operations = { reads: 0, writes: 0, errors: 0 };
  }

  /**
   * Create a specific async filesystem backend
   */
  private static createBackend<T extends AsyncFilesystemBackendType>(
    config: AsyncFilesystemConfig<T>,
  ): IAsyncFileSystem {
    const { type, options } = config;

    switch (type) {
      case "node":
        return new NodeFileSystem();

      case "memory":
        return new MemFileSystem();

      case "github": {
        const githubOptions = options as AsyncFilesystemBackendOptions["github"];
        if (!githubOptions) {
          throw new Error("GitHub filesystem requires options");
        }
        return new GitHubFileSystem(githubOptions);
      }

      case "s3": {
        const s3Options = options as AsyncFilesystemBackendOptions["s3"];
        if (!s3Options) {
          throw new Error("S3 filesystem requires options");
        }
        return new S3FileSystem(s3Options);
      }

      default:
        throw new Error(`Unsupported async filesystem backend: ${type}`);
    }
  }

  isAsync(): boolean {
    return true; // This unit is always async
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
