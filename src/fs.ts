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

import { FileSystem } from "./filesystem.unit";
import { AsyncFileSystem } from "./promises/async-filesystem.unit";
import { NodeFileSystem } from "./node";

import { NodeFileSystem as AsyncNodeFileSystem } from "./promises/node";

/**
 * Clean filesystem factory with sync/async separation
 */
export const FS = {
  /**
   * Synchronous filesystem operations (local only)
   */
  sync: {

    /**
     * Node.js filesystem (sync) - Local file operations
     */
    node: () => FileSystem.create({ adapter: new NodeFileSystem() }),
  },

  /**
   * Asynchronous filesystem operations (including cloud)
   */
  async: {

    /**
     * Node.js filesystem (async) - Non-blocking local file operations
     */
     node: () => AsyncFileSystem.create({ adapter: new AsyncNodeFileSystem() }),

  
  },

};
