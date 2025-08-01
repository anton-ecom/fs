import fs from "node:fs";
import type { FileStats, IFileSystem } from "./filesystem.interface";
/**
 * Node.js implementation of FileSystem interface
 */
export class NodeFileSystem implements IFileSystem {
  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  readFileSync(path: string): string {
    return fs.readFileSync(path, "utf-8");
  }

  writeFileSync(path: string, data: string): void {
    try {
      fs.writeFileSync(path, data);
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
  deleteFileSync(path: string): void {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }

  deleteDirSync(path: string): void {
    if (fs.existsSync(path)) {
      fs.rmSync(path, { recursive: true });
    }
  }

  ensureDirSync(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  readDirSync(dirPath: string): string[] {
    return fs.readdirSync(dirPath);
  }

  chmodSync(path: string, mode: string | number): void {
    try {
      fs.chmodSync(path, mode);
    } catch (error) {
      throw new Error(`Failed to change permissions for ${path}: ${error}`);
    }
  }

  statSync(path: string): FileStats {
    const stats = fs.statSync(path);

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
