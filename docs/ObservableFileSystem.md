# ObservableFileSystem

**See every file operation as it happens with real-time event monitoring and zero performance overhead**

## Overview

Debugging. We all love it. Right ?

> Debugging - the art of finding needles in haystacks, except the haystack is on fire, and the needle is actually a piece of hay that looks suspicious.

You know that feeling when your app is misbehaving and you're desperately adding `console.log` statements to figure out what files are being read, written, or deleted? When mysterious performance issues happen and you suspect it's filesystem-related but have no visibility? When you need to audit file access for security compliance but have no clue where to start?

Another chalenge

One part of the system writes to files and the other distant part needs to know about this. Solution ? Event Emitters, more event emitters, everywhere. The problem is that event emitters become a bloat that pollutes high-level policy with details. It doesn't look pretty and also requires some middle-man magic and mixed concerns.

`ObservableFileSystem` solves both by wrapping any filesystem with a transparent event monitoring layer. Every operation emits detailed events - when it happened, what file was touched, how long it took, and whether it succeeded or failed. It's like having X-ray vision for your file operations (but without the radiation exposure)

## Why ObservableFileSystem?

### Pain Points

**Filesystem operations happen in darkness**:

```typescript
//  Your app does mysterious file operations
class MyService {
  processData() {
    // What files is this actually touching? 🤷‍♂️
    const config = fs.readFileSync('./config.json');
    const template = fs.readFileSync('./templates/email.html');
    const data = fs.readFileSync('./data/users.json');
  
    // Process stuff...
  
    fs.writeFileSync('./output/result.json', result);
    fs.writeFileSync('./logs/audit.log', logEntry);
  
    // Did any of these fail? Which ones? When? Why? 🤔
  }
}

// Your logs: "Something went wrong" 
// Your debugging session: 4 hours of adding console.log statements
```

**No visibility into filesystem performance**:

```typescript
// ❌ Performance issues are invisible
app.get('/api/slow-endpoint', (req, res) => {
  // This endpoint is slow... but why?
  // Is it the database? The filesystem? Network calls?
  // How many files are being read?
  // Which file reads are taking the longest?
  // Are we reading the same file multiple times?
  
  // *Adds 20 console.time() statements to debug*
  console.time('config-read');
  const config = fs.readFileSync('./config.json');
  console.timeEnd('config-read');
  
  console.time('template-read');
  const template = fs.readFileSync('./template.html');
  console.timeEnd('template-read');
  
  // This is madness! 
});
```

**Audit trails are impossible**:

```typescript
// ❌ Security team asks: "Who accessed what files when?"
// You: "Umm... let me check the server logs?" 
// Speak, fool.
// *Searches through gigabytes of generic application logs*
// *Finds nothing useful*
// *Cries*

// Meanwhile, files are being accessed left and right with zero visibility:
const sensitiveData = fs.readFileSync('./secrets/api-keys.json');
const userProfiles = fs.readFileSync('./data/user-profiles.json');
fs.writeFileSync('./logs/system.log', 'Someone did something');

// Who did what? When? Why? How often? 
// It's rats.
```

### ObservableFileSystem Solution

**Real-time Filesystem Monitoring**:

```typescript
// ✅ Every operation is visible and trackable
import { ObservableFileSystem, FilesystemEventTypes } from '@synet/fs';

const baseFs = new NodeFileSystem();
const observableFs = new ObservableFileSystem(baseFs);

// Set up comprehensive monitoring
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
  update(event) {
    console.log(`📖 READ: ${event.data.filePath} (${event.data.result} bytes)`);
  }
});

observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
  update(event) {
    console.log(`✏️  WRITE: ${event.data.filePath} (${event.data.result} bytes)`);
  }
});

// Now you see EVERYTHING:
// READ: ./config.json (1,234 bytes)
// READ: ./templates/email.html (5,678 bytes)  
// WRITE: ./output/result.json (9,012 bytes)
```

**Performance Monitoring Built-in**:

```typescript
// Automatic performance tracking with detailed metrics
class FileSystemMonitor {
  private readTimes = new Map<string, number[]>();
  
  constructor(private observableFs: ObservableFileSystem) {
    this.setupMonitoring();
  }
  
  private setupMonitoring() {
    // Track read performance
    this.observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
      update: (event) => {
        const { filePath, result, error } = event.data;
  
        if (error) {
          console.error(`❌ READ FAILED: ${filePath} - ${error.message}`);
          return;
        }
  
        // Track file sizes and access patterns
        const times = this.readTimes.get(filePath) || [];
        times.push(Date.now());
        this.readTimes.set(filePath, times);
  
        // Alert on large files
        if (result > 1024 * 1024) { // > 1MB
          console.warn(`🐘 LARGE FILE READ: ${filePath} (${this.formatBytes(result)})`);
        }
  
        // Alert on frequent access
        const recentReads = times.filter(t => Date.now() - t < 60000); // Last minute
        if (recentReads.length > 10) {
          console.warn(`🔥 HIGH FREQUENCY: ${filePath} read ${recentReads.length} times in last minute`);
        }
      }
    });
  }
  
  getHotFiles(): Array<{ path: string; reads: number }> {
    return Array.from(this.readTimes.entries())
      .map(([path, times]) => ({ path, reads: times.length }))
      .sort((a, b) => b.reads - a.reads);
  }
}

const monitor = new FileSystemMonitor(observableFs);

// After running for a while:
console.log(' Hottest files:', monitor.getHotFiles().slice(0, 5));
// Output:
//  Hottest files: [
//   { path: './config.json', reads: 147 },
//   { path: './templates/header.html', reads: 89 },
//   { path: './data/cache.json', reads: 56 }
// ]
```

**Security Audit Trail**:

```typescript
//  Complete audit trail with zero effort
class SecurityAuditor {
  private accessLog: Array<{
    timestamp: Date;
    operation: string;
    filePath: string;
    success: boolean;
    error?: string;
    userId?: string;
  }> = [];
  
  constructor(private observableFs: ObservableFileSystem) {
    this.setupAuditing();
  }
  
  private setupAuditing() {
    // Monitor ALL filesystem operations
    Object.values(FilesystemEventTypes).forEach(eventType => {
      this.observableFs.getEventEmitter().subscribe(eventType, {
        update: (event) => {
          const { filePath, operation, result, error } = event.data;
  
          this.accessLog.push({
            timestamp: new Date(),
            operation,
            filePath,
            success: !error,
            error: error?.message,
            userId: this.getCurrentUserId() // Your auth context
          });
  
          // Alert on sensitive file access
          if (this.isSensitiveFile(filePath)) {
            console.warn(`� SENSITIVE FILE ACCESS: ${operation} on ${filePath} by user ${this.getCurrentUserId()}`);
          }
  
          // Alert on unusual patterns
          if (operation === 'delete' && this.isImportantFile(filePath)) {
            console.error(`🚨 CRITICAL: Deletion of important file ${filePath}!`);
          }
        }
      });
    });
  }
  
  getAuditReport(timeframe: number = 24 * 60 * 60 * 1000): AuditReport {
    const since = new Date(Date.now() - timeframe);
    const relevantLogs = this.accessLog.filter(log => log.timestamp > since);
  
    return {
      totalOperations: relevantLogs.length,
      operationsByType: this.groupBy(relevantLogs, 'operation'),
      userActivity: this.groupBy(relevantLogs, 'userId'),
      errors: relevantLogs.filter(log => !log.success),
      sensitiveFileAccess: relevantLogs.filter(log => this.isSensitiveFile(log.filePath)),
      timeframe: `${timeframe / (60 * 60 * 1000)} hours`
    };
  }
}

const auditor = new SecurityAuditor(observableFs);

// Generate security reports
setInterval(() => {
  const report = auditor.getAuditReport();
  console.log('📊 24h Filesystem Activity:', report);
}, 24 * 60 * 60 * 1000);
```

## Use Cases

### 1. **Development & Debugging**

See exactly what your application or component are doing:

```typescript
// ✅ Debug filesystem operations in real-time
const debugFs = new ObservableFileSystem(nodeFs, [
  FilesystemEventTypes.READ,
  FilesystemEventTypes.WRITE,
  FilesystemEventTypes.DELETE
]);

debugFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
  update(event) {
    const { filePath, result, error } = event.data;
    if (error) {
      console.error(`❌ Failed to read ${filePath}: ${error.message}`);
    } else {
      console.log(`📖 Read ${filePath} (${result} bytes)`);
    }
  }
});

// Now when you run your app:
// Read ./config/database.json (342 bytes)
// Read ./templates/email.html (1,234 bytes)
// Failed to read ./missing-file.txt: ENOENT: no such file or directory
```

### 2. **Performance Optimization**

Identify filesystem bottlenecks:

```typescript
// ✅ Track and optimize filesystem performance
class PerformanceProfiler {
  private readStats = new Map<string, { count: number; totalBytes: number; errors: number }>();
  
  constructor(observableFs: ObservableFileSystem) {
    observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
      update: (event) => {
        const { filePath, result, error } = event.data;
        const stats = this.readStats.get(filePath) || { count: 0, totalBytes: 0, errors: 0 };
  
        stats.count++;
        if (error) {
          stats.errors++;
        } else {
          stats.totalBytes += result as number;
        }
  
        this.readStats.set(filePath, stats);
      }
    });
  }
  
  getTopFiles(limit = 10) {
    return Array.from(this.readStats.entries())
      .map(([path, stats]) => ({
        path,
        reads: stats.count,
        totalMB: (stats.totalBytes / (1024 * 1024)).toFixed(2),
        avgKB: ((stats.totalBytes / stats.count) / 1024).toFixed(1),
        errorRate: `${((stats.errors / stats.count) * 100).toFixed(1)}%`
      }))
      .sort((a, b) => b.reads - a.reads)
      .slice(0, limit);
  }
}

const profiler = new PerformanceProfiler(observableFs);

// After running your app for a while:
console.log('Most accessed files:', profiler.getTopFiles());
// Output:
//  Most accessed files: [
//   { path: './config.json', reads: 1247, totalMB: '1.2', avgKB: '1.0', errorRate: '0.0%' },
//   { path: './user-data.json', reads: 89, totalMB: '45.6', avgKB: '524.3', errorRate: '2.2%' }
// ]
```

### 3. **Security Monitoring**

Monitor access to sensitive files:

```typescript
// ✅ Real-time security monitoring
const SENSITIVE_PATTERNS = [
  /\/secrets\//,
  /\/\.env/,
  /api[-_]?keys?/i,
  /password/i,
  /private[-_]?key/i
];

const securityFs = new ObservableFileSystem(nodeFs);

securityFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
  update(event) {
    const { filePath, operation } = event.data;
  
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(filePath))) {
      console.warn(`🚨 SENSITIVE FILE ACCESS: ${operation} on ${filePath}`);
  
      // Send to security monitoring system
      sendSecurityAlert({
        type: 'SENSITIVE_FILE_ACCESS',
        file: filePath,
        operation,
        timestamp: new Date(),
        stackTrace: new Error().stack
      });
    }
  }
});

// Also monitor deletions of important files
securityFs.getEventEmitter().subscribe(FilesystemEventTypes.DELETE, {
  update(event) {
    const { filePath } = event.data;
    console.error(`FILE DELETED: ${filePath}`);
  
    // Always log deletions for audit
    logDeletion({
      file: filePath,
      timestamp: new Date(),
      user: getCurrentUser(),
      stackTrace: new Error().stack
    });
  }
});
```

### 4. **Application Monitoring**

Monitor filesystem health in production:

```typescript
// ✅ Production filesystem monitoring
class FilesystemHealthMonitor {
  private errorCount = 0;
  private operationCount = 0;
  private alertThreshold = 0.05; // 5% error rate
  
  constructor(observableFs: ObservableFileSystem) {
    // Monitor all operations for health metrics
    Object.values(FilesystemEventTypes).forEach(eventType => {
      observableFs.getEventEmitter().subscribe(eventType, {
        update: (event) => {
          this.operationCount++;
    
          if (event.data.error) {
            this.errorCount++;
            console.error(`💥 Filesystem error: ${event.data.error.message} (${event.data.filePath})`);
      
            // Check if error rate is too high
            const errorRate = this.errorCount / this.operationCount;
            if (errorRate > this.alertThreshold && this.operationCount > 100) {
              this.sendHealthAlert(errorRate);
            }
          }
        }
      });
    });
  
    // Reset counters periodically
    setInterval(() => {
      this.errorCount = 0;
      this.operationCount = 0;
    }, 60 * 60 * 1000); // Every hour
  }
  
  private sendHealthAlert(errorRate: number) {
    console.error(`🚨 HIGH FILESYSTEM ERROR RATE: ${(errorRate * 100).toFixed(1)}%`);
  
    // Send to monitoring system (e.g., DataDog, New Relic, etc.)
    sendMetric('filesystem.error_rate', errorRate);
    sendAlert('Filesystem health degraded', {
      errorRate: `${(errorRate * 100).toFixed(1)}%`,
      threshold: `${(this.alertThreshold * 100).toFixed(1)}%`
    });
  }
}

const healthMonitor = new FilesystemHealthMonitor(observableFs);
```

## Configuration

### Basic Setup

```typescript
import { ObservableFileSystem, FilesystemEventTypes } from '@synet/fs';

// Monitor all events
const observableFs = new ObservableFileSystem(baseFs);

// Monitor only specific events
const observableFs = new ObservableFileSystem(baseFs, [
  FilesystemEventTypes.WRITE,
  FilesystemEventTypes.DELETE
]);
```

### Event Types

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

### Event Monitoring

```typescript
// Single event type
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
  update(event) {
    console.log(`File written: ${event.data.filePath}`);
  }
});

// Multiple event types
[FilesystemEventTypes.READ, FilesystemEventTypes.WRITE].forEach(eventType => {
  observableFs.getEventEmitter().subscribe(eventType, {
    update(event) {
      console.log(`Operation: ${event.data.operation} on ${event.data.filePath}`);
    }
  });
});

// Error handling
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
  update(event) {
    if (event.data.error) {
      console.error(`Read failed: ${event.data.filePath} - ${event.data.error.message}`);
    } else {
      console.log(`Read success: ${event.data.filePath} (${event.data.result} bytes)`);
    }
  }
});
```

## API Reference

### ObservableFileSystem Constructor

```typescript
constructor(
  baseFilesystem: IFileSystem,
  events?: FilesystemEventTypes[]  // Optional: filter specific events
)
```

### Methods

```typescript
getEventEmitter(): EventEmitter<FilesystemEvent>  // Access event emitter
```

### Standard IFileSystem Methods

All standard filesystem operations with transparent event emission:

- `readFileSync(path: string): string` - Emits `file.read`
- `writeFileSync(path: string, data: string): void` - Emits `file.write`
- `existsSync(path: string): boolean` - Emits `file.exists`
- `deleteFileSync(path: string): void` - Emits `file.delete`
- `ensureDirSync(path: string): void` - Emits `file.ensureDir`
- `deleteDirSync(path: string): void` - Emits `file.deleteDir`
- `readDirSync(path: string): string[]` - Emits `file.readDir`
- `chmodSync(path: string, mode: number): void` - Emits `file.chmod`

### Event Interface

```typescript
interface FilesystemEvent extends Event {
  type: FilesystemEventTypes;
  data: {
    filePath: string;
    operation: string;
    result?: unknown;    // Success result (bytes, count, etc.)
    error?: Error;       // Error if operation failed
  };
}
```

### Advanced Patterns

#### Custom Event Filtering

```typescript
// Create a custom observable filesystem that only monitors sensitive operations
class SecurityObservableFileSystem extends ObservableFileSystem {
  constructor(baseFs: IFileSystem) {
    super(baseFs, [
      FilesystemEventTypes.WRITE,
      FilesystemEventTypes.DELETE,
      FilesystemEventTypes.CHMOD
    ]);
  }
}
```

#### Event Aggregation

```typescript
class FilesystemMetrics {
  private metrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    errors: 0
  };
  
  constructor(observableFs: ObservableFileSystem) {
    observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
      update: () => this.metrics.reads++
    });
  
    observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
      update: () => this.metrics.writes++
    });
  
    observableFs.getEventEmitter().subscribe(FilesystemEventTypes.DELETE, {
      update: () => this.metrics.deletes++
    });
  
    // Monitor errors across all event types
    Object.values(FilesystemEventTypes).forEach(eventType => {
      observableFs.getEventEmitter().subscribe(eventType, {
        update: (event) => {
          if (event.data.error) this.metrics.errors++;
        }
      });
    });
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  reset() {
    this.metrics = { reads: 0, writes: 0, deletes: 0, errors: 0 };
  }
}
```

### Performance Impact

**Zero Overhead When Not Monitoring**:

- Event emission: ~0.001ms per operation
- Memory footprint: ~50KB base + ~100 bytes per subscriber

**With Active Monitoring**:

- Performance impact: <1% in typical applications
- Memory usage: Depends on subscriber complexity

**Recommendation**: Enable in development/staging for debugging, selectively in production for monitoring.

### Integration Examples

#### With Express.js

```typescript
// Monitor filesystem operations per request
app.use((req, res, next) => {
  const requestFs = new ObservableFileSystem(nodeFs);
  const operations: string[] = [];
  
  requestFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
    update: (event) => operations.push(`READ: ${event.data.filePath}`)
  });
  
  requestFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
    update: (event) => operations.push(`WRITE: ${event.data.filePath}`)
  });
  
  req.filesystem = requestFs;
  
  res.on('finish', () => {
    console.log(`Request ${req.url} filesystem operations:`, operations);
  });
  
  next();
});
```

#### With Testing

```typescript
// Test filesystem behavior
test('service should read config files', () => {
  const memFs = new MemFileSystem();
  const observableFs = new ObservableFileSystem(memFs);
  const operations: string[] = [];
  
  observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
    update: (event) => operations.push(event.data.filePath)
  });
  
  const service = new MyService(observableFs);
  service.initialize();
  
  expect(operations).toContain('./config.json');
  expect(operations).toContain('./templates/default.html');
});
```

> When nothing is done, nothing is left undone.
>
> - Lao Tzu

$ whoami
0en
