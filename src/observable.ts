import { type Event, EventEmitter } from "@synet/unit";
import type { FileStats, IFileSystem } from "./filesystem.interface";

export enum FilesystemEventTypes {
  EXISTS = "file.exists",
  READ = "file.read",
  WRITE = "file.write",
  DELETE = "file.delete",
  CHMOD = "file.chmod",
  ENSURE_DIR = "file.ensureDir",
  DELETE_DIR = "file.deleteDir",
  READ_DIR = "file.readDir",
  STAT = "file.stat",
}

export interface FilesystemEvent extends Event {
  type: FilesystemEventTypes;
  data: {
    filePath: string;
    result?: unknown;
  }
}

export class ObservableFileSystem implements IFileSystem {
  private eventEmitter: EventEmitter<FilesystemEvent>;

  constructor(
    private baseFilesystem: IFileSystem,
    private events?: FilesystemEventTypes[],
  ) {
    this.eventEmitter = new EventEmitter<FilesystemEvent>();
  }

  getEventEmitter(): EventEmitter<FilesystemEvent> {
    return this.eventEmitter;
  }

  private shouldEmit(eventType: FilesystemEventTypes): boolean {
    return !this.events || this.events.includes(eventType);
  }

  existsSync(filename: string): boolean {
    try {
      const result = this.baseFilesystem.existsSync(filename);

      if (this.shouldEmit(FilesystemEventTypes.EXISTS)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.EXISTS,
          data: {
            filePath: filename,
            result,
          },
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.EXISTS)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.EXISTS,
          data: {
            filePath: filename,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  readFileSync(filename: string): string {
    try {
      const content = this.baseFilesystem.readFileSync(filename);

      if (this.shouldEmit(FilesystemEventTypes.READ)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ,
          data: {
            filePath: filename,
            result: content.length,
          },
          timestamp: new Date(),
        });
      }

      return content;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.READ)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ,
          data: {
            filePath: filename,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  writeFileSync(filename: string, data: string): void {
    try {
      this.baseFilesystem.writeFileSync(filename, data);

      if (this.shouldEmit(FilesystemEventTypes.WRITE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.WRITE,
          data: {
            filePath: filename,
            result: data.length,
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.WRITE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.WRITE,
          data: {
            filePath: filename,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  deleteFileSync(filename: string): void {
    try {
      this.baseFilesystem.deleteFileSync(filename);

      if (this.shouldEmit(FilesystemEventTypes.DELETE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE,
          data: {
            filePath: filename,
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.DELETE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE,
          data: {
            filePath: filename,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  deleteDirSync(dirPath: string): void {
    try {
      this.baseFilesystem.deleteDirSync(dirPath);

      if (this.shouldEmit(FilesystemEventTypes.DELETE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE_DIR,
          data: {
            filePath: dirPath,
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.DELETE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE_DIR,
          data: {
            filePath: dirPath,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  ensureDirSync(dirPath: string): void {
    try {
      this.baseFilesystem.ensureDirSync(dirPath);

      if (this.shouldEmit(FilesystemEventTypes.ENSURE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.ENSURE_DIR,
          data: {
            filePath: dirPath,
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.ENSURE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.ENSURE_DIR,
          data: {
            filePath: dirPath,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  readDirSync(dirPath: string): string[] {
    try {
      const result = this.baseFilesystem.readDirSync(dirPath);

      if (this.shouldEmit(FilesystemEventTypes.READ_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ_DIR,
          data: {
            filePath: dirPath,
            result: result.length,
          },
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.READ_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ_DIR,
          data: {
            filePath: dirPath,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  chmodSync(path: string, mode: number): void {
    try {
      this.baseFilesystem.chmodSync(path, mode);

      if (this.shouldEmit(FilesystemEventTypes.CHMOD)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.CHMOD,
          data: {
            filePath: path,
            result: mode,
          },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.CHMOD)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.CHMOD,
          data: {
            filePath: path,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  statSync(path: string): FileStats {
    if (!this.baseFilesystem.statSync) {
      throw new Error("Base filesystem does not support statSync operation");
    }

    try {
      const result = this.baseFilesystem.statSync(path);

      if (this.shouldEmit(FilesystemEventTypes.STAT)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.STAT,
          data: {
            filePath: path,
            result: result.size,
          },
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.STAT)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.STAT,
          data: {
            filePath: path,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }
}
