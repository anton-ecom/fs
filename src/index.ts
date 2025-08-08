// Main filesystem units and factory
export { FS } from "./fs";

// Core types
export type {
  FileSystem,
  SyncFilesystemConfig,
} from "./filesystem.unit";
export type {
  AsyncFilesystemConfig,
  AsyncFileSystem,
} from "./promises/async-filesystem.unit";

// Core interfaces
export { IFileSystem } from "./filesystem.interface";
export { IAsyncFileSystem } from "./promises/filesystem.interface";


// SYNC
export { NodeFileSystem } from "./node";

// Enhanced sync implementations
export {
  ObservableFileSystem,
  FilesystemEventTypes,
  type FilesystemEvent,
} from "./observable";
export {
  JsonFileSystem,
  type JsonFileSystemOptions,
  JsonParseError,
  JsonStringifyError,
  JsonValidationError,
} from "./json";
export {
  AnalyticsFileSystem,
  createAnalyticsFileSystem,
  type AnalyticsFileSystemOptions,
  type Stats,
  type FileAccess,
  type FileAction,
  type AnalyticsStatsEvent,
} from "./analytics";
export {
  WithIdFileSystem,
  FileFormat,
  type FileMetadata,
} from "./with-id";
export {
  CachedFileSystem,
  createCachedFileSystem,
  type CachedFileSystemOptions,
} from "./cached";

// ASYNC 

// Base async implementations
export { NodeFileSystem as AsyncNodeFileSystem } from "./promises/node";

// Enhanced async implementations
export {
  ObservableFileSystem as AsyncObservableFileSystem,
  FilesystemEventTypes as AsyncFilesystemEventTypes,
  type FilesystemEvent as AsyncFilesystemEvent,
} from "./promises/observable";
export {
  JsonFileSystem as AsyncJsonFileSystem,
  type JsonFileSystemOptions as AsyncJsonFileSystemOptions,
  JsonParseError as AsyncJsonParseError,
  JsonStringifyError as AsyncJsonStringifyError,
  JsonValidationError as AsyncJsonValidationError,
} from "./promises/json";
export {
  AnalyticsFileSystem as AsyncAnalyticsFileSystem,
  createAnalyticsFileSystem as createAsyncAnalyticsFileSystem,
  type AnalyticsFileSystemOptions as AsyncAnalyticsFileSystemOptions,
  type Stats as AsyncStats,
  type FileAccess as AsyncFileAccess,
  type FileAction as AsyncFileAction,
  type AnalyticsStatsEvent as AsyncAnalyticsStatsEvent,
} from "./promises/analytics";
export {
  WithIdFileSystem as AsyncWithIdFileSystem,
  FileFormat as AsyncFileFormat,
  type FileMetadata as AsyncFileMetadata,
} from "./promises/with-id";
export {
  CachedFileSystem as AsyncCachedFileSystem,
  createCachedFileSystem as createAsyncCachedFileSystem,
  type CachedFileSystemOptions as AsyncCachedFileSystemOptions,
} from "./promises/cached";
