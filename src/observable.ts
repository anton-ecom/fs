import { EventEmitter, type Event } from '@synet/patterns';
import type { IFileSystem, FileStats } from "@synet/patterns/filesystem";

export enum FilesystemEventTypes {
  EXISTS = 'file.exists',
  READ = 'file.read',
  WRITE = 'file.write',
  DELETE = 'file.delete',
  CHMOD = 'file.chmod',
  ENSURE_DIR = 'file.ensureDir',
  DELETE_DIR = 'file.deleteDir',
  READ_DIR = 'file.readDir',
  STAT = 'file.stat',
}

export interface FilesystemEvent extends Event {
  type: FilesystemEventTypes;
  data: {
    filePath: string;
    operation: 'read' | 'write' | 'delete' | 'exists' | 'chmod' | 'ensureDir' | 'deleteDir' | 'readDir' | 'stat';
    result?: unknown;
    error?: Error;
  };
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
    const result = this.baseFilesystem.existsSync(filename);
    
    if (this.shouldEmit(FilesystemEventTypes.EXISTS)) {
      this.eventEmitter.emit({
        type: FilesystemEventTypes.EXISTS,
        data: {
          filePath: filename,
          operation: 'exists',
          result
        }
      });
    }
    
    return result;
  }

  readFileSync(filename: string): string {
    try {
      const content = this.baseFilesystem.readFileSync(filename);
      
      if (this.shouldEmit(FilesystemEventTypes.READ)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ,
          data: {
            filePath: filename,
            operation: 'read',
            result: content.length
          }
        });
      }

      return content;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.READ)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ,
          data: {
            filePath: filename,
            operation: 'read',
            error: error as Error
          }
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
            operation: 'write',
            result: data.length
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.WRITE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.WRITE,
          data: {
            filePath: filename,
            operation: 'write',
            error: error as Error
          }
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
            operation: 'delete'
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.DELETE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE,
          data: {
            filePath: filename,
            operation: 'delete',
            error: error as Error
          }
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
            operation: 'deleteDir'
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.DELETE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE_DIR,
          data: {
            filePath: dirPath,
            operation: 'deleteDir',
            error: error as Error
          }
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
            operation: 'ensureDir'
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.ENSURE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.ENSURE_DIR,
          data: {
            filePath: dirPath,
            operation: 'ensureDir',
            error: error as Error
          }
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
            operation: 'readDir',
            result: result.length
          }
        });
      }

      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.READ_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ_DIR,
          data: {
            filePath: dirPath,
            operation: 'readDir',
            error: error as Error
          }
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
            operation: 'chmod',
            result: mode
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.CHMOD)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.CHMOD,
          data: {
            filePath: path,
            operation: 'chmod',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  statSync(path: string): FileStats {
    if (!this.baseFilesystem.statSync) {
      throw new Error('Base filesystem does not support statSync operation');
    }
    
    try {
      const result = this.baseFilesystem.statSync(path);
      
      if (this.shouldEmit(FilesystemEventTypes.STAT)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.STAT,
          data: {
            filePath: path,
            operation: 'stat',
            result: result.size
          }
        });
      }

      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.STAT)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.STAT,
          data: {
            filePath: path,
            operation: 'stat',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }
}