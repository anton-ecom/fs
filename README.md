# @synet/fs

```bash
  /$$$$$$                                  /$$  
 /$$__  $$                                | $$  
| $$  \__/ /$$   /$$ /$$$$$$$   /$$$$$$  /$$$$$$  
|  $$$$$$ | $$  | $$| $$__  $$ /$$__  $$|_  $$_/  
 \____  $$| $$  | $$| $$  \ $$| $$$$$$$$  | $$  
 /$$  \ $$| $$  | $$| $$  | $$| $$_____/  | $$ /$$
|  $$$$$$/|  $$$$$$$| $$  | $$|  $$$$$$$  |  $$$$/
 \______/  \____  $$|__/  |__/ \_______/   \___/  
           /$$  | $$  
          |  $$$$$$/  
           \______/   
       /$$$$$$$$ /$$$$$$  
      | $$_____//$$__  $$   
      | $$     | $$  \__/   
      | $$$$$  |  $$$$$$  
      | $$__/   \____  $$   
      | $$      /$$  \ $$   
      | $$     |  $$$$$$/   
      |__/      \______/  
                    
                    
                                     
version: v.2.0.0
description: Files are artefacts of identity
```

**Installation**:

```
npm i @synet/fs
```

# Filesystem Pattern Implementations

## Overview

This pattern provides a consistent filesystem abstraction that enables dependency injection, testing, and observability across your applications. By abstracting filesystem operations behind interfaces, you can easily swap implementations, add functionality like caching or encryption, and monitor file operations. By consistently using patter of interface injection yoy avoid mixing sync and async in one component (Or else Zalgo is released).

## Why Use This Over Traditional `fs`?

### 1. **Dependency Injection & Testability**

Traditional filesystem code is tightly coupled to Node.js `fs` module, making testing difficult:

```typescript
// ❌ Hard to test - tightly coupled to fs
import fs from 'node:fs';

export class UserService {
  saveUser(user: User) {
    fs.writeFileSync('/data/users.json', JSON.stringify(user));
  }
}
```

With the abstraction:

```typescript
// ✅ Easy to test - uses dependency injection
import { IFileSystem } from '@synet/fs';

export class UserService {
  constructor(private fs: IFileSystem) {}
  
  saveUser(user: User) {

    // ❌ Cant use that 
    this.fs.writeFile('/data/users.json', JSON.stringify(user));
 
    // ✅  Only sync methods available
    this.fs.writeFileSync('/data/users.json', JSON.stringify(user));
      
  }
}
```

Async and Sync can't be mixed in one component = predictable behaviour, no Zalgo surprises.

```typescript

// ✅ Easy to test - uses dependency injection with predictable async. 
import { IAsyncFileSystem } from '@synet/fs/promises';

export class UserService {
  constructor(private fs: IAsyncFileSystem) {}
  
  saveUser(user: User) {
     
     // ❌ Cant use that 
     this.fs.writeFileSync('/data/users.json', JSON.stringify(user));

    // ✅  Only Async methods available
     this.fs.writeFile('/data/users.json', JSON.stringify(user));

  }
}
```

### 2. **Multiple Implementations**

Easily switch between different storage backends:

```typescript
// Production: Use real filesystem
const userService = new UserService(new NodeFileSystem());

// Testing: Use in-memory filesystem
const userService = new UserService(new MemFileSystem());

// With observability: Monitor file operations
const observableFs = new ObservableFileSystem(new NodeFileSystem());
const userService = new UserService(observableFs);
```

### 3. **Composition & Decoration**

Layer additional functionality without changing core logic:

```typescript
const baseFs = new NodeFileSystem();
const observableFs = new ObservableFileSystem(baseFs);
const encryptedFs = new EncryptedFileSystem(observableFs);
const cachedFs = new CachedFileSystem(encryptedFs);

// Now you have: caching + encryption + observability + real filesystem
```

### 4. Do Not Release Zalgo

Traditional filesystem code often mixes sync and async operations within the same component, creating unpredictable behavior patterns a.k.a "[unleashing Zalgo](https://blog.izs.me/2013/08/designing-apis-for-asynchrony/)"

```typescript
// ❌ BAD: Mixed sync/async in one component
class BadConfigService {
  loadConfig(): Config | Promise<Config> {
    if (this.shouldUseCache()) {
      // Synchronous path - returns immediately
      return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } else {
      // Asynchronous path - returns Promise
      return fs.promises.readFile('./config.json', 'utf8')
        .then(content => JSON.parse(content));
    }
  }
}

// Consumer never knows what they'll get!
const result = configService.loadConfig();
// Is it Config or Promise<Config>? 🤷‍♂️
```

With strict interface, you choose your paradigm upfront and stick to it:

```typescript
// ✅ GOOD: Consistent sync interface
class SyncConfigService {
  constructor(private fs: FileSystem) {} // Always sync
  
  loadConfig(): Config {
    return JSON.parse(this.fs.readFile('./config.json'));
  }
}

// ✅ GOOD: Consistent async interface  
class AsyncConfigService {
  constructor(private fs: AsyncFileSystem) {} // Always async
  
  async loadConfig(): Promise<Config> {
    const content = await this.fs.readFile('./config.json');
    return JSON.parse(content);
  }
}
```

**Keep Zalgo locked away** - your components are predictable, your consumers know exactly what to expect, types enforce right behaviour on compile time.

### FileSystem and AsyncFileSystem Units

The FS pattern is built on two foundational **Units** that follow the Unit Architecture and Unit Driven Design best practices:

#### FileSystem Unit (Sync)
```typescript
import { FileSystem, NodeFileSystem } from '@synet/fs';
import { MemFileSystem } from '@synet/fs-memory';

const syncUnit = FileSystem.create({ adapter: new NodeFileSystem() });
const content = syncUnit.readFile('./file.txt'); // Returns string directly

// Or with memory adapter
const memSyncUnit = FileSystem.create({ adapter: new MemFileSystem() });
```

#### AsyncFileSystem Unit (Async)
```typescript
import { AsyncFileSystem, AsyncNodeFileSystem } from '@synet/fs/promises';
import { MemFileSystem } from '@synet/fs-memory/promises';

const asyncUnit = AsyncFileSystem.create({ adapter: new AsyncNodeFileSystem() });
const content = await asyncUnit.readFile('./file.txt'); // Returns Promise<string>

// Or with memory adapter
const memAsyncUnit = AsyncFileSystem.create({ adapter: new MemFileSystem() });
```

## Available Implementations

### Clean FS Factory Usage

The `FS` factory provides organized access to filesystem units:

```typescript
import { FS } from '@synet/fs';

// Sync filesystems (local operations only)
const syncFs = FS.sync.node();
const content = syncFs.readFile('./file.txt'); // Returns string

// Async filesystems (local and cloud)
const asyncFs = FS.async.node();
const content = await asyncFs.readFile('./file.txt'); // Returns Promise<string>
```

### `NodeFileSystem` (Sync/Async)
NodeFileSystem included in `@synet/fs` package:

```typescript
// Synchronous
import { NodeFileSystem, IFileSystem } from '@synet/fs';
const syncFs = new NodeFileSystem();

// Asynchronous
import { AsyncNodeFileSystem, IAsyncFileSystem } from '@synet/fs/promises';
const asyncFs = new AsyncNodeFileSystem();
```

### `MemFileSystem` (Sync/Async)

In-memory filesystem for testing from separate `@synet/fs-memory` package:

```typescript
// Synchronous
import { MemFileSystem } from '@synet/fs-memory';
const memFs = new MemFileSystem();

// Asynchronous
import { MemFileSystem } from '@synet/fs-memory/promises';
const asyncMemFs = new MemFileSystem();
```

### Observable Implementations

The `ObservableFileSystem` wraps any base filesystem and emits events for monitoring:

```typescript
// Synchronous Observable
import { ObservableFileSystem, FilesystemEventTypes, NodeFileSystem } from '@synet/fs';

// Asynchronous Observable
import { 
  AsyncObservableFileSystem, 
  AsyncFilesystemEventTypes, 
  AsyncNodeFileSystem 
} from '@synet/fs/promises';

// Monitor specific operations
const observableFs = new ObservableFileSystem(
  new NodeFileSystem(),
  [FilesystemEventTypes.WRITE, FilesystemEventTypes.DELETE] // Only emit write/delete events
);

// Monitor all operations (async)
const asyncObservableFs = new AsyncObservableFileSystem(new AsyncNodeFileSystem());

// Listen to events
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
  update(event) {
    console.log(`File written: ${event.data.filePath}`);
  }
});
```

### WithIdFileSystem (Sync/Async)

**Smart file storage with deterministic IDs and human-readable aliases**

Ever struggled with the classic dilemma: use meaningful filenames for humans or stable IDs for databases? `WithIdFileSystem` solves this beautifully by giving every file both - a deterministic ID for your database keys and a readable alias for human reference.

#### Before

Traditional approaches force you to choose:

```typescript
// ❌ Option A: Human readable, but unstable for database keys
const filename = `${user.name.replace(/\s+/g, '-')}-profile.json`;

// ❌ Option B: Stable ID, but cryptic for humans  
const filename = `${uuid()}.json`;

// ❌ Manual mapping: Brittle and error-prone
const fileRegistry = new Map<string, string>(); // ID -> filename
```

#### After

```typescript
// ✅ Best of both worlds
import { WithIdFileSystem, FileFormat, NodeFileSystem } from '@synet/fs';

const withIdFs = new WithIdFileSystem(new NodeFileSystem());

// Save with meaningful path
withIdFs.writeFileSync('./vault/profiles/user1.json', profileData);

// Get stable ID for database
const id = withIdFs.getId('./vault/profiles/user1.json'); 
// Returns: "a1b2c3d4e5f6g7h8"

// Get readable alias for humans
const alias = withIdFs.getAlias('./vault/profiles/user1.json'); 
// Returns: "vault-profiles-user1"

// Access file three ways:
const content1 = withIdFs.readFileSync('./vault/profiles/user1.json'); // Original path
const content2 = withIdFs.getByIdOrAlias('a1b2c3d4e5f6g7h8');           // By ID
const content3 = withIdFs.getByIdOrAlias('vault-profiles-user1');       // By alias
```

#### Key Features

- **Deterministic IDs**: Same path always generates the same ID
- **Human-readable aliases**: Path-based aliases (e.g., `vault-profiles-user1`)
- **Triple access**: Read files by original path, ID, or alias
- **Format validation**: Optional file format checking
- **Metadata tracking**: Complete file metadata management
- **Storage format**: Files stored as `basename:alias-id.ext`

#### Usage

```typescript
const userFs = new WithIdFileSystem(nodeFs);

// User uploads avatar
userFs.writeFileSync('./users/john-doe/avatar.jpg', imageData);

// Store stable reference in database
const avatarId = userFs.getId('./users/john-doe/avatar.jpg');
await db.users.update('john-doe', { avatarId });

// Later, serve avatar by ID (works even if user renames file)
app.get('/avatar/:userId', async (req, res) => {
  const user = await db.users.findById(req.params.userId);
  const avatar = userFs.getByIdOrAlias(user.avatarId, FileFormat.JPG);
  res.type('image/jpeg').send(avatar);
});
```

#### Async Usage

```typescript
import { AsyncWithIdFileSystem, AsyncNodeFileSystem } from '@synet/fs/promises';

const asyncWithIdFs = new AsyncWithIdFileSystem(new AsyncNodeFileSystem());

// All operations are async
await asyncWithIdFs.writeFile('./data.json', jsonData);
const id = asyncWithIdFs.getId('./data.json'); // Still sync - metadata only
const content = await asyncWithIdFs.getByIdOrAlias(id, FileFormat.JSON);
```

### GitHubFileSystem (Async)

**Version-controlled file storage using GitHub repositories with automatic commit and sync**

What if you could use GitHub as a simple file storage with automatic version control? Tired of manually managing config files, documentation, or small datasets across environments? `GitHubFileSystem` turns any GitHub repository into a seamless filesystem with automatic commits, intelligent caching, and full version history.

Available as separate package `@synet/fs-github`:

```bash
npm install @synet/fs-github
```

#### Before

Traditional file storage solutions often lack:

```typescript
// ❌ No version control for important configs
fs.writeFileSync('./config.json', JSON.stringify(newConfig));
// Lost: who changed what, when, and why

// ❌ Manual sync between environments  
fs.copyFileSync('./local-config.json', './staging-config.json');
// Error-prone and requires manual intervention

// ❌ No backup or history
fs.writeFileSync('./important-data.json', data);
// One corruption = data loss
```

#### After

Just use github.

```typescript
// ✅ Automatic version control with meaningful commits
import { GitHubFileSystem } from '@synet/fs-github';

const ghFs = new GitHubFileSystem({
  owner: 'myorg',
  repo: 'configs',
  token: process.env.GITHUB_TOKEN,
  path: 'environments/production'
});

// Write files with automatic commits
await ghFs.writeFile('./config.json', JSON.stringify(newConfig));
// Automatically commits: "Update config.json"

// Read files with intelligent caching
const config = JSON.parse(await ghFs.readFile('./config.json'));

// Full directory operations
await ghFs.ensureDir('./backups');
const files = ghFs.readdir('./');
```

#### Key Features

- **Automatic Commits**: Every write operation creates a meaningful commit
- **Intelligent Caching**: LRU cache with TTL to minimize API calls
- **Path Normalization**: Works with relative and absolute paths
- **Full IAsyncFileSystem Compatibility**: Drop-in replacement for any async filesystem
- **Error Handling**: Graceful handling of network issues and API limits
- **Version History**: Access to full Git history and file metadata

#### Usage

```typescript
import { GitHubFileSystem } from '@synet/fs-github';
import { AsyncFileSystem } from '@synet/fs/promises';

// Use as adapter in FileSystem Unit
const configFs = AsyncFileSystem.create({ 
  adapter: new GitHubFileSystem({
    owner: 'mycompany',
    repo: 'app-configs',
    token: process.env.GITHUB_TOKEN,
    path: 'production',
    branch: 'main'
  })
});

// Store application config
await configFs.writeFile('./app.json', JSON.stringify({
  database: { host: 'prod-db.example.com' },
  redis: { url: 'redis://prod-redis:6379' }
}));

// Load config from GitHub (cached automatically)
const config = JSON.parse(await configFs.readFile('./app.json'));

// Manage documentation
await configFs.ensureDir('./docs');
await configFs.writeFile('./docs/deployment.md', deploymentGuide);

// Check what files exist
const hasConfig = await configFs.exists('./app.json');
const allFiles = await configFs.readDir('./');
```

### S3FileSystem (Async)

**AWS S3 cloud storage with local filesystem interface and intelligent caching**

Need to store files in the cloud but want to keep using the familiar filesystem interface? `S3FileSystem` makes AWS S3 feel like a local drive with smart caching, automatic content type detection, and seamless bucket operations. Perfect for cloud-native applications that need scalable file storage without the complexity.

Available as separate package `@synet/fs-s3`:

```bash
npm install @synet/fs-s3
```

#### Perfect For

- **Cloud-native applications**: Store files in S3 with local filesystem simplicity
- **Configuration management**: Keep config files in S3 buckets with easy access
- **Document storage**: Handle uploads, downloads, and file organization
- **Multi-environment deployments**: Same code works locally and in production
- **Distributed systems**: Share files across services via S3

#### Basic Usage

```typescript
import { S3FileSystem } from '@synet/fs-s3';
import { AsyncFileSystem } from '@synet/fs/promises';

// Use as adapter in FileSystem Unit
const s3fs = AsyncFileSystem.create({
  adapter: new S3FileSystem({
    region: 'us-east-1',
    bucket: 'my-app-files'
  })
});

// Write files to S3 like local filesystem
await s3fs.writeFile('config/app.json', JSON.stringify(config));
await s3fs.writeFile('uploads/image.jpg', imageBuffer);

// Read files from S3
const config = JSON.parse(await s3fs.readFile('config/app.json'));
const exists = await s3fs.exists('uploads/image.jpg');

// List S3 "directories"
const files = await s3fs.readDir('uploads/');

// File operations
const stats = await s3fs.stat('config/app.json');
console.log(`File size: ${stats.size} bytes`);
```

#### Advanced Configuration

```typescript
import { S3FileSystem } from '@synet/fs-s3';

const s3Adapter = new S3FileSystem({
  region: 'eu-west-1',
  bucket: 'production-storage',
  prefix: 'app-data/',           // All files prefixed with 'app-data/'
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: 'https://s3.example.com',  // For S3-compatible services
  forcePathStyle: true            // For non-AWS S3 services
});

const s3fs = AsyncFileSystem.create({ adapter: s3Adapter });

// Files are stored at: s3://production-storage/app-data/...
```

#### Key Features

- **Intelligent caching**: Files and metadata cached in memory for performance
- **Content type detection**: Automatic MIME type setting based on file extension
- **Path normalization**: Handles various path formats consistently
- **Prefix support**: Namespace files with bucket prefixes
- **Error handling**: Graceful handling of S3 errors and edge cases
- **S3-compatible**: Works with AWS S3 and compatible services (MinIO, DigitalOcean Spaces)

### AzureBlobFileSystem (Async)

**Microsoft Azure Blob Storage with local filesystem interface and intelligent caching**

Seamlessly integrate Azure Blob Storage into your application with the familiar filesystem API. Perfect for Azure-native applications that need scalable cloud storage without complexity.

Available as separate package `@synet/fs-azure`:

```bash
npm install @synet/fs-azure
```

```typescript
import { AzureBlobFileSystem } from '@synet/fs-azure';
import { AsyncFileSystem } from '@synet/fs/promises';

const azureAdapter = new AzureBlobFileSystem({
  accountName: 'mystorageaccount',
  accountKey: process.env.AZURE_STORAGE_KEY,
  containerName: 'mycontainer',
  prefix: 'app-data/' // Optional: namespace all files
});

const azureFS = AsyncFileSystem.create({ adapter: azureAdapter });

// Use like any filesystem
await azureFS.writeFile('config.json', JSON.stringify(config));
const data = await azureFS.readFile('config.json');
const files = await azureFS.readDir('uploads/');
```

**Key Features**: SAS token support, container management, metadata handling, CDN integration, geo-replication support.

### GoogleCloudFileSystem (Async)

**Google Cloud Storage with seamless file operations and automatic authentication**

Store files in Google Cloud Storage with automatic authentication and intelligent caching. Ideal for GCP-native applications.

Available as separate package `@synet/fs-gcs`:

```bash
npm install @synet/fs-gcs
```

```typescript
import { GoogleCloudFileSystem } from '@synet/fs-gcs';
import { AsyncFileSystem } from '@synet/fs/promises';

const gcsAdapter = new GoogleCloudFileSystem({
  projectId: 'my-gcp-project',
  bucketName: 'my-storage-bucket',
  keyFilename: './path/to/service-account.json', // Optional
  prefix: 'app-files/' // Optional: namespace all files
});

const gcsFS = AsyncFileSystem.create({ adapter: gcsAdapter });

// Standard filesystem operations
await gcsFS.writeFile('documents/report.pdf', pdfBuffer);
const exists = await gcsFS.exists('documents/report.pdf');
const stats = await gcsFS.stat('documents/report.pdf');
```

**Key Features**: Service account authentication, IAM integration, lifecycle management, versioning support, global CDN.

### DigitalOceanSpacesFileSystem (Async)

**DigitalOcean Spaces (S3-compatible) storage with global CDN integration**

Leverage DigitalOcean Spaces for cost-effective object storage with built-in CDN and S3 compatibility.

Available as separate package `@synet/fs-digitalocean`:

```bash
npm install @synet/fs-digitalocean
```

```typescript
import { DigitalOceanSpacesFileSystem } from '@synet/fs-digitalocean';
import { AsyncFileSystem } from '@synet/fs/promises';

const doAdapter = new DigitalOceanSpacesFileSystem({
  endpoint: 'https://sgp1.digitaloceanspaces.com',
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  bucket: 'my-space',
  region: 'sgp1',
  prefix: 'app-storage/' // Optional
});

const doFS = AsyncFileSystem.create({ adapter: doAdapter });

// S3-compatible operations with DO Spaces benefits
await doFS.writeFile('static/image.jpg', imageBuffer);
const files = await doFS.readDir('static/');
```

**Key Features**: Global CDN integration, S3-compatible API, cost-effective pricing, multiple region support.

### CloudflareR2FileSystem (Async)

**Cloudflare R2 storage with zero egress fees and global edge distribution**

Store files in Cloudflare R2 with zero egress costs and global edge performance, perfect for high-traffic applications.

Available as separate package `@synet/fs-cloudflare`:

```bash
npm install @synet/fs-cloudflare
```

```typescript
import { CloudflareR2FileSystem } from '@synet/fs-cloudflare';
import { AsyncFileSystem } from '@synet/fs/promises';

const r2Adapter = new CloudflareR2FileSystem({
  accountId: 'your-cloudflare-account-id',
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: 'my-r2-bucket',
  region: 'auto',
  prefix: 'content/' // Optional
});

const r2FS = AsyncFileSystem.create({ adapter: r2Adapter });

// Zero egress costs for file operations
await r2FS.writeFile('assets/logo.png', logoBuffer);
const content = await r2FS.readFile('assets/logo.png');
```

**Key Features**: Zero egress fees, S3-compatible API, global edge performance, automatic scaling, integrated with Cloudflare Workers.

---

### LinodeObjectStorageFileSystem (Async)

**Linode Object Storage (S3-compatible) with global edge distribution and competitive pricing**

Store files in Linode Object Storage with S3-compatible API, competitive pricing, and global edge distribution. Perfect for cost-effective cloud storage.

Available as separate package `@synet/fs-linode`:

```bash
npm install @synet/fs-linode
```

```typescript
import { LinodeObjectStorageFileSystem } from '@synet/fs-linode';
import { AsyncFileSystem } from '@synet/fs/promises';

const linodeAdapter = new LinodeObjectStorageFileSystem({
  region: 'sg-sin-1',
  bucket: 'my-linode-bucket',
  accessKey: process.env.LINODE_ACCESS_KEY,
  secretKey: process.env.LINODE_SECRET_KEY,
  prefix: 'app-data/' // Optional
});

const linodeFS = AsyncFileSystem.create({ adapter: linodeAdapter });

// Cost-effective file operations
await linodeFS.writeFile('uploads/document.pdf', pdfBuffer);
const content = await linodeFS.readFile('uploads/document.pdf');
const stats = await linodeFS.stat('uploads/document.pdf');
const files = await linodeFS.readDir('uploads/');
```

**Key Features**: S3-compatible API, competitive pricing, global regions, intelligent caching, automatic content type detection, virtual directory support.

---

## Basic Examples

### Async Usage

```typescript
import { AsyncFileSystem, AsyncNodeFileSystem } from '@synet/fs/promises';
import { MemFileSystem } from '@synet/fs-memory/promises';

class AsyncConfigService {
  constructor(private fs: AsyncFileSystem) {}
  
  async loadConfig(): Promise<Config> {
    if (await this.fs.exists('./config.json')) {
      const content = await this.fs.readFile('./config.json');
      return JSON.parse(content);
    }
    return this.getDefaultConfig();
  }
  
  async saveConfig(config: Config): Promise<void> {
    await this.fs.ensureDir('./');
    await this.fs.writeFile('./config.json', JSON.stringify(config, null, 2));
  }
}

// Usage with Node filesystem
const nodeFs = AsyncFileSystem.create({ adapter: new AsyncNodeFileSystem() });
const asyncConfigService = new AsyncConfigService(nodeFs);
const config = await asyncConfigService.loadConfig();

// Usage with in-memory filesystem for testing
const memFs = AsyncFileSystem.create({ adapter: new MemFileSystem() });
const testConfigService = new AsyncConfigService(memFs);
```

### Sync Usage

```typescript
import { FileSystem, NodeFileSystem, IFileSystem } from '@synet/fs';
import { MemFileSystem } from '@synet/fs-memory';

class ConfigService {
  constructor(private fs: FileSystem) {}
  
  loadConfig(): Config {
    if (this.fs.exists('./config.json')) {
      const content = this.fs.readFile('./config.json');
      return JSON.parse(content);
    }
    return this.getDefaultConfig();
  }
  
  saveConfig(config: Config): void {
    this.fs.ensureDir('./');
    this.fs.writeFile('./config.json', JSON.stringify(config, null, 2));
  }
}

// Production with Node filesystem
const nodeFs = FileSystem.create({ adapter: new NodeFileSystem() });
const configService = new ConfigService(nodeFs);

// Testing with in-memory filesystem
const memFs = FileSystem.create({ adapter: new MemFileSystem() });
const testConfigService = new ConfigService(memFs);
```

### Testing with In-Memory Filesystem

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FileSystem } from '@synet/fs';
import { MemFileSystem } from '@synet/fs-memory';
import { ConfigService } from '../services/config-service';

describe('ConfigService', () => {
  let fs: FileSystem;
  let configService: ConfigService;
  
  beforeEach(() => {
    const memAdapter = new MemFileSystem();
    fs = FileSystem.create({ adapter: memAdapter });
    configService = new ConfigService(fs);
  });
  
  it('should save and load config', () => {
    const config = { theme: 'dark', language: 'en' };
  
    configService.saveConfig(config);
    const loaded = configService.loadConfig();
  
    expect(loaded).toEqual(config);
  });
  
  it('should return default config when file does not exist', () => {
    const config = configService.loadConfig();
    expect(config).toEqual(configService.getDefaultConfig());
  });
});
```

## **Complex Compositions ~Pyramids of Doom~ Examples**

The real power comes from combining these (don't try this at home):

```typescript
import { AsyncFileSystem } from '@synet/fs/promises';
import { S3FileSystem } from '@synet/fs-s3';
import { 
  AsyncObservableFileSystem,
  AsyncCachedFileSystem,
  AsyncWithIdFileSystem 
} from '@synet/fs/promises';

// Ultimate production filesystem stack
const s3Adapter = new S3FileSystem(s3Config);
const productionFs = AsyncFileSystem.create({
  adapter: new AsyncObservableFileSystem(
    new AsyncCachedFileSystem(
      new AsyncWithIdFileSystem(s3Adapter)
    )
  )
});

// Development with mocking and debugging
import { MemFileSystem } from '@synet/fs-memory/promises';

const devFs = AsyncFileSystem.create({
  adapter: new AsyncObservableFileSystem(
    new MemFileSystem()
  )
});

// Multi-cloud redundancy
import { GitHubFileSystem } from '@synet/fs-github';
import { AzureBlobFileSystem } from '@synet/fs-azure';

const multiCloudFs = AsyncFileSystem.create({
  adapter: new AsyncObservableFileSystem(
    new AsyncCachedFileSystem(
      new GitHubFileSystem(githubConfig) // Primary
      // Could add fallback to Azure in decorator pattern
    )
  )
});
```

## Conclusion

Filesystems are far more flexible architectural solution than storing data in Mysql with far greater security and future extention options. When coupled with [Remote Event](https://github.com/synthetism/patterns/blob/main/docs/realtime/realtime-events.md) you can observe, process and act on all filesystem requests - something can't be done with Mysql.

 As mentioned before, I've developed High Security File System (HSFS) for enterprises and security firms:

 **HSFS**:

- Emit [remote events](https://github.com/synthetism/patterns/blob/main/docs/realtime/realtime-events.md) to NATS Broker who accessed files and why.
- Mark classified files, protect access through 2FA/VC/NKeys.
- Limit scope of  access with VCs and identity who wrote the file.
- Keep history of access as part of the file.
- Integiry checks, violation flags, time-limit, auto-destruct, penetration alerts, readonly, writeonly, indestructable with auto-restoring.
- Selective disclosure protocols (text only), classification markings, traps (altered byte-sequencing/embedded ids for each read).
- ZKF/ZKF - Zero Knowledge Files - proof you ownership without revealing its contents.
- Passes - multi-user access with passwords. One-time, time-bound passwords.
- KYC - Store structured history of access with schemas.
- Multi-sig
- Auto-backup
- Multi-ACL - part is public, part is private, encrypted.
- Artefacts - Signed indestructable files. Know who created the file with delete/rewrite protection.
- Licensing

> Data is new gold.

Some of these features won't be shared here. If you want some of them, [let me know](mailto:anton@synthetism.ai)

Stay tuned new versions or ask anything from [REQUESTS](https://github.com/synthetism/fs/blob/main/REQUESTS.md)
