import { type Event, EventEmitter } from "@synet/unit";
import type { IAsyncFileSystem } from "./async-filesystem.interface";

export enum FilesystemEventTypes {
  EXISTS = "file.exists",
  READ = "file.read",
  WRITE = "file.write",
  DELETE = "file.delete",
  CHMOD = "file.chmod",
  ENSURE_DIR = "file.ensureDir",
  DELETE_DIR = "file.deleteDir",
  READ_DIR = "file.readDir",
}

export interface FilesystemEvent extends Event {
  type: FilesystemEventTypes;
  data: {
    filePath: string;
    result?: unknown;
  }
}

export class ObservableFileSystem implements IAsyncFileSystem {
  private eventEmitter: EventEmitter<FilesystemEvent>;

  constructor(
    private baseFilesystem: IAsyncFileSystem,
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

  async exists(filename: string): Promise<boolean> {
    try {
      const result = await this.baseFilesystem.exists(filename);

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
            filePath: filename
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

  async readFile(filename: string): Promise<string> {
    try {
      const content = await this.baseFilesystem.readFile(filename);

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

  async writeFile(filename: string, data: string): Promise<void> {
    try {
      await this.baseFilesystem.writeFile(filename, data);

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

  async deleteFile(filename: string): Promise<void> {
    try {
      await this.baseFilesystem.deleteFile(filename);

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

  async deleteDir(dirPath: string): Promise<void> {
    try {
      await this.baseFilesystem.deleteDir(dirPath);

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

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await this.baseFilesystem.ensureDir(dirPath);

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

  async readDir(dirPath: string): Promise<string[]> {
    try {
      const result = await this.baseFilesystem.readDir(dirPath);

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

  async chmod(path: string, mode: number): Promise<void> {
    try {
      await this.baseFilesystem.chmod(path, mode);

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

  async clear?(dirPath: string): Promise<void> {
    if (this.baseFilesystem.clear) {
      await this.baseFilesystem.clear(dirPath);
      // We could emit a clear event, but it's not in our enum
      // Could be added if needed
    }
  }
}
