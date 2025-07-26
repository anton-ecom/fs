# Filesystem Architecture - Sync vs Async Separation

## Summary

The SYNET filesystem package has been restructured to provide a clear separation between synchronous and asynchronous operations, with cloud storage backends only available through the async interface.

## Architecture Decision

### Problem
The original implementation attempted to provide synchronous interfaces for cloud storage (S3, GCS, GitHub) using busy-wait patterns and libraries like `deasync`. This approach:

1. **Blocked the event loop** - Preventing Node.js from processing other operations
2. **Consumed excessive CPU** - Busy-wait loops used 100% CPU while waiting
3. **Was fundamentally flawed** - Node.js is designed around async operations
4. **Provided poor user experience** - Operations would freeze applications
5. **Was not needed** - Cloud operations are naturally async and should be treated as such

### Solution
Clear separation of concerns:

- **Sync operations** → Local/fast backends only (`node`, `memory`)
- **Async operations** → All backends including cloud storage (`node`, `memory`, `s3`, `gcs`, `github`)

## Updated Interface

### Synchronous Filesystem (Local Only)
```typescript
import { FS } from '@synet/fs';

// Memory storage (fast, for testing)
const memFS = FS.sync.memory();
const content = memFS.readFileSync('./file.txt'); // immediate return

// Node.js filesystem (local files)
const nodeFS = FS.sync.node();
const data = nodeFS.readFileSync('./local-file.txt'); // immediate return
```

### Asynchronous Filesystem (All Backends)
```typescript
import { FS } from '@synet/fs';

// Local backends (async versions)
const asyncNodeFS = FS.async.node();
const localContent = await asyncNodeFS.readFile('./file.txt');

// Cloud storage (async only)
const s3FS = FS.async.s3({ bucket: 'my-bucket', region: 'us-east-1' });
const cloudContent = await s3FS.readFile('./cloud-file.txt');

const gcsFS = FS.async.gcs({ projectId: 'my-project', bucket: 'my-bucket' });
const gcsContent = await gcsFS.readFile('./gcs-file.txt');

const githubFS = FS.async.github({ owner: 'user', repo: 'repo', token: 'token' });
const gitContent = await githubFS.readFile('./git-file.txt');
```

## Backend Support Matrix

| Backend | Sync | Async | Notes |
|---------|------|-------|-------|
| `memory` | ✅ | ✅ | In-memory storage, great for testing |
| `node` | ✅ | ✅ | Local filesystem operations |
| `s3` | ❌ | ✅ | AWS S3 cloud storage (async only) |
| `gcs` | ❌ | ✅ | Google Cloud Storage (async only) |
| `github` | ❌ | ✅ | Git-based storage (async only) |

## Factory Functions

### FS.sync (Local Operations)
```typescript
FS.sync.memory()    // In-memory filesystem
FS.sync.node()      // Local Node.js filesystem
```

### FS.async (All Operations)
```typescript
FS.async.memory()                    // Async in-memory
FS.async.node()                      // Async local filesystem
FS.async.s3(options)                 // AWS S3
FS.async.gcs(options)                // Google Cloud Storage  
FS.async.github(options)             // GitHub storage
```

### Presets
```typescript
FS.presets.development()             // Fast sync memory
FS.presets.developmentAsync()        // Fast async memory
FS.presets.local()                   // Sync local files
FS.presets.localAsync()              // Async local files
FS.presets.productionS3(options)     // S3 for production
FS.presets.productionGCS(options)    // GCS for production
FS.presets.git(options)              // Git-based storage
```

## Benefits

1. **Clear Intent** - Sync = local/fast, Async = all operations including cloud
2. **Better Performance** - No busy-wait patterns blocking the event loop
3. **Proper Architecture** - Cloud operations use async as intended
4. **Type Safety** - TypeScript prevents mixing incompatible patterns
5. **Developer Experience** - No confusing timeouts or freezing applications

## Migration Guide

### Old Code (Deprecated)
```typescript
// This was problematic - sync cloud operations
const s3FS = FS.sync.s3(options);
const content = s3FS.readFileSync('./file.txt'); // Would freeze application
```

### New Code (Recommended)
```typescript
// Proper async cloud operations
const s3FS = FS.async.s3(options);
const content = await s3FS.readFile('./file.txt'); // Non-blocking
```

### For Local Operations
```typescript
// Still available and unchanged
const localFS = FS.sync.node();
const content = localFS.readFileSync('./local-file.txt'); // Fast and immediate
```

## Implementation Details

- Removed `deasync` dependency
- Removed sync versions of cloud storage adapters
- Updated TypeScript types to enforce separation
- All tests pass with the new architecture
- Legacy `FileSystems` factory still works but redirects cloud operations to async

## Files Modified

- `src/filesystem-unit.ts` - Removed cloud backends from sync interface
- `src/fs.ts` - Updated factory functions and presets
- `src/index.ts` - Reorganized exports with clear sync/async separation
- Removed problematic sync test files
- Updated documentation and examples

This architecture provides a solid foundation for future development with clear boundaries and proper async handling for cloud operations.
