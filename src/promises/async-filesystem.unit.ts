/**
 * Async Filesystem Unit - Pure Asynchronous Operations
 *
 * This unit provides asynchronous filesystem operations with direct method access.
 * No async/sync mixing, no runtime type checks, no zalgo.
 */

import {
  Unit, 
  createUnitSchema,
  Capabilities,
  Schema,
  Validator,
  type TeachingContract,
  type UnitCore,
  type UnitProps,
} from "@synet/unit";
import type { FileStats, IAsyncFileSystem } from "./async-filesystem.interface";

/**
 * Async filesystem creation configuration
 */
export interface AsyncFilesystemConfig {
  adapter: IAsyncFileSystem; 
}

/**
 * Async Filesystem Unit properties following Unit Architecture
 */
interface AsyncFileSystemProps extends UnitProps {
  backend: IAsyncFileSystem;
  config: AsyncFilesystemConfig;

}

const VERSION = "2.0.1";

/**
 * Async Filesystem Unit - Pure asynchronous filesystem operations
 */
export class AsyncFileSystem
  extends Unit<AsyncFileSystemProps>
  implements IAsyncFileSystem
{
  protected constructor(props: AsyncFileSystemProps) {
    super(props);
  }

  /**
   * Build consciousness trinity - creates living instances once
   */
  protected build(): UnitCore {
    const capabilities = Capabilities.create(this.props.dna.id, {
      readFile: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.readFile(params.path);
      },
      writeFile: (...args: unknown[]) => {
        const params = args[0] as { path: string; data: string };
        return this.writeFile(params.path, params.data);
      },
      exists: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.exists(params.path);
      },
      deleteFile: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.deleteFile(params.path);
      },
      readDir: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.readDir(params.path);
      },
      ensureDir: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.ensureDir(params.path);
      },
      deleteDir: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.deleteDir(params.path);
      },
      chmod: (...args: unknown[]) => {
        const params = args[0] as { path: string; mode: number };
        return this.chmod(params.path, params.mode);
      },
      stat: (...args: unknown[]) => {
        const params = args[0] as { path: string };
        return this.stat(params.path);
      }
    });

    const schema = Schema.create(this.props.dna.id, {
      readFile: {
        name: 'readFile',
        description: 'Read file content asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' }
          },
          required: ['path']
        },
        response: { type: 'string' }
      },
      writeFile: {
        name: 'writeFile',
        description: 'Write file content asynchronously',
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
      exists: {
        name: 'exists',
        description: 'Check if file/directory exists asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to check' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      deleteFile: {
        name: 'deleteFile',
        description: 'Delete file asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to delete' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      readDir: {
        name: 'readDir',
        description: 'Read directory contents asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to read' }
          },
          required: ['path']
        },
        response: { type: 'array' }
      },
      ensureDir: {
        name: 'ensureDir',
        description: 'Ensure directory exists asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to ensure' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      deleteDir: {
        name: 'deleteDir',
        description: 'Delete directory asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to delete' }
          },
          required: ['path']
        },
        response: { type: 'void' }
      },
      chmod: {
        name: 'chmod',
        description: 'Set file permissions asynchronously',
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
      stat: {
        name: 'stat',
        description: 'Get file statistics asynchronously',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to stat' }
          },
          required: ['path']
        },
        response: { type: 'object' }
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
   * CREATE - Create a new async Filesystem Unit
   */
  static create(
    config: AsyncFilesystemConfig,
  ): AsyncFileSystem {

    const props: AsyncFileSystemProps = {
      dna: createUnitSchema({
        id: "fs-async",
        version: VERSION,
      }),
      backend: config.adapter,
      config,
      created: new Date(),
    };

    return new AsyncFileSystem(props);
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
      const normalizedPath = this.normalizePath(path);
      await this.props.backend.deleteFile(normalizedPath); 
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
      throw new Error(
        'stat method not available on this backend',
      );
    }
    return result;
  }

  /**
   * Clear directory contents asynchronously
   */
  async clear(dirPath: string): Promise<void> {
    if (!this.props.backend.clear) {
      throw new Error(
        'clear method not available on this backend',
      );
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
      capabilities: this._unit.capabilities,
      schema: this._unit.schema,
      validator: this._unit.validator
    };
  }

  whoami(): string {
    return `AsyncFileSystem[${this.props.dna.id}]`;
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

  isAsync(): boolean {
    return true; // This unit is always async
  }

  
}
