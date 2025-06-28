# AnalyticsFileSystem

**Type-safe filesystem analytics and usage tracking for Node.js applications.**

Filesystem operations are expensive. They can degrade performance while staying under the radar. Tracking repated reads/writes, wrongly accessed files, the read sequence,  events to your local or remote monitoring   - everything that you need to write reliable and predictable filesystem code.

## Overview

`AnalyticsFileSystem` is a decorator pattern implementation that wraps any filesystem (sync or async) to provide comprehensive analytics and usage tracking. It monitors file operations, collects statistics, and emits analytics events when configurable thresholds are reached.

## Why AnalyticsFileSystem?

### Traditional Pain Points

**Manual Tracking Complexity**:

```typescript
// ❌ Manual tracking scattered throughout code
class FileManager {
  private readCount = 0;
  private writeCount = 0;
  
  readFile(path: string) {
    this.readCount++; // Easy to forget
    return fs.readFileSync(path);
  }
  
  writeFile(path: string, data: string) {
    this.writeCount++; // Boilerplate everywhere
    fs.writeFileSync(path, data);
  }
  
  getStats() {
    return { reads: this.readCount, writes: this.writeCount };
  }
}
```

**No Observability**:

```typescript
// ❌ No insight into filesystem usage patterns
// - Which files are accessed most?
// - What's the read/write ratio?
// - When do operations occur?
// - How to optimize based on usage?
```

**Performance Monitoring Gaps**:

```typescript
// ❌ No automated alerts or thresholds
// - High I/O operations might go unnoticed
// - No way to detect usage spikes
// - Manual monitoring required
```

### AnalyticsFileSystem Solution

**Transparent Analytics**:

```typescript
// ✅ Zero-boilerplate analytics
const memFs = new MemFileSystem();
const analyticsFs = new AnalyticsFileSystem(memFs);

// All operations automatically tracked
analyticsFs.writeFileSync('./config.json', data);
analyticsFs.readFileSync('./config.json');

// Rich analytics available
const stats = analyticsFs.getStats();
console.log(`Reads: ${stats.stats.read}, Writes: ${stats.stats.write}`);
```

**Automated Event Emission**:

```typescript
// ✅ Configurable thresholds with events
const { instance, eventEmitter } = createAnalyticsFileSystem(baseFs, { 
  emitOn: 100 // Emit every 100 operations
});

eventEmitter.subscribe('analytics.stats', {
  update(event) {
    console.log('Analytics update:', event.data);
    // Send to monitoring system, trigger alerts, etc.
  }
});
```

## Use Cases

### 1. **Application Performance Monitoring**

Track file I/O patterns to optimize application performance:

```typescript
const { instance, eventEmitter } = createAnalyticsFileSystem(nodeFs, { emitOn: 1000 });

eventEmitter.subscribe('analytics.stats', {
  update(event) {
    const { stats, fileReads } = event.data;
  
    // Detect hot files
    const hotFiles = fileReads
      .reduce((acc, read) => {
        acc[read.file] = (acc[read.file] || 0) + 1;
        return acc;
      }, {});
    
    // Alert on high I/O
    if (stats.read + stats.write > 5000) {
      alertingService.send('High filesystem I/O detected');
    }
  }
});
```

### 2. **Development & Testing Analytics**

Monitor filesystem usage during development and testing:

```typescript
// In test environment
const analyticsFs = new AnalyticsFileSystem(memFs);

// Run tests...
afterAll(() => {
  const stats = analyticsFs.getStats();
  console.log(`Test suite performed ${stats.stats.read} reads, ${stats.stats.write} writes`);
  
  // Detect potential optimization opportunities
  if (stats.stats.read > stats.stats.write * 10) {
    console.warn('Consider caching: high read-to-write ratio detected');
  }
});
```

### 3. **Resource Usage Tracking**

 Track which parts of your application use filesystem resources:

```typescript
const configFs = new AnalyticsFileSystem(nodeFs, { emitOn: 50 });
const cacheFs = new AnalyticsFileSystem(nodeFs, { emitOn: 100 });

// Track different usage patterns
configFs.readFileSync('./app-config.json');
cacheFs.writeFileSync('./cache/user-data.json', data);

// Compare usage patterns
console.log('Config reads:', configFs.getStats().stats.read);
console.log('Cache writes:', cacheFs.getStats().stats.write);
```

### 4. **Audit & Compliance**

Maintain detailed logs of file access for audit purposes:

```typescript
const auditFs = new AnalyticsFileSystem(nodeFs, { emitOn: 1 });

auditFs.getEventEmitter().subscribe('analytics.stats', {
  update(event) {
    // Log every file operation for compliance
    event.data.fileReads.forEach(access => {
      auditLogger.log({
        timestamp: access.timestamp,
        operation: access.access,
        file: access.file,
        user: getCurrentUser()
      });
    });
  }
});
```

## API Reference

### Constructor Options

```typescript
interface AnalyticsFileSystemOptions {
  emitOn?: number; // Default: 100
}
```

### Core Methods

#### `getStats(): Stats`

Returns current analytics statistics:

```typescript
interface Stats {
  stats: {
    read: number;
    write: number;
    delete: number;
  };
  fileReads: Array<{
    file: string;
    timestamp: string; // ISO string
    access: 'read' | 'write' | 'delete';
  }>;
}
```

#### `getEventEmitter(): EventEmitter<AnalyticsStatsEvent>`

Returns the event emitter for analytics events:

```typescript
interface AnalyticsStatsEvent {
  type: 'analytics.stats';
  data: Stats;
}
```

### Factory Function

#### `createAnalyticsFileSystem(baseFs, options)`

Convenience factory that returns both instance and event emitter:

```typescript
const { instance, eventEmitter } = createAnalyticsFileSystem(baseFs, { emitOn: 50 });

// No need to call instance.getEventEmitter()
eventEmitter.subscribe('analytics.stats', observer);
```

## Examples

### Basic Usage

```typescript
import { AnalyticsFileSystem } from '@synet/fs';
import { NodeFileSystem } from '@synet/fs';

const nodeFs = new NodeFileSystem();
const analyticsFs = new AnalyticsFileSystem(nodeFs);

// Perform operations
analyticsFs.writeFileSync('./data.txt', 'Hello World');
analyticsFs.readFileSync('./data.txt');
analyticsFs.readFileSync('./data.txt');

// Get statistics
const stats = analyticsFs.getStats();
console.log(stats);
// Output: {
//   stats: { read: 2, write: 1, delete: 0 },
//   fileReads: [
//     { file: './data.txt', timestamp: '2025-06-28T...', access: 'write' },
//     { file: './data.txt', timestamp: '2025-06-28T...', access: 'read' },
//     { file: './data.txt', timestamp: '2025-06-28T...', access: 'read' }
//   ]
// }
```

### Event-Driven Analytics

```typescript
const { instance, eventEmitter } = createAnalyticsFileSystem(nodeFs, { emitOn: 3 });

let analyticsReceived = 0;
eventEmitter.subscribe('analytics.stats', {
  update(event) {
    analyticsReceived++;
    console.log(`Analytics batch ${analyticsReceived}:`, event.data);
  }
});

// Trigger analytics emission
instance.writeFileSync('./file1.txt', 'data1');
instance.writeFileSync('./file2.txt', 'data2');
instance.readFileSync('./file1.txt'); // This triggers emission

// Stats are automatically reset after emission
console.log('Current stats after emission:', instance.getStats());
// Output: { stats: { read: 0, write: 0, delete: 0 }, fileReads: [] }
```

### Async Usage

```typescript
import { AnalyticsFileSystem } from '@synet/fs/promises';
import { NodeFileSystem } from '@synet/fs/promises';

const nodeFs = new NodeFileSystem();
const analyticsFs = new AnalyticsFileSystem(nodeFs);

// Async operations
await analyticsFs.writeFile('./async-data.txt', 'Hello Async');
await analyticsFs.readFile('./async-data.txt');

// Same analytics API
const stats = analyticsFs.getStats();
console.log('Async operations:', stats.stats);
```

### Composition with Other Filesystems

```typescript
// Layer analytics on top of other filesystem decorators
const memFs = new MemFileSystem();
const observableFs = new ObservableFileSystem(memFs);
const analyticsFs = new AnalyticsFileSystem(observableFs);

// Get both detailed events and aggregated analytics
observableFs.getEventEmitter().subscribe('file.write', { 
  update: (event) => console.log('Write event:', event) 
});

analyticsFs.getEventEmitter().subscribe('analytics.stats', {
  update: (event) => console.log('Analytics:', event.data.stats)
});

analyticsFs.writeFileSync('./composed.txt', 'data');
// Output:
// Write event: { type: 'file.write', data: { filePath: './composed.txt', ... } }
// Analytics: { read: 0, write: 1, delete: 0 }
```

## Best Practices

### 1. **Choose Appropriate Thresholds**

```typescript
// For high-frequency operations
const fastFs = createAnalyticsFileSystem(baseFs, { emitOn: 1000 });

// For audit/monitoring
const auditFs = createAnalyticsFileSystem(baseFs, { emitOn: 1 });

// For periodic reporting
const reportFs = createAnalyticsFileSystem(baseFs, { emitOn: 100 });
```

### 2. **Handle Analytics Events Asynchronously**

```typescript
eventEmitter.subscribe('analytics.stats', {
  update(event) {
    // Don't block filesystem operations
    setImmediate(() => {
      sendToAnalyticsService(event.data);
    });
  }
});
```

### 3. **Use Factory for Event-Heavy Scenarios**

```typescript
// ✅ Clean access to event emitter
const { instance, eventEmitter } = createAnalyticsFileSystem(baseFs);

// ❌ More verbose
const instance = new AnalyticsFileSystem(baseFs);
const eventEmitter = instance.getEventEmitter();
```

## Opportunities

The `AnalyticsFileSystem` pattern enables several powerful extensions:

- **MetricsFileSystem**: Export metrics to Prometheus/Grafana
- **AlertingFileSystem**: Trigger alerts on usage patterns
- **OptimizationFileSystem**: Suggest caching based on read patterns
- **QuotaFileSystem**: Enforce usage limits with analytics
- **ReportingFileSystem**: Generate usage reports automatically
- **PredictiveFileSystem**: Predict storage needs based on patterns
