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
                    
                    
                                     
version: v.2.0.3
```

**Stop fighting with Node's filesystem.** Abstract files, test everything, teach AI agents to manage your data.

```typescript
import { FileSystem } from '@synet/fs';

// Works like you'd expect
const fs = FileSystem.create({ adapter: new NodeFileSystem() });
const content = fs.readFile('./config.json');

// But then it scales...
const agent = Smith.create({ ai });
agent.learn([fs.teach()]); // Now Smith can manage files
await agent.run("Organize all documents by date, create backup manifest");
```

## Why This Exists

You've been there:
- `fs.readFileSync()` scattered throughout your codebase
- No easy way to test filesystem operations
- Mixing sync and async operations unpredictably
- Hard to add caching, encryption, or observability
- Can't teach safe file operations to AI agents

**This solves it.** Clean abstractions, dependency injection, predictable behavior.

## When To Use This vs Raw fs

**Use Node's `fs` when:**
- Building a simple script  
- One-off file operations
- Maximum performance critical

**Use `@synet/fs` when:**
- Building with AI agents
- Need testable file operations  
- Want composable adapters
- Working across multiple storage backends
- Building production applications


```bash
npm install @synet/fs
```

## Real-World Examples

### AI Agent File Management
```typescript
import { Smith } from '@synet/agent';
import { createAIFileSystem } from '@synet/fs-ai';
import { AsyncFileSystem, AsyncNodeFileSystem } from '@synet/fs/promises';

const baseFs = AsyncFileSystem.create({ 
  adapter: new AsyncNodeFileSystem() 
});

// Create AI-safe filesystem with security boundaries
const aiFs = createAIFileSystem(baseFs, {
  homePath: process.cwd(),
  allowedPaths: ['./data', './reports', './uploads'],
  allowedOperations: ['readFile', 'writeFile', 'exists', 'ensureDir', 'readDir'],
  readOnly: false,
  maxDepth: 5
});

// Teach AI agents to manage files safely
const agent = Smith.create({ ai });
agent.learn([aiFs.teach()]);

// Let AI organize your files
await agent.run(`
  1. Read all JSON files in ./data
  2. Group them by date and category
  3. Create organized folder structure
  4. Generate summary report of file organization
`);
```

### Testable File Operations
```typescript
import { FileSystem, NodeFileSystem } from '@synet/fs';
import { MemFileSystem } from '@synet/fs-memory';

class DocumentService {
  constructor(private fs: FileSystem) {}
  
  saveDocument(name: string, content: string): void {
    this.fs.ensureDir('./documents');
    this.fs.writeFile(`./documents/${name}.md`, content);
  }
  
  loadDocument(name: string): string | null {
    const path = `./documents/${name}.md`;
    return this.fs.exists(path) ? this.fs.readFile(path) : null;
  }
}

// Production: Real filesystem
const prodService = new DocumentService(
  FileSystem.create({ adapter: new NodeFileSystem() })
);

// Testing: In-memory filesystem  
const testService = new DocumentService(
  FileSystem.create({ adapter: new MemFileSystem() })
);
```

### Cloud Storage Made Simple
```typescript
import { AsyncFileSystem } from '@synet/fs/promises';
import { S3FileSystem } from '@synet/fs-s3';
import { GitHubFileSystem } from '@synet/fs-github';

// S3 storage with local filesystem interface
const s3Fs = AsyncFileSystem.create({
  adapter: new S3FileSystem({
    region: 'us-east-1',
    bucket: 'my-app-storage'
  })
});

// GitHub as file storage with version control
const githubFs = AsyncFileSystem.create({
  adapter: new GitHubFileSystem({
    owner: 'myorg',
    repo: 'configs',
    token: process.env.GITHUB_TOKEN
  })
});

// Same interface, different backends
await s3Fs.writeFile('backup.json', data);
await githubFs.writeFile('config.json', settings);
```

## Core Advantages

### 1. **Clean Dependency Injection**
```typescript
// Before: Tightly coupled, hard to test
import fs from 'node:fs';

class UserService {
  saveUser(user: User) {
    fs.writeFileSync('/data/users.json', JSON.stringify(user));
  }
}

// After: Injectable, testable
import { FileSystem } from '@synet/fs';

class UserService {
  constructor(private fs: FileSystem) {}
  
  saveUser(user: User) {
    this.fs.writeFile('/data/users.json', JSON.stringify(user));
  }
}
```

### 2. **Predictable Behavior (No Zalgo)**
Traditional filesystem code mixes sync and async unpredictably:

```typescript
// ❌ Zalgo released - unpredictable returns
class BadConfigService {
  loadConfig(): Config | Promise<Config> {
    if (this.shouldUseCache()) {
      return JSON.parse(fs.readFileSync('./config.json', 'utf8')); // sync
    } else {
      return fs.promises.readFile('./config.json', 'utf8') // async
        .then(content => JSON.parse(content));
    }
  }
}
```

With strict interfaces, you choose once and stay consistent:

```typescript
// ✅ Always sync
class SyncConfigService {
  constructor(private fs: FileSystem) {}
  
  loadConfig(): Config {
    return JSON.parse(this.fs.readFile('./config.json'));
  }
}

// ✅ Always async
class AsyncConfigService {
  constructor(private fs: AsyncFileSystem) {}
  
  async loadConfig(): Promise<Config> {
    const content = await this.fs.readFile('./config.json');
    return JSON.parse(content);
  }
}
```

### 3. **Composable Adapters**
Layer functionality without changing core logic:

```typescript
const baseFs = new NodeFileSystem();
const observableFs = new ObservableFileSystem(baseFs);
const cachedFs = new CachedFileSystem(observableFs);

// Now you have: caching + observability + real filesystem
```

## Architecture Foundation

Built on **Unit Architecture** - components that know themselves, teach capabilities, and compose intelligently.

### FileSystem Unit (Sync)
```typescript
import { FileSystem, NodeFileSystem } from '@synet/fs';
import { MemFileSystem } from '@synet/fs-memory';

const fs = FileSystem.create({ adapter: new NodeFileSystem() });
const content = fs.readFile('./file.txt'); // Returns string directly

// Or with memory adapter for testing
const memFs = FileSystem.create({ adapter: new MemFileSystem() });
```

### AsyncFileSystem Unit (Async)
```typescript
import { AsyncFileSystem, AsyncNodeFileSystem } from '@synet/fs/promises';
import { MemFileSystem } from '@synet/fs-memory/promises';

const asyncFs = AsyncFileSystem.create({ adapter: new AsyncNodeFileSystem() });
const content = await asyncFs.readFile('./file.txt'); // Returns Promise<string>
```

### AI-Safe Filesystem
```typescript
import { createAIFileSystem } from '@synet/fs-ai';

const aiFs = createAIFileSystem(baseFs, {
  homePath: process.cwd(),
  allowedPaths: ['./data', './uploads'],
  allowedOperations: ['readFile', 'writeFile', 'readDir'],
  readOnly: false,
  maxDepth: 3
});

// Teach AI agents to manage files safely
const agent = Smith.create({ ai });
agent.learn([aiFs.teach()]);

const content = await asyncUnit.readFile('./file.txt'); // Returns Promise<string>

// Or with memory adapter
const memAsyncUnit = AsyncFileSystem.create({ adapter: new MemFileSystem() });
```

## Available Implementations

### Clean FS Factory Usage

The `FS` factory provides quick access to filesystem units:

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
const events = observableFs.getEventEmitter();

// Listen to filesystem events with Unit consciousness
events.on((event) => {
  console.log(`${event.type}: ${event.data.filePath}`);
  if (event.error) {
    console.log(`Error: ${event.error.message}`);
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

## What's Next

```typescript
import { Smith } from '@synet/agent';
import { createAIFileSystem } from '@synet/fs-ai';
import { AsyncFileSystem, AsyncNodeFileSystem } from '@synet/fs/promises';

// AI Locked, can't mess with your filesystem, can do things autonomously
const fs = AsyncFileSystem.create({ adapter: new AsyncNodeFileSystem() });
const aiFs = createAIFileSystem(fs, {
  homePath: process.cwd(),
  allowedPaths: ['./'],
  allowedOperations: ['readFile', 'writeFile', 'readDir', 'ensureDir']
});

const agent = Smith.create({ ai });
agent.learn([aiFs.teach()]);

// The future is AI agents that understand your filesystem
await agent.run("Organize project files, create documentation index, backup important data");

// Yes, it works
```

Want to see more? Check out [@synet/agent](https://github.com/synthetism/agent) and [Unit Architecture](https://github.com/synthetism/unit).

## Advanced Features Available

For enterprises and specialized use cases, we've developed **High Security File System (HSFS)** with features like:

- **Access Control**: 2FA, verifiable credentials, identity-based permissions
- **Audit Trails**: Complete access history with remote event streams
- **File Integrity**: Checksum validation, tamper detection, auto-restore
- **Zero Knowledge**: Prove ownership without revealing contents
- **Multi-signature**: Require multiple approvals for sensitive operations
- **Time Controls**: Auto-destruct, time-bound access, expiration

*Some advanced features available separately. [Contact me](mailto:anton@synthetism.ai) for enterprise licensing.*

## License

MIT - Build whatever you want.

