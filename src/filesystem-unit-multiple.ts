/**
 * Filesystem Unit - A Unit Architecture implementation for orchestrating filesystem backends
 *
 * This unit can CREATE any supported filesystem backend, EXECUTE filesystem operations,
 * TEACH filesystem capabilities to other units, and LEARN new filesystem patterns.
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
 * Filesystem Unit creation input
 */
export interface FilesystemUnitInput {
  backends: FilesystemConfig[];
  primary?: FilesystemBackendType;
  fallbacks?: FilesystemBackendType[];
}

/**
 * Filesystem Unit state
 */
export interface FilesystemUnitState {
  backends: Map<FilesystemBackendType, IFileSystem | IAsyncFileSystem>;
  primary: FilesystemBackendType;
  fallbacks: FilesystemBackendType[];
  operations: {
    reads: number;
    writes: number;
    errors: number;
  };
}

/**
 * Filesystem Unit - Core Unit for orchestrating filesystem operations
 */
export class FilesystemUnit {
  private state: FilesystemUnitState;

  private constructor(state: FilesystemUnitState) {
    this.state = state;
  }

  /**
   * CREATE - Create a new Filesystem Unit with configured backends
   */
  static create(input: FilesystemUnitInput): FilesystemUnit {
    const backends = new Map<
      FilesystemBackendType,
      IFileSystem | IAsyncFileSystem
    >();

    // Create each configured backend
    for (const config of input.backends) {
      const backend = FilesystemUnit.createBackend(config);
      backends.set(config.type, backend);
    }

    // Determine primary backend
    const primary = input.primary || input.backends[0]?.type;
    if (!primary) {
      throw new Error("At least one backend must be configured");
    }

    // Validate primary backend exists
    if (!backends.has(primary)) {
      throw new Error(
        `Primary backend '${primary}' not found in configured backends`,
      );
    }

    // Validate fallback backends exist
    const fallbacks = input.fallbacks || [];
    for (const fallback of fallbacks) {
      if (!backends.has(fallback)) {
        throw new Error(
          `Fallback backend '${fallback}' not found in configured backends`,
        );
      }
    }

    const state: FilesystemUnitState = {
      backends,
      primary,
      fallbacks,
      operations: {
        reads: 0,
        writes: 0,
        errors: 0,
      },
    };

    return new FilesystemUnit(state);
  }

  /**
   * EXECUTE - Execute filesystem operations with fallback support
   */
  async execute<T>(
    operation: (fs: IFileSystem | IAsyncFileSystem) => T | Promise<T>,
  ): Promise<T> {
    const backendOrder = [this.state.primary, ...this.state.fallbacks];
    let lastError: Error | undefined;

    for (const backendType of backendOrder) {
      const backend = this.state.backends.get(backendType);
      if (!backend) continue;

      try {
        const result = await operation(backend);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.state.operations.errors++;
        console.warn(`Filesystem operation failed on ${backendType}:`, error);
      }
    }

    throw lastError || new Error("All filesystem backends failed");
  }

  /**
   * TEACH - Provide filesystem capabilities to other units
   */
  teach() {
    return {
      // Sync methods
      readFile: (path: string): Promise<string> =>
        this.execute((fs) =>
          this.isAsync(fs) ? fs.readFile(path) : fs.readFileSync(path),
        ),

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
      getBackends: () => Array.from(this.state.backends.keys()),
      getPrimary: () => this.state.primary,
      getFallbacks: () => [...this.state.fallbacks],
    };
  }

  /**
   * LEARN - Observe and learn from filesystem usage patterns
   */
  learn() {
    return {
      // TODO Usage analytics
      getMostUsedBackend: () => {
        return this.state.primary;
      },

      getErrorPatterns: () => {
        // In a real implementation, analyze error patterns
        return {
          totalErrors: this.state.operations.errors,
          suggestion:
            this.state.operations.errors > 10
              ? "Consider adjusting fallback strategy"
              : "System running smoothly",
        };
      },

      optimizeBackendOrder: () => {
        // In a real implementation, reorder backends based on performance
        console.log("Learning from filesystem usage patterns...");
        return this.state.fallbacks;
      },
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
   * Get direct access to a specific backend (escape hatch)
   */
  getBackend<T extends IFileSystem | IAsyncFileSystem>(
    type: FilesystemBackendType,
  ): T | undefined {
    return this.state.backends.get(type) as T;
  }

  /**
   * Add a new backend at runtime
   */
  addBackend(config: FilesystemConfig): void {
    const backend = FilesystemUnit.createBackend(config);
    this.state.backends.set(config.type, backend);
  }

  /**
   * Switch primary backend
   */
  setPrimary(type: FilesystemBackendType): void {
    if (!this.state.backends.has(type)) {
      throw new Error(`Backend '${type}' not found`);
    }
    this.state.primary = type;
  }
}

/**
 * Convenience factory for common filesystem configurations
 */
export const FilesystemUnits = {
  /**
   * Local development setup: Memory primary, Node fallback
   */
  development: () =>
    FilesystemUnit.create({
      backends: [{ type: "memory" }, { type: "node" }],
      primary: "memory",
      fallbacks: ["node"],
    }),

  /**
   * Production setup: S3 primary, Node fallback
   */
  production: (s3Options: S3FileSystemOptions) =>
    FilesystemUnit.create({
      backends: [{ type: "s3", options: s3Options }, { type: "node" }],
      primary: "s3",
      fallbacks: ["node"],
    }),

  /**
   * GitHub-backed configuration storage
   */
  github: (githubOptions: GitHubFileSystemOptions) =>
    FilesystemUnit.create({
      backends: [
        { type: "github", options: githubOptions },
        { type: "memory" },
      ],
      primary: "github",
      fallbacks: ["memory"],
    }),

  /**
   * Multi-tier setup: Memory cache, S3 storage, Node backup
   */
  multiTier: (s3Options: S3FileSystemOptions) =>
    FilesystemUnit.create({
      backends: [
        { type: "memory" },
        { type: "s3", options: s3Options },
        { type: "node" },
      ],
      primary: "memory",
      fallbacks: ["s3", "node"],
    }),
};
