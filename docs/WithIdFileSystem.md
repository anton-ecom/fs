# WithIdFileSystem

**Smart file storage with deterministic IDs and human-readable aliases**

## Overview

Have you ever needed to store user files in your system but struggled with the dilemma of keeping meaningful names while also having consistent, system-friendly identifiers? `WithIdFileSystem` solves this beautifully by giving every file two identities: a deterministic ID for your database keys and a readable alias for human reference, all while preserving the original filename.

Think of it as giving your files a social security number and a nickname – both useful in different contexts, but always pointing to the same file.

## Why WithIdFileSystem?

### Traditional Pain Points

**The Database Key Dilemma**:
```typescript
// ❌ How do you consistently reference files in your database?
class UserProfileService {
  async saveProfile(userId: string, profileData: any) {
    // Option 1: Use filename as DB key - brittle if filename changes
    const filename = `${userId}-profile.json`;
    fs.writeFileSync(`./profiles/${filename}`, JSON.stringify(profileData));
    
    await db.users.update(userId, { profileFile: filename });
    
    // What happens if file gets renamed? DB reference breaks!
  }
  
  async loadProfile(userId: string) {
    const user = await db.users.findById(userId);
    // Hope the filename hasn't changed...
    return JSON.parse(fs.readFileSync(`./profiles/${user.profileFile}`));
  }
}
```

**UUID vs Readability Trade-off**:
```typescript
// ❌ Choose between readable names OR stable IDs
class DocumentService {
  save(document: Document) {
    // Option A: Human readable, but not stable
    const filename = `${document.title.replace(/\s+/g, '-')}.md`;
    
    // Option B: Stable ID, but cryptic
    const filename = `${uuid()}.md`;
    
    // Can't have both! 😢
  }
}
```

**File Organization Chaos**:
```typescript
// ❌ Managing relationships between files and IDs manually
const fileRegistry = new Map<string, string>(); // ID -> filename
const nameRegistry = new Map<string, string>(); // filename -> ID

// Brittle, error-prone, lots of boilerplate...
```

### WithIdFileSystem Solution

**Dual Identity System**:
```typescript
// ✅ Every file gets both: deterministic ID AND readable alias
const withIdFs = new WithIdFileSystem(nodeFs);

// Write file with meaningful path
withIdFs.writeFileSync('./vault/profiles/user1.json', profileData);

// Get stable ID for database
const id = withIdFs.getId('./vault/profiles/user1.json'); // "a1b2c3d4e5f6g7h8"

// Get readable alias for humans
const alias = withIdFs.getAlias('./vault/profiles/user1.json'); // "vault-profiles-user1"

// Access file three ways:
// 1. Original path: withIdFs.readFileSync('./vault/profiles/user1.json')
// 2. By ID: withIdFs.getByIdOrAlias('a1b2c3d4e5f6g7h8')
// 3. By alias: withIdFs.getByIdOrAlias('vault-profiles-user1')
```

**Database Integration Made Simple**:
```typescript
// ✅ Perfect for database keys
class UserProfileService {
  constructor(private fs: WithIdFileSystem) {}
  
  async saveProfile(userId: string, profile: UserProfile) {
    const filePath = `./profiles/${userId}.json`;
    
    // Save file
    this.fs.writeFileSync(filePath, JSON.stringify(profile));
    
    // Store stable ID in database
    const fileId = this.fs.getId(filePath);
    await db.users.update(userId, { profileFileId: fileId });
  }
  
  async loadProfile(userId: string) {
    const user = await db.users.findById(userId);
    
    // Load by stable ID - works even if file was moved!
    const content = this.fs.getByIdOrAlias(user.profileFileId, FileFormat.JSON);
    return JSON.parse(content);
  }
}
```

## Use Cases

### 1. **User Content Management**
Perfect for applications where users upload or create files that need both system tracking and human identification:

```typescript
const userFs = new WithIdFileSystem(nodeFs);

// User uploads avatar
userFs.writeFileSync('./users/john-doe/avatar.jpg', imageData);

// Store in database with stable reference
const avatarId = userFs.getId('./users/john-doe/avatar.jpg');
await db.users.update('john-doe', { avatarId });

// Later, serve avatar by ID (works even if user renames)
app.get('/avatar/:userId', async (req, res) => {
  const user = await db.users.findById(req.params.userId);
  const avatar = userFs.getByIdOrAlias(user.avatarId, FileFormat.JPG);
  res.type('image/jpeg').send(avatar);
});
```

### 2. **Document Management Systems**
Track documents with both meaningful names and stable references:

```typescript
const docFs = new WithIdFileSystem(nodeFs);

// Save document with descriptive path
const docPath = './documents/2025/Q1/budget-proposal.pdf';
docFs.writeFileSync(docPath, pdfData);

// Track in database
const docId = docFs.getId(docPath);
await db.documents.create({
  id: docId,
  title: 'Q1 Budget Proposal',
  path: docPath,
  alias: docFs.getAlias(docPath) // "documents-2025-Q1-budget-proposal"
});

// Search documents by alias (human-friendly)
const results = await db.documents.where('alias', 'like', '%budget%');
```

### 3. **Configuration File Management**
Manage app configurations with stable IDs for environment references:

```typescript
const configFs = new WithIdFileSystem(nodeFs);

// Save environment-specific configs
configFs.writeFileSync('./config/production.json', prodConfig);
configFs.writeFileSync('./config/staging.json', stagingConfig);

// Reference in deployment scripts by stable ID
const environments = {
  production: configFs.getId('./config/production.json'),
  staging: configFs.getId('./config/staging.json')
};

// Deploy with confidence - IDs never change
deployScript.run({ configId: environments.production });
```

### 4. **Template and Asset Management**
Organize templates and assets with dual identification:

```typescript
const templateFs = new WithIdFileSystem(nodeFs);

// Store email templates
templateFs.writeFileSync('./templates/email/welcome.html', welcomeTemplate);
templateFs.writeFileSync('./templates/email/password-reset.html', resetTemplate);

// Quick access by alias for developers
const welcomeHtml = templateFs.getByIdOrAlias('templates-email-welcome', FileFormat.HTML);

// Stable ID references for production code
const templateId = templateFs.getId('./templates/email/welcome.html');
```

### 5. **Multi-tenant File Organization**
Organize tenant files with clear separation and stable references:

```typescript
const tenantFs = new WithIdFileSystem(nodeFs);

// Tenant-specific file organization
tenantFs.writeFileSync('./tenants/acme-corp/logo.png', logoData);
tenantFs.writeFileSync('./tenants/acme-corp/config.json', configData);

// Stable references for tenant data
const tenantFiles = {
  logo: tenantFs.getId('./tenants/acme-corp/logo.png'),
  config: tenantFs.getId('./tenants/acme-corp/config.json')
};

// Easy human reference
const acmeLogo = tenantFs.getByIdOrAlias('tenants-acme-corp-logo');
```

## Examples

### Basic Usage

```typescript
import { WithIdFileSystem, FileFormat } from '@synet/fs';
import { NodeFileSystem } from '@synet/fs';

const nodeFs = new NodeFileSystem();
const withIdFs = new WithIdFileSystem(nodeFs);

// Write a file
const content = '{"name": "John", "role": "admin"}';
withIdFs.writeFileSync('./vault/profiles/user1.json', content);

// Get identifiers
const id = withIdFs.getId('./vault/profiles/user1.json');
console.log('ID:', id); // "a1b2c3d4e5f6g7h8"

const alias = withIdFs.getAlias('./vault/profiles/user1.json');
console.log('Alias:', alias); // "vault-profiles-user1"

// Read file three ways
const data1 = withIdFs.readFileSync('./vault/profiles/user1.json'); // Original path
const data2 = withIdFs.getByIdOrAlias(id); // By ID
const data3 = withIdFs.getByIdOrAlias(alias); // By alias

console.log(data1 === data2 && data2 === data3); // true
```

### File Format Validation

```typescript
// Write files of different formats
withIdFs.writeFileSync('./data.json', '{"key": "value"}');
withIdFs.writeFileSync('./readme.md', '# My Project');
withIdFs.writeFileSync('./config.xml', '<config></config>');

// Access with format validation
const jsonData = withIdFs.getByIdOrAlias('data', FileFormat.JSON); // ✅ Works
const mdData = withIdFs.getByIdOrAlias('readme', FileFormat.MD); // ✅ Works

// Format mismatch throws error
try {
  withIdFs.getByIdOrAlias('data', FileFormat.PDF); // ❌ Throws error
} catch (error) {
  console.log('Format validation prevented error!');
}
```

### Metadata and File Tracking

```typescript
// Track multiple files
withIdFs.writeFileSync('./docs/api.md', '# API Documentation');
withIdFs.writeFileSync('./docs/guides/setup.md', '# Setup Guide');
withIdFs.writeFileSync('./assets/logo.png', logoData);

// Get all tracked files
const trackedFiles = withIdFs.listTrackedFiles();
console.log(`Tracking ${trackedFiles.length} files`);

trackedFiles.forEach(file => {
  console.log(`${file.alias} (${file.format}): ${file.id}`);
});

// Get detailed metadata
const metadata = withIdFs.getMetadata('./docs/api.md');
console.log(metadata);
// {
//   id: "f1e2d3c4b5a6",
//   alias: "docs-api", 
//   originalPath: "./docs/api.md",
//   storedPath: "./docs/api:docs-api-f1e2d3c4b5a6.md",
//   format: "md"
// }
```

### Async Usage

```typescript
import { WithIdFileSystem } from '@synet/fs/promises';
import { NodeFileSystem } from '@synet/fs/promises';

const nodeFs = new NodeFileSystem();
const withIdFs = new WithIdFileSystem(nodeFs);

// All operations are Promise-based
await withIdFs.writeFile('./async-data.json', '{"async": true}');

const id = withIdFs.getId('./async-data.json');
const data = await withIdFs.getByIdOrAlias(id, FileFormat.JSON);

console.log('Async data:', JSON.parse(data));
```

### Integration with Database

```typescript
// Real-world database integration example
class FileManager {
  constructor(private fs: WithIdFileSystem, private db: Database) {}
  
  async saveUserDocument(userId: string, filename: string, content: string) {
    const filePath = `./users/${userId}/documents/${filename}`;
    
    // Save file
    this.fs.writeFileSync(filePath, content);
    
    // Store metadata in database
    const metadata = this.fs.getMetadata(filePath);
    await this.db.documents.create({
      id: metadata.id,
      userId,
      filename,
      alias: metadata.alias,
      format: metadata.format,
      storedPath: metadata.storedPath
    });
    
    return metadata.id;
  }
  
  async getUserDocuments(userId: string) {
    const docs = await this.db.documents.where({ userId });
    
    return docs.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      alias: doc.alias,
      content: this.fs.getByIdOrAlias(doc.id, doc.format)
    }));
  }
  
  async findDocumentByAlias(alias: string) {
    try {
      const content = this.fs.getByIdOrAlias(alias);
      return { found: true, content };
    } catch {
      return { found: false };
    }
  }
}
```

## API Reference

### Constructor

```typescript
new WithIdFileSystem(baseFileSystem: IFileSystem)
```

### Core Methods

#### `getId(filePath: string): string`
Returns deterministic 16-character hex ID for a file path.

#### `getAlias(filePath: string): string` 
Returns human-readable alias derived from file path (path separators become hyphens, extension removed).

#### `getByIdOrAlias(idOrAlias: string, expectedFormat?: FileFormat): string`
Retrieves file content by ID or alias, optionally validating format.

#### `getMetadata(filePath: string): FileMetadata`
Returns complete metadata for a file:

```typescript
interface FileMetadata {
  id: string;
  alias: string;
  originalPath: string;
  storedPath: string;
  format: FileFormat;
}
```

#### `listTrackedFiles(): FileMetadata[]`
Returns array of all tracked file metadata.

### File Formats

```typescript
enum FileFormat {
  JSON = 'json',
  TXT = 'txt', 
  PDF = 'pdf',
  MD = 'md',
  XML = 'xml',
  CSV = 'csv',
  LOG = 'log',
  CONFIG = 'config'
}
```

### Storage Format

Files are stored with the pattern:
```
{basename}:{alias}-{id}.{extension}
```

Examples:
- `./vault/user1.json` → `./vault/user1:vault-user1-a1b2c3d4e5f6g7h8.json`
- `./docs/api.md` → `./docs/api:docs-api-f1e2d3c4b5a6g7h8.md`

### IFileSystem Compliance

WithIdFileSystem implements the full `IFileSystem` or `IAsyncFileSystem` interface, making it a drop-in replacement that adds ID functionality without breaking existing code.

## Best Practices

### 1. **Choose Meaningful Paths**
```typescript
// ✅ Good: descriptive paths create useful aliases
withIdFs.writeFileSync('./users/john-doe/profile.json', data);
// Alias: "users-john-doe-profile"

// ❌ Avoid: generic paths create poor aliases  
withIdFs.writeFileSync('./temp/file1.json', data);
// Alias: "temp-file1" (not very descriptive)
```

### 2. **Use Format Validation**
```typescript
// ✅ Validate format when type matters
const config = withIdFs.getByIdOrAlias(configId, FileFormat.JSON);

// ✅ Skip validation when format is flexible
const content = withIdFs.getByIdOrAlias(fileId); // Any format OK
```

### 3. **Store IDs in Database**
```typescript
// ✅ Use stable IDs for database references
await db.users.update(userId, { 
  avatarId: withIdFs.getId('./avatars/user.jpg'),
  configId: withIdFs.getId('./configs/user.json')
});

// ❌ Don't store paths - they might change
await db.users.update(userId, {
  avatarPath: './avatars/user.jpg' // Brittle!
});
```

### 4. **Organize by Domain**
```typescript
// ✅ Organize files by business domain
withIdFs.writeFileSync('./users/profiles/john.json', profile);
withIdFs.writeFileSync('./users/avatars/john.jpg', avatar);
withIdFs.writeFileSync('./templates/email/welcome.html', template);

// Creates logical aliases:
// "users-profiles-john", "users-avatars-john", "templates-email-welcome"
```

## Advanced Usage

The WithIdFileSystem opens up several powerful patterns:

- **Versioned Files**: Use IDs to track file versions across renames
- **Cross-Reference Systems**: Link files by stable IDs in metadata
- **Migration Safety**: Move files without breaking database references  
- **Content Deduplication**: Use IDs to detect duplicate content
- **Audit Trails**: Track file access by stable identifier

This system gives you the best of both worlds: the stability your system needs and the readability your developers want.
