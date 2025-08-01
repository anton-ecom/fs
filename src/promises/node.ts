import * as fs from "node:fs/promises";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";

/**
 * Node.js implementation of FileSystem interface
 */
export class NodeFileSystem implements IAsyncFileSystem {
  async exists(path: string): Promise<boolean> {
    return fs
      .access(path)
      .then(() => true)
      .catch(() => false);
  }

  async readFile(path: string): Promise<string> {
    return fs.readFile(path, "utf-8");
  }

  async writeFile(path: string, data: string): Promise<void> {
    return fs.writeFile(path, data, "utf-8");
  }

  async deleteFile(path: string): Promise<void> {
    return fs.unlink(path);
  }

  async deleteDir(path: string): Promise<void> {
    try {
      await fs.rm(path, { recursive: true });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "EEXIST"
      ) {
        throw error;
      }
    }
  }
  async readDir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async chmod(path: string, mode: number): Promise<void> {
    return fs.chmod(path, mode);
  }

  async stat(path: string): Promise<FileStats> {
    const stats = await fs.stat(path);

    return {
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
      isSymbolicLink: () => stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime,
      ctime: stats.ctime,
      atime: stats.atime,
      mode: stats.mode,
    };
  }
}
