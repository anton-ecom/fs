import { fs as memfs } from "memfs";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";

/**
 * In-memory file system implementation using memfs
 */
export class MemFileSystem implements IAsyncFileSystem {
  async exists(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        memfs.statSync(path);
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  async readFile(path: string): Promise<string> {
    try {
      const buffer = await memfs.promises.readFile(path);
      return buffer.toString("utf8");
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  }

  async writeFile(path: string, data: string): Promise<void> {
    try {
      // Ensure the directory exists before writing (handle both absolute and relative paths)
      const lastSlashIndex = path.lastIndexOf("/");
      if (lastSlashIndex > 0) {
        // Only create directory if there's a meaningful parent directory
        const dirPath = path.substring(0, lastSlashIndex);
        if (!(await this.exists(dirPath))) {
          await this.ensureDir(dirPath);
        }
      }

      await memfs.promises.writeFile(path, data, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${error}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await memfs.promises.unlink(path);
    } catch (error) {
      throw new Error(`Failed to delete file ${path}: ${error}`);
    }
  }

  async deleteDir(path: string): Promise<void> {
    try {
      await memfs.promises.rmdir(path, { recursive: true });
    } catch (error) {
      // Ignore error if directory does not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to delete directory ${path}: ${error}`);
      }
    }
  }

  async ensureDir(path: string): Promise<void> {
    try {
      await memfs.promises.mkdir(path, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new Error(`Failed to create directory ${path}: ${error}`);
      }
    }
  }

  async chmod(path: string, mode: number): Promise<void> {
    try {
      await memfs.promises.chmod(path, mode);
    } catch (error) {
      throw new Error(`Failed to change permissions for ${path}: ${error}`);
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    try {
      const entries = await memfs.promises.readdir(dirPath);
      // Ensure we return string array (memfs might return Buffer or Dirent)
      return entries.map((entry) => entry.toString());
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error}`);
    }
  }

  // Additional utility methods for testing

  async clear(dirPath: string): Promise<void> {
    try {
      if (await this.exists(dirPath)) {
        await memfs.promises.rmdir(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to clear in-memory file system: ${error}`);
    }
  }

  async stat(path: string): Promise<FileStats> {
    const stats = await memfs.promises.stat(path);

    return {
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
      isSymbolicLink: () => stats.isSymbolicLink(),
      size: Number(stats.size),
      mtime: stats.mtime,
      ctime: stats.ctime,
      atime: stats.atime,
      mode: Number(stats.mode),
    };
  }
}
