// @synet/identity/src/shared/filesystem/index.ts

// Synchronous implementations
export { IAsyncFileSystem } from '@synet/patterns/filesystem/promises';
export { NodeFileSystem } from './filesystem';
export { MemFileSystem } from './memory';
export { 
  ObservableFileSystem, 
  FilesystemEventTypes, 
  type FilesystemEvent 
} from './observable';

