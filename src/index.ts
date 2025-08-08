// Main filesystem units and factory
export { FS, FileSystem, AsyncFileSystem, FileSystems } from "./fs";

// Core types
export type {
  SyncFilesystemBackendType,
  SyncFilesystemBackendOptions,
  SyncFilesystemConfig,
} from "./filesystem.unit";
export type {
  AsyncFilesystemBackendType,
  AsyncFilesystemBackendOptions,
  AsyncFilesystemConfig,
} from "./promises/async-filesystem.unit";

// Core interfaces
export { IFileSystem } from "./filesystem.interface";
export { IAsyncFileSystem } from "./promises/filesystem.interface";

// ==========================================
// SYNCHRONOUS IMPLEMENTATIONS (local/fast only)
// ==========================================

// Base sync implementations - truly synchronous
export { NodeFileSystem } from "./node";
export { MemFileSystem } from "./memory";

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

// ==========================================
// ASYNCHRONOUS IMPLEMENTATIONS (including cloud)
// ==========================================

// Base async implementations
export { NodeFileSystem as AsyncNodeFileSystem } from "./promises/node";
export { MemFileSystem as AsyncMemFileSystem } from "./promises/memory";

// Cloud storage implementations (async only)
export {
  S3FileSystem as AsyncS3FileSystem,
  createS3FileSystem as createAsyncS3FileSystem,
  type S3FileSystemOptions as AsyncS3FileSystemOptions,
} from "./promises/s3";
export {
  GCSFileSystem as AsyncGCSFileSystem,
  createGCSFileSystem as createAsyncGCSFileSystem,
  type GCSFileSystemOptions as AsyncGCSFileSystemOptions,
} from "./promises/gcs";
export {
  AzureBlobStorageFileSystem as AsyncAzureBlobStorageFileSystem,
  createAzureBlobStorageFileSystem as createAsyncAzureBlobStorageFileSystem,
  type AzureBlobStorageOptions as AsyncAzureBlobStorageOptions,
} from "./promises/azure";
export {
  CloudflareR2FileSystem as AsyncCloudflareR2FileSystem,
  createCloudflareR2FileSystem as createAsyncCloudflareR2FileSystem,
  type CloudflareR2Options as AsyncCloudflareR2Options,
} from "./promises/r2";
export {
  DigitalOceanSpacesFileSystem as AsyncDigitalOceanSpacesFileSystem,
  createDigitalOceanSpacesFileSystem as createAsyncDigitalOceanSpacesFileSystem,
  type DigitalOceanSpacesOptions as AsyncDigitalOceanSpacesOptions,
} from "./promises/digitalocean";
export {
  LinodeObjectStorageFileSystem as AsyncLinodeObjectStorageFileSystem,
  createLinodeObjectStorageFileSystem as createAsyncLinodeObjectStorageFileSystem,
  type LinodeObjectStorageFileSystemOptions as AsyncLinodeObjectStorageOptions,
} from "./promises/linode";
export {
  GitHubFileSystem as AsyncGitHubFileSystem,
  type GitHubFileSystemOptions as AsyncGitHubFileSystemOptions,
} from "./promises/github";

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

// Direct exports for convenience (main implementations)
export {
  CloudflareR2FileSystem,
  createCloudflareR2FileSystem,
  type CloudflareR2Options,
} from "./promises/r2";
export {
  AzureBlobStorageFileSystem,
  createAzureBlobStorageFileSystem,
  type AzureBlobStorageOptions,
} from "./promises/azure";
export {
  GCSFileSystem,
  createGCSFileSystem,
  type GCSFileSystemOptions,
} from "./promises/gcs";
export {
  DigitalOceanSpacesFileSystem,
  createDigitalOceanSpacesFileSystem,
  type DigitalOceanSpacesOptions,
} from "./promises/digitalocean";
