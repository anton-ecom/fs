/**
 * FS - Clean Factory for Filesystem Units
 * 
 * Provides a clean, organized way to create filesystem units with
 * clear separation between sync and async operations.
 * 
 * Usage:
 * ```typescript
 * // Sync filesystems
 * const syncFs = FS.sync.memory();
 * const content = syncFs.readFile('./file.txt'); // Returns string
 * 
 * // Async filesystems
 * const asyncFs = FS.async.s3(s3Options);
 * const content = await asyncFs.readFile('./file.txt'); // Returns Promise<string>
 * ```
 */

import { FileSystem } from './filesystem-unit';
import { AsyncFileSystem } from './promises/async-filesystem-unit';
import type { GitHubFileSystemOptions } from './github';
import type { S3FileSystemOptions } from './s3';

/**
 * Clean filesystem factory with sync/async separation
 */
export const FS = {
  /**
   * Synchronous filesystem operations
   */
  sync: {
    /**
     * In-memory storage (sync) - Great for testing and development
     */
    memory: () => FileSystem.create({ type: "memory" }),

    /**
     * Node.js filesystem (sync) - Local file operations
     */
    node: () => FileSystem.create({ type: "node" }),

    /**
     * GitHub storage (sync) - Git-based file storage
     * Note: GitHub operations are naturally async, sync version may have limitations
     */
    github: (options: GitHubFileSystemOptions) => 
      FileSystem.create({ type: "github", options }),

    /**
     * S3 storage (sync) - Cloud storage
     * Note: S3 operations are naturally async, sync version may have limitations
     */
    s3: (options: S3FileSystemOptions) => 
      FileSystem.create({ type: "s3", options }),
  },

  /**
   * Asynchronous filesystem operations
   */
  async: {
    /**
     * In-memory storage (async) - Great for testing async workflows
     */
    memory: () => AsyncFileSystem.create({ type: "memory" }),

    /**
     * Node.js filesystem (async) - Non-blocking local file operations
     */
    node: () => AsyncFileSystem.create({ type: "node" }),

    /**
     * GitHub storage (async) - Git-based file storage with proper async handling
     */
    github: (options: GitHubFileSystemOptions) => 
      AsyncFileSystem.create({ type: "github", options }),

    /**
     * S3 storage (async) - Cloud storage with proper async handling
     */
    s3: (options: S3FileSystemOptions) => 
      AsyncFileSystem.create({ type: "s3", options }),
  },

  /**
   * Quick presets for common scenarios
   */
  presets: {
    /**
     * Development setup: Fast in-memory storage
     */
    development: () => FS.sync.memory(),

    /**
     * Development async: Fast in-memory storage with async patterns
     */
    developmentAsync: () => FS.async.memory(),

    /**
     * Local development: Real filesystem, sync operations
     */
    local: () => FS.sync.node(),

    /**
     * Local development: Real filesystem, async operations
     */
    localAsync: () => FS.async.node(),

    /**
     * Production cloud: S3 with proper async handling
     */
    production: (s3Options: S3FileSystemOptions) => FS.async.s3(s3Options),

    /**
     * Git-based storage: GitHub with async operations
     */
    git: (githubOptions: GitHubFileSystemOptions) => FS.async.github(githubOptions),
  }
};

// Re-export the core units for direct usage if needed
export { FileSystem, AsyncFileSystem };
export type { 
  SyncFilesystemBackendType, 
  SyncFilesystemBackendOptions, 
  SyncFilesystemConfig 
} from './filesystem-unit';
export type { 
  AsyncFilesystemBackendType, 
  AsyncFilesystemBackendOptions, 
  AsyncFilesystemConfig 
} from './promises/async-filesystem-unit';

/**
 * Legacy compatibility - will be deprecated
 * @deprecated Use FS.sync or FS.async instead
 */
export const FileSystems = {
  memory: () => FS.sync.memory(),
  node: () => FS.sync.node(),
  github: (options: GitHubFileSystemOptions) => FS.sync.github(options),
  s3: (options: S3FileSystemOptions) => FS.sync.s3(options),
  development: () => FS.presets.development(),
  production: (s3Options: S3FileSystemOptions) => FS.presets.production(s3Options),
};
