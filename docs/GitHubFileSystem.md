# GitHubFileSystem

Ever wished you could use GitHub as your application's free file storage? Tired of setting up S3 buckets, configuring credentials, and dealing with cloud storage complexities for simple file storage needs? Want built-in version control, collaboration features, and global CDN distribution without the enterprise price tag?

**Meet GitHubFileSystem.** It transforms any GitHub repository into a powerful, version-controlled file storage system. Store configuration files, user data, documentation, or any text-based content directly in GitHub repositories with automatic commits, branching, and full Git history. With encryption, you can even share secrets over the public repo or store signed files with VCs.

## Pain Points

### Traditional File Storage Challenges

**Before (Traditional Approaches):**

```typescript
// ❌ Complex cloud storage setup
import AWS from 'aws-sdk';
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-west-2'
});

// No version control, manual backup management
await s3.putObject({
  Bucket: 'my-app-files',
  Key: 'config/app.json',
  Body: JSON.stringify(config)
}).promise();

// Expensive for small projects
// No built-in collaboration
// No automatic versioning
// Complex permission management
// Amazon is evil
```

**After:**

```typescript
// ✅ Simple, powerful file storage with built-in version control
import { GitHubFileSystem } from '@synet/fs';

const fs = new GitHubFileSystem({
  token: process.env.GITHUB_TOKEN,
  owner: 'mycompany',
  repo: 'app-config'
});

// Automatic commits, full Git history, free hosting
await fs.writeFile('config/app.json', JSON.stringify(config));

// Free for public repos, cheap for private repos
// Built-in collaboration via GitHub
// Automatic versioning and history
// GitHub's robust permission system
```

## Use Cases

### Configuration Management

Store application configuration files with automatic versioning and easy rollback capabilities.

### Documentation Storage

Maintain documentation files with full edit history and collaborative editing through GitHub's interface. I use it all the time, syncing .md data-storage with near static front-ends.

### User Data Storage

Store user profiles, preferences, and lightweight data with built-in backup and version control.

### Content Management

Manage blog posts, articles, or any text-based content with Git-powered workflows.

### Prototyping & MVPs

Quickly deploy file storage for prototypes without setting up complex cloud infrastructure.

### Multi-Environment Configs

Use different branches for different environments (dev, staging, production).

## Examples

### Basic Usage

```typescript
import { GitHubFileSystem } from '@synet/fs';

// Initialize with repository
const fs = new GitHubFileSystem({
  token: 'ghp_your_token_here',
  owner: 'mycompany',
  repo: 'app-data',
  branch: 'main' // optional, defaults to 'main'
});

// Write files (automatically commits)
await fs.writeFile('config/database.json', JSON.stringify({
  host: 'localhost',
  port: 5432,
  database: 'myapp'
}));

// Read files (cached automatically)
const config = JSON.parse(await fs.readFile('config/database.json'));

// Check existence
if (await fs.exists('config/cache.json')) {
  console.log('Cache config exists');
}

// List directory contents
const configFiles = await fs.readDir('config');
console.log('Config files:', configFiles);
```

### Advanced Configuration

```typescript
// Custom commit settings and branching
const fs = new GitHubFileSystem({
  token: process.env.GITHUB_TOKEN,
  owner: 'myorg',
  repo: 'production-config',
  branch: 'production',
  authorName: 'Config Bot',
  authorEmail: 'config-bot@mycompany.com',
  autoCommit: true // default, set to false for manual commits
});

// Environment-specific configurations
const devFs = new GitHubFileSystem({
  token: process.env.GITHUB_TOKEN,
  owner: 'myorg',
  repo: 'app-config',
  branch: 'development'
});

const prodFs = new GitHubFileSystem({
  token: process.env.GITHUB_TOKEN,
  owner: 'myorg',
  repo: 'app-config',
  branch: 'production'
});
```

### Version Control Features

```typescript
// Get file history
const history = await fs.getFileHistory('config/app.json');
console.log('Recent changes:');
history.forEach(commit => {
  console.log(`${commit.date}: ${commit.message} by ${commit.author}`);
});

// Repository statistics
const stats = await fs.getRepositoryStats();
console.log(`Repository has ${stats.totalFiles} files and ${stats.totalCommits} commits`);
console.log(`Last commit: ${stats.lastCommit}`);
```

### Error Handling

```typescript
try {
  const content = await fs.readFile('missing/file.txt');
} catch (error) {
  if (error.message.includes('File not found')) {
    console.log('File does not exist, creating default...');
    await fs.writeFile('missing/file.txt', 'default content');
  }
}
```

### Synchronous API

```typescript
import { GitHubFileSystem } from '@synet/fs';

const fs = new GitHubFileSystem({
  token: process.env.GITHUB_TOKEN,
  owner: 'myorg',
  repo: 'sync-data'
});

// Synchronous operations (blocks execution)
fs.writeFileSync('data.txt', 'sync content');
const content = fs.readFileSync('data.txt');
const exists = fs.existsSync('data.txt');
```

## API Reference

### Constructor

```typescript
constructor(options: GitHubFileSystemOptions)
```

**Options:**

- `token: string` - GitHub personal access token (required)
- `owner: string` - Repository owner/organization (required)
- `repo: string` - Repository name (required)
- `branch?: string` - Target branch (default: 'main')
- `authorName?: string` - Commit author name (default: 'GitHubFileSystem')
- `authorEmail?: string` - Commit author email (default: 'noreply@github.com')
- `autoCommit?: boolean` - Auto-commit on writes (default: true)

### Core File Operations

#### Async API

```typescript
// File operations
async exists(path: string): Promise<boolean>
async readFile(path: string): Promise<string>
async writeFile(path: string, data: string): Promise<void>
async deleteFile(path: string): Promise<void>

// Directory operations
async readDir(dirPath: string): Promise<string[]>
async ensureDir(dirPath: string): Promise<void>
async deleteDir(dirPath: string): Promise<void> // Not supported

// Permissions (no-op for GitHub)
async chmod(path: string, mode: number): Promise<void>
```

#### Sync API

```typescript
// File operations
existsSync(path: string): boolean
readFileSync(path: string): string
writeFileSync(path: string, data: string): void
deleteFileSync(path: string): void

// Directory operations
readDirSync(dirPath: string): string[]
ensureDirSync(dirPath: string): void
deleteDirSync(dirPath: string): void // Not supported

// Permissions (no-op for GitHub)
chmodSync(path: string, mode: number): void
```

### GitHub-Specific Methods

```typescript
// Cache management
clearCache(): void

// Repository information
getRepositoryInfo(): { owner: string; repo: string; branch: string }

// Version control (async only)
async getFileHistory(path: string, options?: {
  perPage?: number;
  page?: number;
}): Promise<Array<{
  sha: string;
  message: string;
  author: string;
  date: string;
}>>

async getRepositoryStats(): Promise<{
  totalFiles: number;
  totalCommits: number;
  lastCommit: string;
}>
```

### Factory Functions

```typescript
// Create instances
import { createGitHubFileSystem } from '@synet/fs';

const fs = createGitHubFileSystem({
  token: 'your-token',
  owner: 'owner',
  repo: 'repo'
});
```

## Benefits

### 🆓 **Cost-Effective**

- Free for public repositories
- Extremely affordable for private repositories
- No data transfer or API call costs
- Built-in global CDN via GitHub

### 🔄 **Version Control**

- Every change is automatically committed
- Full Git history for all files
- Easy rollback and diff capabilities
- Branch-based environment management

### 👥 **Collaboration**

- Use GitHub's powerful collaboration tools
- Pull requests for file changes
- Issue tracking for file-related discussions
- Team permissions and access control

### 🚀 **Performance**

- Intelligent caching for frequently accessed files
- GitHub's global CDN for fast access
- Minimal API calls through smart caching

### 🔒 **Security**

- GitHub's enterprise-grade security
- Fine-grained access control
- Audit trails through commit history
- Two-factor authentication support

## Limitations

### Not Suitable For

- **Binary files** (GitHub has size limits)
- **High-frequency writes** (API rate limits apply)
- **Large files** (>100MB GitHub limit)
- **Real-time applications** (network latency, but wrapped in CachedFileSystem will do)

### GitHub API Considerations

- Rate limits: 5,000 requests/hour for authenticated users
- File size limit: 100MB per file
- Repository size recommendations: <1GB

## Best Practices

### **Token Management**

```typescript
// Use environment variables for tokens
const fs = new GitHubFileSystem({
  token: process.env.GITHUB_TOKEN, // Never hardcode tokens
  owner: 'myorg',
  repo: 'config'
});
```

### **Repository Organization**

```
app-config/
├── environments/
│   ├── development.json
│   ├── staging.json
│   └── production.json
├── features/
│   ├── feature-flags.json
│   └── ab-tests.json
└── users/
    ├── preferences/
    └── profiles/
```

### **Branch Strategy**

```typescript
// Environment-specific branches
const prodFs = new GitHubFileSystem({
  // ...config
  branch: 'production'
});

const devFs = new GitHubFileSystem({
  // ...config  
  branch: 'development'
});
```

### **Performance Optimization**

```typescript
// Enable caching for frequently read files
const content1 = await fs.readFile('config.json'); // API call
const content2 = await fs.readFile('config.json'); // From cache

// Clear cache when needed
fs.clearCache();
```

## Security Notes

- **Never commit tokens to repositories**
- Use GitHub's fine-grained personal access tokens
- Limit token scope to specific repositories
- Regularly rotate access tokens
- Consider using GitHub Apps for organization-wide access

## Migration Guide

### From Local Files

```typescript
// Before: Local file system
import fs from 'node:fs/promises';
const config = await fs.readFile('config.json', 'utf8');

// After: GitHub file system
import { GitHubFileSystem } from '@synet/fs';
const githubFs = new GitHubFileSystem(options);
const config = await githubFs.readFile('config.json');
```

### From Cloud Storage

```typescript
// Before: AWS S3
const object = await s3.getObject({
  Bucket: 'my-bucket',
  Key: 'config.json'
}).promise();

// After: GitHub
const config = await githubFs.readFile('config.json');
```

```bash
$ cat dev-art.log

I spoke to the silence,  
and it trembled back.  
No word was said,  
but everything heard.  
[‖]  
Everything heard,  
but no word was said.  
It trembled back,  
I spoke to the silence.

$ whoami
0en

```