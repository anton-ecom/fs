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
  type UnitCore,
  type UnitProps,
  createUnitSchema,
  Capabilities,
  Schema,
  Validator
} from "@synet/unit";
import type { IFileSystem } from "./filesystem.interface";


/**
 * Sync filesystem creation configuration
 */
export interface SyncFilesystemConfig {
  adapter: IFileSystem; 
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
}

const VERSION = "2.0.0";
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
   * Build consciousness trinity - creates living instances once
   */
  protected build(): UnitCore {
    const capabilities = Capabilities.create(this.props.dna.id, {
      readFileSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.readFileSync(params.path);
      },
      writeFileSync: (...args: unknown[]) => {
        const params = args[0] as { path: string; data: string };
        return this.writeFileSync(params.path, params.data);
      },
      existsSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.existsSync(params.path);
      },
      deleteFileSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.deleteFileSync(params.path);
      },
      readDirSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.readDirSync(params.path);
      },
      ensureDirSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.ensureDirSync(params.path);
      },
      deleteDirSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.deleteDirSync(params.path);
      },
      chmodSync: (...args: unknown[]) => {
        const params = args[0] as { path: string; mode: number };
        return this.chmodSync(params.path, params.mode);
      },
      statSync: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.statSync(params.path);
      },
      clear: (...args: unknown[]) => {
        const params = args[0] as { dirPath: string };
        return this.clear(params.dirPath);
      }
    });

    const schema = Schema.create(this.props.dna.id, {
      readFileSync: {
        name: 'readFileSync',
        description: 'Read file content synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' }
          },
          required: ['path']
        },
        response: { type: 'string' }
      },
      writeFileSync: {
        name: 'writeFileSync',
        description: 'Write file content synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            data: { type: 'string', description: 'Data to write' }
          },
          required: ['path', 'data']
        },
        response: { type: 'void' }
      },
      existsSync: {
        name: 'existsSync',
        description: 'Check if file/directory exists synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to check' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      deleteFileSync: {
        name: 'deleteFileSync',
        description: 'Delete file synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to delete' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      readDirSync: {
        name: 'readDirSync',
        description: 'Read directory contents synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to read' }
          },
          required: ['path']
        },
        response: { type: 'array' }
      },
      ensureDirSync: {
        name: 'ensureDirSync',
        description: 'Ensure directory exists synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to ensure' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      deleteDirSync: {
        name: 'deleteDirSync',
        description: 'Delete directory synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to delete' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      chmodSync: {
        name: 'chmodSync',
        description: 'Set file permissions synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            mode: { type: 'number', description: 'Permission mode' }
          },
          required: ['path', 'mode']
        },
        response: { type: 'void' }
      },
      statSync: {
        name: 'statSync',
        description: 'Get file statistics synchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to stat' }
          },
          required: ['path']
        },
        response: { type: 'object' }
      },
      clear: {
        name: 'clear',
        description: 'Clear directory contents synchronously',
        parameters: {
          type: 'object',
          properties: {
            dirPath: { type: 'string', description: 'Directory path to clear' }
          },
          required: ['dirPath']
        },
        response: { type: 'void' }
      }
    });

    const validator = Validator.create({
      unitId: this.props.dna.id,
      capabilities,
      schema,
      strictMode: false
    });

    return { capabilities, schema, validator };
  }

  /**
   * Get capabilities consciousness - returns living instance
   */
  capabilities(): Capabilities {
    return this._unit.capabilities;
  }

  /**
   * Get schema consciousness - returns living instance
   */
  schema(): Schema {
    return this._unit.schema;
  }

  /**
   * Get validator consciousness - returns living instance
   */
  validator(): Validator {
    return this._unit.validator;
  }

  /**
   * CREATE - Create a new sync Filesystem Unit
   */
  static create(
    config: SyncFilesystemConfig,
  ): FileSystem {
 
    const props: SyncFileSystemProps = {
      dna: createUnitSchema({
        id: "fs",
        version: VERSION,
      }),
      backend: config.adapter,
      config,
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
 
      const normalizedPath = this.normalizePath(path);
      return this.props.backend.existsSync(normalizedPath);
  
  }

  /**
   * Delete file synchronously
   */
  deleteFileSync(path: string): void {

      const normalizedPath = this.normalizePath(path);
      this.props.backend.deleteFileSync(normalizedPath);
 
  }

  /**
   * Read directory contents synchronously
   */
  readDirSync(path: string): string[] {
      return this.props.backend.readDirSync(path);
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
      const normalizedPath = this.normalizePath(path);
      this.props.backend.deleteDirSync(normalizedPath);  
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
        'statSync method not available on this backend',
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
        'clear method not available on this backend',
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
      capabilities: this._unit.capabilities,
      schema: this._unit.schema,
      validator: this._unit.validator
    };
  }

  whoami(): string {
    return `FileSystem[${this.props.dna.id}]`;
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



  isAsync(): boolean {
    return false; // This unit is always sync
  }

  /**
   * Normalize path for backend compatibility
   */
  private normalizePath(path: string): string {
    // Check if we're using a memory adapter by duck typing
    if (this.props.backend.constructor.name === 'MemFileSystem') {
      return path.startsWith("/") ? path : `/${path}`;
    }

    // Node, S3, GitHub and other adapters handle paths natively
    return path;
  }
}
