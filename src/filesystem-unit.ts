/**
 * Sync Filesystem Unit - Pure Synchronous Operations
 *
 * This unit provides synchronous filesystem operations with direct method access.
 * Only includes backends that work well synchronously: node and memory.
 * Cloud storage (GitHub, S3, GCS) should use the async filesystem unit.
 */

import {
  type TeachingContract,
  Unit,
  type UnitProps,
  UnitSchema,
  createUnitSchema,
} from "@synet/unit";
import type { IFileSystem } from "./filesystem.interface";

import { MemFileSystem } from "./memory";
import { NodeFileSystem } from "./node";

/**
 * Supported sync filesystem backend types
 */
export type SyncFilesystemBackendType = "node" | "memory";

/**
 * Options for different sync filesystem backends
 */
export type SyncFilesystemBackendOptions = {
  node: Record<string, never>;
  memory: Record<string, never>;
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
}

/**
 * Sync Filesystem Unit properties following Unit Architecture
 */
interface SyncFileSystemProps extends UnitProps {
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
export class FileSystem
  extends Unit<SyncFileSystemProps>
  implements IFileSystem
{
  protected constructor(props: SyncFileSystemProps) {
    super(props);
  }

  /**
   * CREATE - Create a new sync Filesystem Unit
   */
  static create<T extends SyncFilesystemBackendType>(
    config: SyncFilesystemConfig<T>,
  ): FileSystem {
    const backend = FileSystem.createBackend(config);

    const props: SyncFileSystemProps = {
      dna: createUnitSchema({
        id: "fs",
        version: "1.0.0",
      }),
      backend,
      config,
      operations: {
        reads: 0,
        writes: 0,
        errors: 0,
      },
      created: new Date(),
    };

    return new FileSystem(props);
  }

  // ==========================================
  // NATIVE FILESYSTEM METHODS (with Sync suffix)
  // ==========================================

  /**
   * Read file content synchronously
   */
  readFileSync(path: string): string {
    const normalizedPath = this.normalizePath(path);
    return this.props.backend.readFileSync(normalizedPath);
  }

  /**
   * Write file content synchronously
   */
  writeFileSync(path: string, data: string): void {
    const normalizedPath = this.normalizePath(path);
    this.props.backend.writeFileSync(normalizedPath, data);
  }

  /**
   * Check if file/directory exists synchronously
   */
  existsSync(path: string): boolean {
    try {
      const normalizedPath = this.normalizePath(path);
      return this.props.backend.existsSync(normalizedPath);
    } catch (error) {
      this.props.operations.errors++;
      throw error;
    }
  }

  /**
   * Delete file synchronously
   */
  deleteFileSync(path: string): void {
    try {
      const normalizedPath = this.normalizePath(path);
      this.props.backend.deleteFileSync(normalizedPath);
    } catch (error) {
      this.props.operations.errors++;
      throw error;
    }
  }

  /**
   * Read directory contents synchronously
   */
  readDirSync(path: string): string[] {
    try {
      return this.props.backend.readDirSync(path);
    } catch (error) {
      this.props.operations.errors++;
      throw error;
    }
  }

  /**
   * Ensure directory exists synchronously
   */
  ensureDirSync(path: string): void {
    const normalizedPath = this.normalizePath(path);
    this.props.backend.ensureDirSync(normalizedPath);
  }

  /**
   * Delete directory synchronously
   */
  deleteDirSync(path: string): void {
    try {
      const normalizedPath = this.normalizePath(path);
      this.props.backend.deleteDirSync(normalizedPath);
    } catch (error) {
      this.props.operations.errors++;
      throw error;
    }
  }

  /**
   * Set file permissions synchronously
   */
  chmodSync(path: string, mode: number): void {
    const normalizedPath = this.normalizePath(path);
    this.props.backend.chmodSync(normalizedPath, mode);
  }

  /**
   * Get file statistics synchronously
   */
  statSync(path: string): import("./filesystem.interface").FileStats {
    const normalizedPath = this.normalizePath(path);
    const result = this.props.backend.statSync?.(normalizedPath);
    if (!result) {
      throw new Error(
        `statSync method not available on ${this.props.config.type} backend`,
      );
    }
    return result;
  }

  /**
   * Clear directory contents synchronously
   */
  clear(dirPath: string): void {
    const normalizedPath = this.normalizePath(dirPath);
    if (!this.props.backend.clear) {
      throw new Error(
        `clear method not available on ${this.props.config.type} backend`,
      );
    }
    this.props.backend.clear(normalizedPath);
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
        readFileSync: (...args: unknown[]) =>
          this.readFileSync(args[0] as string),
        writeFileSync: (...args: unknown[]) =>
          this.writeFileSync(args[0] as string, args[1] as string),
        existsSync: (...args: unknown[]) => this.existsSync(args[0] as string),
        deleteFileSync: (...args: unknown[]) =>
          this.deleteFileSync(args[0] as string),
        readDirSync: (...args: unknown[]) =>
          this.readDirSync(args[0] as string),
        ensureDirSync: (...args: unknown[]) =>
          this.ensureDirSync(args[0] as string),
        deleteDirSync: (...args: unknown[]) =>
          this.deleteDirSync(args[0] as string),
        chmodSync: (...args: unknown[]) =>
          this.chmodSync(args[0] as string, args[1] as number),
        statSync: (...args: unknown[]) => this.statSync(args[0] as string),
      },
    };
  }

  whoami(): string {
    return `FileSystem[${this.props.dna.id}]`;
  }

  capabilities(): string[] {
    return [
      "readFileSync",
      "writeFileSync",
      "existsSync",
      "deleteFileSync",
      "readDirSync",
      "ensureDirSync",
      "deleteDirSync",
      "chmodSync",
      "statSync",
    ];
  }

  help(): void {
    console.log(`
FileSystem Unit - Synchronous filesystem operations

Capabilities:
  readFileSync - Read file contents
  writeFileSync - Write file data  
  existsSync - Check if file exists
  deleteFileSync - Delete file
  readDirSync - List directory contents
  ensureDirSync - Create directory if needed
  deleteDirSync - Remove directory
  chmodSync - Change file permissions
  statSync - Get file statistics

Usage:
  const fs = FileSystem.create(config);
  const data = fs.readFileSync('/path/to/file');
  
When learned by other units:
  otherUnit.execute('${this.props.dna.id}.readFileSync', '/path/to/file');
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
  getBackend(): IFileSystem {
    return this.props.backend;
  }

  /**
   * Create a new FileSystem unit with different backend configuration
   * Unit Architecture pattern: create new instance instead of mutation
   */
  withBackend<T extends SyncFilesystemBackendType>(
    config: SyncFilesystemConfig<T>,
  ): FileSystem {
    return FileSystem.create(config);
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

      default:
        throw new Error(`Unsupported sync filesystem backend: ${type}`);
    }
  }

  isAsync(): boolean {
    return false; // This unit is always sync
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
    };
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

  /**
   * Normalize path for backend compatibility
   */
  private normalizePath(path: string): string {
    // Memory backend requires absolute paths
    if (this.props.config.type === "memory") {
      return path.startsWith("/") ? path : `/${path}`;
    }

    // Node backend handles paths natively
    return path;
  }
}
