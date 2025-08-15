# Changelog

All notable changes to this project will be documented in this file.

Most patterns are highly stable, no changes will be made to existing methods, only extended, but I will adhere to adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) just in case. You can safely upgrade, but as always, RTFM (read changelog for major releases).

## [2.0.3] - 2025-08-15

### BREAKING

Onbservable filesystem now uses standard EventEmitter from @synet/unit. 

**Streamlined type**

```typescript 

// imported from @synet/unit, compatible behaviour with all new units starting from @synet/unit@1.0.9

export interface EventError {
  message: string;           // Universal: error description
  code?: string;            // Node.js: ENOENT, EACCES, etc. / Browser: could be HTTP codes
  path?: string;            // File operations
  syscall?: string;         // Node.js: 'open', 'write', etc.
  errno?: number;           // Node.js: error number
  stack?: string;           // Debug info (optional)
}

/**
 * Base event interface
 */
export interface Event {
  type: string;
  timestamp: Date;
  error?: EventError;
}

/**
 * Filesystem Event e
 */

export interface FilesystemEvent extends Event {
  type: FilesystemEventTypes;
  data: {
    filePath: string;
    result?: unknown;
  }
}

```

**EventEmitter new interface**

```typescript 
export interface IEventEmitter<TEvent extends Event = Event> {
  on<T extends TEvent>(type: string, handler: (event: T) => void): () => void;
  once<T extends TEvent>(type: string, handler: (event: T) => void): () => void;
  off(type: string): void;
  emit(event: TEvent): void;
  removeAllListeners(): void;
  listenerCount(type: string): number;
  eventTypes(): string[];
}
```

### Changed 

- Updated to Unit Architecture 1.0.9




## [2.0.1] - 2025-08-09

## Changed

- Using latest unit@1.0.8

## [2.0.0] - 2025-08-09

### BREAKING CHANGES

- **Package separation**: Cloud adapters moved to separate packages (`@synet/fs-s3`, `@synet/fs-github`, etc.)
- **Adapter pattern**: Units now use `adapter` property instead of `type` parameter
- **Import changes**: Async classes renamed (e.g., `NodeFileSystem` → `AsyncNodeFileSystem` in `/promises`)

### ACTION NEEDED

```typescript
// Before
const fs = FileSystem.create({ type: "memory" });
import { MemFileSystem } from '@synet/fs-memory/promises/memory';

// After  
const fs = FileSystem.create({ adapter: new NodeFileSystem() });
import { MemFileSystem } from '@synet/fs-memory/promises';
```

### ADDED

- Clean FS factory: `FS.sync.node()`, `FS.async.node()`
- Separate adapter packages for better modularity
- Improved documentation with correct import examples

## [1.0.8] - 2025-07-25

### ADDED

 - Akamai (linode) adapter, use FS.linode()

## [1.0.7] - 2025-07-25

### ADDED

 - Azure
 - Google Cloud
 - R2 (SHA-3 error on MacOs)
 - Digital Ocean


## [1.0.6] - 2025-07-21

### FIXED

- FileSYstem and ASyncFileSystem are now following Unit Architecture
- Changed dna ids - fs - for sync, and fs-async  for async operations
- Created fs-async full test suite.

## [1.0.5] - 2025-07-14

### Changed

- Updated dependencies

## [1.0.4] - 2025-07-12

### Changed

- Added FileSystem, AsyncFileSystem Units
- FS pattern - factory for building complex filesystem flows


## [1.0.2] - 2025-07-07

### Changed

- IFileSystem is moved from patterns


## [1.0.1] - 2025-06-29

### Added

- AnalyticsFileSystem
- CachedFileSystem
- GithubFileSystem
- JsonFileSystem
- S3FileSystem
- WithIdFileSystem

## [1.0.0] - 2025-04-01

### Added

- NodeFileSystem
- MemFileSystem
- Observable
