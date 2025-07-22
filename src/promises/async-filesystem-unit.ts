/**
 * Async Filesystem Unit - Pure Asynchronous Operations
 *
 * This unit provides asynchronous filesystem operations with direct method access.
 * No async/sync mixing, no runtime type checks, no zalgo.
 */

import type { IAsyncFileSystem, FileStats } from "./filesystem.interface";
import { Unit, UnitSchema, createUnitSchema, type TeachingContract, type UnitProps } from '@synet/unit';

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
 * Async Filesystem Unit properties following Unit Architecture
 */
interface AsyncFileSystemProps extends UnitProps {
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
export class AsyncFileSystem extends Unit<AsyncFileSystemProps> implements IAsyncFileSystem {

  protected constructor(props: AsyncFileSystemProps) {
    super(props);
  }

  /**
   * CREATE - Create a new async Filesystem Unit
   */
  static create<T extends AsyncFilesystemBackendType>(
    config: AsyncFilesystemConfig<T>,
  ): AsyncFileSystem {
    const backend = AsyncFileSystem.createBackend(config);

    const props: AsyncFileSystemProps = {
      dna: createUnitSchema({
        id: 'fs-async',
        version: '1.0.0'
      }),
      backend,
      config,
      operations: {
        reads: 0,
        writes: 0,
        errors: 0,
      },
      created: new Date()
    };

    return new AsyncFileSystem(props);
  }


  /**
   * Normalize path for backend compatibility

   */
  private normalizePath(path: string): string {
    // Memory backend requires absolute paths
    if (this.props.config.type === 'memory') {
      return path.startsWith('/') ? path : `/${path}`;
    }
    
    // Node, S3, GitHub handle paths natively
    return path;
  }

  // ==========================================
  // NATIVE FILESYSTEM METHODS (ASYNC)
  // ==========================================

  /**
   * Read file content asynchronously
   */
  async readFile(path: string): Promise<string> {

      const normalizedPath = this.normalizePath(path);
      return await this.props.backend.readFile(normalizedPath);

  }

  /**
   * Write file content asynchronously
   */
  async writeFile(path: string, data: string): Promise<void> {
    
      const normalizedPath = this.normalizePath(path);
      await this.props.backend.writeFile(normalizedPath, data);

  }

  /**
   * Check if file/directory exists asynchronously
   */
  async exists(path: string): Promise<boolean> {

      const normalizedPath = this.normalizePath(path);
      return await this.props.backend.exists(normalizedPath);
 
  }

  /**
   * Delete file asynchronously
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);
      await this.props.backend.deleteFile(normalizedPath);
    } catch (error) {
      this.props.operations.errors++;
      throw error;
    }
  }

  /**
   * Read directory contents asynchronously
   */
  async readDir(path: string): Promise<string[]> {
 
      const normalizedPath = this.normalizePath(path);
      return await this.props.backend.readDir(normalizedPath);
 
  }

  /**
   * Ensure directory exists asynchronously
   */
  async ensureDir(path: string): Promise<void> {
  
      const normalizedPath = this.normalizePath(path);
      await this.props.backend.ensureDir(normalizedPath);

  }

  /**
   * Delete directory asynchronously
   */
  async deleteDir(path: string): Promise<void> {
   
      const normalizedPath = this.normalizePath(path);
      await this.props.backend.deleteDir(normalizedPath);
 
  }

  /**
   * Set file permissions asynchronously
   */
  async chmod(path: string, mode: number): Promise<void> {
  
      const normalizedPath = this.normalizePath(path);
      await this.props.backend.chmod(normalizedPath, mode);
 
  }

  /**
   * Get file statistics asynchronously
   */
  async stat(path: string): Promise<FileStats> {
    
      const normalizedPath = this.normalizePath(path);
      const result = await this.props.backend.stat?.(normalizedPath);
      if (!result) {
        throw new Error(`stat method not available on ${this.props.config.type} backend`);
      }
      return result;
  
  }

  /**
   * Clear directory contents asynchronously
   */
  async clear(dirPath: string): Promise<void> {
   
      if (!this.props.backend.clear) {
        throw new Error(`clear method not available on ${this.props.config.type} backend`);
      }
      const normalizedPath = this.normalizePath(dirPath);
      await this.props.backend.clear(normalizedPath);
   
  }

  // ==========================================
  // UNIT CAPABILITIES (for advanced features)
  // ==========================================

  /**
   * TEACH - Provide filesystem capabilities to other units
   */
  teach(): TeachingContract {
    return {
      unitId: this.props.dna.id,
      capabilities: {
        readFile: (...args: unknown[]) => this.readFile(args[0] as string),
        writeFile: (...args: unknown[]) => this.writeFile(args[0] as string, args[1] as string),
        exists: (...args: unknown[]) => this.exists(args[0] as string),
        deleteFile: (...args: unknown[]) => this.deleteFile(args[0] as string),
        readDir: (...args: unknown[]) => this.readDir(args[0] as string),
        ensureDir: (...args: unknown[]) => this.ensureDir(args[0] as string),
        deleteDir: (...args: unknown[]) => this.deleteDir(args[0] as string),
        chmod: (...args: unknown[]) => this.chmod(args[0] as string, args[1] as number),
        stat: (...args: unknown[]) => this.stat(args[0] as string)
      }
    };
  }

  whoami(): string {
    return `AsyncFileSystem[${this.props.dna.id}]`;
  }

  capabilities(): string[] {
    return ['readFile', 'writeFile', 'exists', 'deleteFile', 'readDir', 'ensureDir', 'deleteDir', 'chmod', 'stat'];
  }

  help(): void {
    console.log(`
AsyncFileSystem Unit - Asynchronous filesystem operations

Capabilities:
  readFile - Read file contents
  writeFile - Write file data  
  exists - Check if file exists
  deleteFile - Delete file
  readDir - List directory contents
  ensureDir - Create directory if needed
  deleteDir - Remove directory
  chmod - Change file permissions
  stat - Get file statistics

Usage:
  const fs = AsyncFileSystem.create(config);
  const data = await fs.readFile('/path/to/file');
  
When learned by other units:
  await otherUnit.execute('${this.props.dna.id}.readFile', '/path/to/file');
`);
  }

  // ==========================================
  // UNIT METADATA & UTILITIES
  // ==========================================

  /**
   * Get operation statistics
   */
  getStats() {
    return { ...this.props.operations };
  }

  /**
   * Get backend type
   */
  getBackendType() {
    return this.props.config.type;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.props.config };
  }

  /**
   * Get direct access to the backend (escape hatch)
   */
  getBackend(): IAsyncFileSystem {
    return this.props.backend;
  }

  /**
   * Create a new AsyncFileSystem unit with different backend configuration
   * Unit Architecture pattern: create new instance instead of mutation
   */
  withBackend<T extends AsyncFilesystemBackendType>(
    config: AsyncFilesystemConfig<T>,
  ): AsyncFileSystem {
    return AsyncFileSystem.create(config);
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
      reads: this.props.operations.reads,
      backendType: this.props.config.type,
      totalOperations:
        this.props.operations.reads + this.props.operations.writes,
      readWriteRatio:
        this.props.operations.writes > 0
          ? this.props.operations.reads / this.props.operations.writes
          : this.props.operations.reads,
      errorRate:
        this.props.operations.errors /
          (this.props.operations.reads + this.props.operations.writes) || 0,
    }      
  }

  getErrorPatterns() {
    return {
      totalErrors: this.props.operations.errors,
      suggestion:
        this.props.operations.errors > 10
          ? `Consider switching from ${this.props.config.type} backend`
          : "System running smoothly",
      backendType: this.props.config.type,
    };
  }

  getPerformanceInsights() {
    return {
      backendType: this.props.config.type,
      isAsync: this.isAsync(),
      recommendation:
        this.props.operations.reads + this.props.operations.writes > 1000
          ? "Consider optimizing your filesystem usage"
          : "System performing well",
    };
  }

}
