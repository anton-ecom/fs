/**
 * FS - Clean Factory for Filesystem Units
 *
 * Provides a clean, organized way to create filesystem units with
 * clear separation between sync and async operations.
 *
 * Usage:
 * ```typescript
 * // Sync filesystems (local only)
 * const syncFs = FS.sync.memory();
 * const content = syncFs.readFile('./file.txt'); // Returns string
 *
 * // Async filesystems (including cloud)
 * const asyncFs = FS.async.s3(s3Options);
 * const content = await asyncFs.readFile('./file.txt'); // Returns Promise<string>
 * ```
 */

import { FileSystem } from "./filesystem-unit";
import { AsyncFileSystem } from "./promises/async-filesystem-unit";
import type { AzureBlobStorageOptions } from "./promises/azure";
import type { GCSFileSystemOptions } from "./promises/gcs";
import type { GitHubFileSystemOptions } from "./promises/github";
import type { CloudflareR2Options } from "./promises/r2";
import type { S3FileSystemOptions } from "./promises/s3";

/**
 * Clean filesystem factory with sync/async separation
 */
export const FS = {
  /**
   * Synchronous filesystem operations (local only)
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
  },

  /**
   * Asynchronous filesystem operations (including cloud)
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

    /**
     * Google Cloud Storage (async) - Cloud storage with proper async handling
     */
    gcs: (options: GCSFileSystemOptions) =>
      AsyncFileSystem.create({ type: "gcs", options }),

    /**
     * Azure Blob Storage (async) - Cloud storage with proper async handling
     */
    azure: (options: AzureBlobStorageOptions) =>
      AsyncFileSystem.create({ type: "azure", options }),

    /**
     * Cloudflare R2 (async) - S3-compatible cloud storage with proper async handling
     */
    r2: (options: CloudflareR2Options) =>
      AsyncFileSystem.create({ type: "r2", options }),
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
    productionS3: (s3Options: S3FileSystemOptions) => FS.async.s3(s3Options),

    /**
     * Production cloud: GCS with proper async handling
     */
    productionGCS: (gcsOptions: GCSFileSystemOptions) =>
      FS.async.gcs(gcsOptions),

    /**
     * Production cloud: Azure Blob Storage with proper async handling
     */
    productionAzure: (azureOptions: AzureBlobStorageOptions) =>
      FS.async.azure(azureOptions),

    /**
     * Production cloud: Cloudflare R2 with proper async handling
     */
    productionR2: (r2Options: CloudflareR2Options) => FS.async.r2(r2Options),

    /**
     * Git-based storage: GitHub with async operations
     */
    git: (githubOptions: GitHubFileSystemOptions) =>
      FS.async.github(githubOptions),
  },
};

// Re-export the core units for direct usage if needed
export { FileSystem, AsyncFileSystem };
export type {
  SyncFilesystemBackendType,
  SyncFilesystemBackendOptions,
  SyncFilesystemConfig,
} from "./filesystem-unit";
export type {
  AsyncFilesystemBackendType,
  AsyncFilesystemBackendOptions,
  AsyncFilesystemConfig,
} from "./promises/async-filesystem-unit";

/**
 * Legacy compatibility - will be deprecated
 * @deprecated Use FS.sync or FS.async instead
 */
export const FileSystems = {
  memory: () => FS.sync.memory(),
  node: () => FS.sync.node(),
  development: () => FS.presets.development(),
  // Cloud storage now requires explicit async usage
  s3: (options: S3FileSystemOptions) => FS.async.s3(options),
  github: (options: GitHubFileSystemOptions) => FS.async.github(options),
  gcs: (options: GCSFileSystemOptions) => FS.async.gcs(options),
  azure: (options: AzureBlobStorageOptions) => FS.async.azure(options),
  r2: (options: CloudflareR2Options) => FS.async.r2(options),
};
