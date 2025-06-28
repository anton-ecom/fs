# @synet/patterns

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
                                                  
                                                  
                                                                   
version: v.1.0.0   
description: Files are artefacts of identity
```

**Installation**:

```
npm i @synet/fs
```

# Filesystem Pattern Implementations

## Overview

This pattern provides a consistent filesystem abstraction that enables dependency injection, testing, and observability across your applications. By abstracting filesystem operations behind interfaces, you can easily swap implementations, add functionality like caching or encryption, and monitor file operations. By consistently using patter of interface injection yoy avoid mixing sync and async in one component (Or else Zalgo is released).

**Why so much attention to FS, when there's mysql ?**

In some cases, mysql store relatively small amount of business-unrelated information, logs, events, docs,  but you drag it all along all your services,

## In package

- Node - fs + fs/promises
- Memory - memfs
- Observable - observe any IFileSystem events with EventEmitter/Observer pattern.

## Coming soon:

- Encrypted - Transparent encryption/decryption
- Github - Store versioned and encrypted files in github for free. Sync automatically.
- ACL - Security controlled - Control who can access the files
- Signed - Files signed by Verifiable Credentials and verified on read.
- S3 - AWS S3 as filesystem
- IPFS - IPFS distributed storage
- WebDav - WebDAV protocol support
- Cached - LRU cache with TTL
- Compressed - Transparent compression
- Batch - Batch operations for performance
- Replay - Record and replay operations
- Schema Validation - Typesafe
- Mocked - Advanced mocking with scenarios
- Metrics - Detailed performance metrics
- Audits - Keep logging of every write/read events. 
- Analytics - keep detailed analytics of access and actions (remotely with realtime event/broker)
- Versioned - simplified git
- Synced - keep localfiles, but sync them to S3.
- Conflic Resolution - automatical locks/wait/release
- Hashed - store by hash (git like)
- Steam (FAT) - save and retreive files of any size
- Resilient - Intelligent filesystem with retries.
- Meta - store files with rich metadata, quickly list/find files by meta keys.
- Paid - lock/unlock files/folders for users with NKeys or by issuing DID VCs, via event observer. Verifiable proof and with selective disclosure.
- Unique - write same files, with each storing its historical context.
- Auto-backup - automatically back-up your files with versions.
- Highly Secured (HSFS) - Emit [remote events](https://github.com/synthetism/patterns/blob/main/docs/realtime/realtime-events.md) to NATS Broker who accessed files and why. Mark classified files, protect access through 2FA/VC/NKeys.

**Distributed**:

- DHT - custom distributed filesystem.
- File-sharing - automatically share selected files to all your services via DHT/IPFS.

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
import { IFileSystem } from './filesystem.interface';

export class UserService {
  constructor(private fs: IFileSystem) {}
  
  saveUser(user: User) {
    this.fs.writeFileSync('/data/users.json', JSON.stringify(user));
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

// ...existing code...

### 4. Do Not Release Zalgo

Traditional filesystem code often mixes sync and async operations within the same component, creating unpredictable behavior patterns a.k.a "[unleashing Zalgo](https://blog.izs.me/2013/08/designing-apis-for-asynchrony/)"

```typescript
// ❌ BAD: Mixed sync/async in one component - Zalgo unleashed!
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

With our abstraction, you choose your paradigm upfront and stick to it:

```typescript
// ✅ GOOD: Consistent sync interface
class SyncConfigService {
  constructor(private fs: IFileSystem) {} // Always sync
  
  loadConfig(): Config {
    return JSON.parse(this.fs.readFileSync('./config.json'));
  }
}

// ✅ GOOD: Consistent async interface  
class AsyncConfigService {
  constructor(private fs: IAsyncFileSystem) {} // Always async
  
  async loadConfig(): Promise<Config> {
    const content = await this.fs.readFile('./config.json');
    return JSON.parse(content);
  }
}
```

**Keep Zalgo locked away** - your components are predictable, your consumers know exactly what to expect!

## Available Implementations

**⚠** Not included, see [https://npmjs.com/package/@synet/fs](https://npmjs.com/package/@synet/fs) or [github](https://github.com/synthetism/fs)

### Core Implementations

#### `NodeFileSystem` (Sync/Async)

Real filesystem implementation using Node.js `fs` module:

```typescript
// Synchronous
import { NodeFileSystem } from './filesystem';
const syncFs = new NodeFileSystem();

// Asynchronous  
import { AsyncNodeFileSystem } from './promises/filesystem';
const asyncFs = new AsyncNodeFileSystem();
```

#### `MemFileSystem` (Sync/Async)

In-memory filesystem for testing:

```typescript
// Synchronous
import { MemFileSystem } from './memory';
const memFs = new MemFileSystem();

// Asynchronous
import { AsyncMemFileSystem } from './promises/memory';
const asyncMemFs = new AsyncMemFileSystem();
```

### Observable Implementations

The `ObservableFileSystem` wraps any base filesystem and emits events for monitoring:

```typescript
// Synchronous Observable
import { ObservableFileSystem, FilesystemEventTypes } from './observable.interface';

// Asynchronous Observable
import { AsyncObservableFileSystem } from './promises/observable.interface';

// Monitor specific operations
const observableFs = new ObservableFileSystem(
  new NodeFileSystem(),
  [FilesystemEventTypes.WRITE, FilesystemEventTypes.DELETE] // Only emit write/delete events
);

// Monitor all operations
const observableFs = new ObservableFileSystem(new NodeFileSystem());

// Listen to events
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
  update(event) {
    console.log(`File written: ${event.data.filePath}`);
  }
});
```

## Usage Examples

### Async Usage

```typescript
import { IAsyncFileSystem, AsyncNodeFileSystem, AsyncMemFileSystem } from './index';

class AsyncConfigService {
  constructor(private fs: IAsyncFileSystem) {}
  
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

// Usage
const asyncConfigService = new AsyncConfigService(new AsyncNodeFileSystem());
const config = await asyncConfigService.loadConfig();
```

### Basic Sync Usage

```typescript
import { IFileSystem } from './filesystem.interface';
import { NodeFileSystem } from './filesystem';
import { MemFileSystem } from './memory';

class ConfigService {
  constructor(private fs: IFileSystem) {}
  
  loadConfig(): Config {
    if (this.fs.existsSync('./config.json')) {
      const content = this.fs.readFileSync('./config.json');
      return JSON.parse(content);
    }
    return this.getDefaultConfig();
  }
  
  saveConfig(config: Config): void {
    this.fs.ensureDirSync('./');
    this.fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  }
}

// Production
const configService = new ConfigService(new NodeFileSystem());

// Testing
const configService = new ConfigService(new MemFileSystem());
```

### Observable Pattern with Event Monitoring

```typescript
import { ObservableFileSystem, FilesystemEventTypes } from './observable.interface';

// Create observable filesystem
const observableFs = new ObservableFileSystem(new NodeFileSystem());

// Set up monitoring
const logger = {
  update(event: FilesystemEvent) {
    const { filePath, operation, result, error } = event.data;
  
    if (error) {
      console.error(`❌ ${operation} failed on ${filePath}:`, error.message);
    } else {
      console.log(`✅ ${operation} on ${filePath} ${result ? `(${result})` : ''}`);
    }
  }
};

// Monitor all operations
Object.values(FilesystemEventTypes).forEach(eventType => {
  observableFs.getEventEmitter().subscribe(eventType, logger);
});

// Or monitor specific operations
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
  update(event) {
    console.log(`📝 File written: ${event.data.filePath} (${event.data.result} bytes)`);
  }
});

// Use the filesystem normally
const configService = new ConfigService(observableFs);
configService.saveConfig({ theme: 'dark' }); // Will trigger events
```

### Testing with In-Memory Filesystem

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MemFileSystem } from './memory';
import { ConfigService } from '../services/config-service';

describe('ConfigService', () => {
  let fs: MemFileSystem;
  let configService: ConfigService;
  
  beforeEach(() => {
    fs = new MemFileSystem();
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

### Advanced: Multiple Decorators

```typescript
// Create a filesystem with multiple capabilities
class CachedFileSystem implements IFileSystem {
  private cache = new Map<string, string>();
  
  constructor(private baseFs: IFileSystem) {}
  
  readFileSync(path: string): string {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }
  
    const content = this.baseFs.readFileSync(path);
    this.cache.set(path, content);
    return content;
  }
  
  writeFileSync(path: string, data: string): void {
    this.baseFs.writeFileSync(path, data);
    this.cache.set(path, data); // Update cache
  }
  
  // Implement other methods...
}

// Compose multiple decorators
const baseFs = new NodeFileSystem();
const observableFs = new ObservableFileSystem(baseFs);
const cachedFs = new CachedFileSystem(observableFs);

// Now you have: real filesystem + observability + caching
const service = new ConfigService(cachedFs);
```

## Event Types

The `ObservableFileSystem` emits the following events:

| Event Type         | Description          | Event Data                                                 |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| `file.exists`    | File existence check | `{ filePath, operation: 'exists', result: boolean }`     |
| `file.read`      | File read operation  | `{ filePath, operation: 'read', result: contentLength }` |
| `file.write`     | File write operation | `{ filePath, operation: 'write', result: dataLength }`   |
| `file.delete`    | File deletion        | `{ filePath, operation: 'delete' }`                      |
| `file.chmod`     | Permission change    | `{ filePath, operation: 'chmod', result: mode }`         |
| `file.ensureDir` | Directory creation   | `{ filePath, operation: 'ensureDir' }`                   |
| `file.deleteDir` | Directory deletion   | `{ filePath, operation: 'deleteDir' }`                   |
| `file.readDir`   | Directory listing    | `{ filePath, operation: 'readDir', result: fileCount }`  |

All events include error information if the operation fails:

```typescript
{
  filePath: string;
  operation: string;
  error?: Error;
  result?: unknown;
}
```

## Benefits

1. **Testability**: Easy to mock and test without touching the real filesystem
2. **Flexibility**: Swap implementations based on environment or requirements
3. **Observability**: Monitor file operations with the observable pattern
4. **Composition**: Layer functionality through the decorator pattern
5. **Type Safety**: Full TypeScript support with proper interfaces
6. **Consistency**: Uniform API across sync and async operations
7. **Environment Agnostic**: Works in Node.js, browsers (with appropriate implementations), or other JavaScript environments

## Architecture

```
┌─────────────────┐
│   Your Service  │
└─────────┬───────┘
          │ uses IFileSystem interface
          ▼
┌─────────────────┐    ┌──────────────────┐
│ ObservableFS    │───▶│  EventEmitter    │
└─────────┬───────┘    └──────────────────┘
          │ decorates
          ▼
┌─────────────────┐
│   NodeFS or     │
│   MemFS         │
└─────────────────┘
```

This pattern enables building robust, testable, and observable file-based applications while maintaining clean separation of concerns.

## Examples

Complete working examples are available in the `examples/` directory:

- **`config-service.example.ts`** - Demonstrates basic usage, observable patterns, and advanced composition
- **`config-service.test.ts`** - Shows comprehensive testing strategies with different filesystem implementations

Run the examples:

```typescript
// Basic demonstration
import { demonstrateFilesystemPattern } from './examples/config-service.example';
demonstrateFilesystemPattern();

// Advanced composition patterns
import { demonstrateAdvancedComposition } from './examples/config-service.example';
demonstrateAdvancedComposition();
```

The examples showcase:

- ✅ **Dependency injection** for easy testing
- ✅ **Multiple implementations** (real filesystem vs in-memory)
- ✅ **Observable pattern** for monitoring file operations
- ✅ **Decorator pattern** for composing functionality (caching + observability)
- ✅ **Error handling** and event capturing
- ✅ **Comprehensive testing** with isolated, fast tests

These patterns help you build maintainable, testable applications that can adapt to different environments and requirements.

## ** Complex Compositions ~Pyramids of Doom~  Examples**

The real power comes from combining these (don't try this at home):

```typescript
// Ultimate production filesystem stack
const productionFs = new RetryFileSystem(
  new MetricsFileSystem(
    new AuditFileSystem(
      new CachedFileSystem(
        new EncryptedFileSystem(
          new CompressedFileSystem(
            new S3FileSystem(s3Config)
          )
        )
      )
    )
  )
);

// Development with mocking and debugging
const devFs = new ReplayFileSystem(
  new ObservableFileSystem(
    new ValidatedFileSystem(
      new MemFileSystem()
    )
  )
);

// High-security vault
const vaultFs = new AclFileSystem(
  new SignedFileSystem(
    new VersionedFileSystem(
      new EncryptedFileSystem(
        new AuditFileSystem(baseFs)
      )
    )
  )
);
```

## Conclusion

I've implemented over a hundred of versions of filesystems over last few decades, that I will share with you here. The opportunities here are limitless. From storing encrypted files in sync in hundreds of locations and DHT, to beautiful Verifiable Credentials access control. 

Filesystems are far more flexible architectural solution than storing data in Mysql with far greater security and future extention options. When coupled with [Remote Event](https://github.com/synthetism/patterns/blob/main/docs/realtime/realtime-events.md) you can observe, process and act on all filesystem requests - something can't be done with Mysql.

 As mentioned before, I've developed highly secure filesystems (**HSFS**) for enterprises and security firms.

 **Some features**:

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

Some of these features wont't be shared here. If you want some of them, [let me know](emailto:anton@synthetism.ai)  

Stay tuned new versions or ask anything from [REQUESTS][[https://github](https://github.com/synthetism/fs/blob/main/REQUESTS.md)]
