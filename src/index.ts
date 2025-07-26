// Main filesystem units and factory
export { FS, FileSystem, AsyncFileSystem, FileSystems } from './fs';

// Core types
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

// Synchronous implementations
export { NodeFileSystem } from './node';
export { MemFileSystem } from './memory';
export { 
  ObservableFileSystem, 
  FilesystemEventTypes, 
  type FilesystemEvent 
} from './observable';
export { 
  JsonFileSystem,
  type JsonFileSystemOptions,
  JsonParseError,
  JsonStringifyError,
  JsonValidationError
} from './json';
export {
  AnalyticsFileSystem,
  createAnalyticsFileSystem,
  type AnalyticsFileSystemOptions,
  type Stats,
  type FileAccess,
  type FileAction,
  type AnalyticsStatsEvent
} from './analytics';
export {
  WithIdFileSystem,
  FileFormat,
  type FileMetadata
} from './with-id';
export {
  CachedFileSystem,
  createCachedFileSystem,
  type CachedFileSystemOptions
} from './cached';
export {
  S3FileSystem,
  createS3FileSystem,
  type S3FileSystemOptions
} from './s3';
export {
  GCSFileSystem,
  createGCSFileSystem,
  type GCSFileSystemOptions
} from './gcs';
export {
  GitHubFileSystem,
  type GitHubFileSystemOptions
} from './github';

// Asynchronous implementations
export { IAsyncFileSystem } from './promises/filesystem.interface';
export { IFileSystem } from './filesystem.interface';
export { NodeFileSystem as AsyncNodeFileSystem } from './promises/node';
export { MemFileSystem as AsyncMemFileSystem } from './promises/memory';
export { 
  ObservableFileSystem as AsyncObservableFileSystem,
  FilesystemEventTypes as AsyncFilesystemEventTypes,
  type FilesystemEvent as AsyncFilesystemEvent
} from './promises/observable';
export { 
  JsonFileSystem as AsyncJsonFileSystem,
  type JsonFileSystemOptions as AsyncJsonFileSystemOptions,
  JsonParseError as AsyncJsonParseError,
  JsonStringifyError as AsyncJsonStringifyError,
  JsonValidationError as AsyncJsonValidationError
} from './promises/json';
export {
  AnalyticsFileSystem as AsyncAnalyticsFileSystem,
  createAnalyticsFileSystem as createAsyncAnalyticsFileSystem,
  type AnalyticsFileSystemOptions as AsyncAnalyticsFileSystemOptions,
  type Stats as AsyncStats,
  type FileAccess as AsyncFileAccess,
  type FileAction as AsyncFileAction,
  type AnalyticsStatsEvent as AsyncAnalyticsStatsEvent
} from './promises/analytics';
export {
  WithIdFileSystem as AsyncWithIdFileSystem,
  FileFormat as AsyncFileFormat,
  type FileMetadata as AsyncFileMetadata
} from './promises/with-id';
export {
  CachedFileSystem as AsyncCachedFileSystem,
  createCachedFileSystem as createAsyncCachedFileSystem,
  type CachedFileSystemOptions as AsyncCachedFileSystemOptions
} from './promises/cached';
export {
  S3FileSystem as AsyncS3FileSystem,
  createS3FileSystem as createAsyncS3FileSystem,
  type S3FileSystemOptions as AsyncS3FileSystemOptions
} from './promises/s3';
export {
  GCSFileSystem as AsyncGCSFileSystem,
  createGCSFileSystem as createAsyncGCSFileSystem,
  type GCSFileSystemOptions as AsyncGCSFileSystemOptions
} from './promises/gcs';
export {
  GitHubFileSystem as AsyncGitHubFileSystem,
  type GitHubFileSystemOptions as AsyncGitHubFileSystemOptions
} from './promises/github';
