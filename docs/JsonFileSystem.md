# JsonFileSystem `<T>`

`JsonFileSystem<T>` provides type-safe JSON file operations by wrapping any `IFileSystem` or `IAsyncFileSystem` implementation. Instead of dealing with raw strings, you work directly with typed objects that are automatically parsed and stringified.Installation

```bash
npm install @synet/fs
```

## Quick Start

```typescript
import { JsonFileSystem } from '@synet/fs';
import { NodeFileSystem } from '@synet/fs';

interface Config {
  theme: 'light' | 'dark';
  version: string;
  features: string[];
}

const jsonFs = new JsonFileSystem<Config>(new NodeFileSystem());

// Write typed data - automatically stringified
const config: Config = {
  theme: 'dark',
  version: '1.0.0',
  features: ['notifications', 'analytics']
};

jsonFs.writeJsonSync('./config.json', config);

// Read typed data - automatically parsed
const loadedConfig = jsonFs.readJsonSync('./config.json');
console.log(loadedConfig.theme); // TypeScript knows this is 'light' | 'dark'
```

## Why JsonFileSystem?

### ❌ Traditional Approach

```typescript
import fs from 'node:fs';

// Manual, error-prone, no type safety
const rawData = fs.readFileSync('./config.json', 'utf8');
const config = JSON.parse(rawData); // any type
config.theme = 'purple'; // No error checking
fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
```

### ✅ JsonFileSystem Approach

```typescript
import { JsonFileSystem } from '@synet/fs';

const jsonFs = new JsonFileSystem<Config>(new NodeFileSystem());

// Type-safe, clean, automatic
const config = jsonFs.readJsonSync('./config.json'); // Config type
config.theme = 'dark'; // Only valid values allowed
jsonFs.writeJsonSync('./config.json', config); // Auto-formatted
```

## Features

- **Type Safety** - Full TypeScript support with generic types
- **Automatic Parsing** - No manual JSON.parse/stringify
- **Formatted Output** - Pretty-printed JSON with configurable spacing
- **Error Handling** - Specific error types for debugging
- **Partial Updates** - Merge updates without full rewrites
- **Validation** - Optional data validation before writes
- **Testable** - Works with any filesystem implementation
- **Sync & Async** - Both synchronous and asynchronous APIs

## Use Cases

- **Configuration Management** - Type-safe app settings, user preferences
- **Data Persistence** - Small structured data without database overhead
- **Cache Storage** - Typed cache entries with expiration metadata
- **State Management** - Application state persistence across restarts
- **API Responses** - Cache typed API responses locally
- **Build Artifacts** - Store typed build metadata and dependencies
- **Development Tools** - IDE settings, project configurations
- **Testing** - Mock data with proper typing

## Basic Operations

### Reading JSON Files

```typescript
// Read with type safety
const config = jsonFs.readJsonSync('./config.json');

// Read with default fallback
const defaultConfig: Config = { theme: 'light', version: '1.0.0', features: [] };
const config = jsonFs.readJsonSyncWithDefault('./config.json', defaultConfig);

// Check if file contains valid JSON
if (jsonFs.isValidJsonSync('./config.json')) {
  const config = jsonFs.readJsonSync('./config.json');
}
```

### Writing JSON Files

```typescript
const config: Config = {
  theme: 'dark',
  version: '2.0.0',
  features: ['notifications']
};

// Simple write
jsonFs.writeJsonSync('./config.json', config);

// Write with validation
jsonFs.writeJsonSyncWithValidation('./config.json', config);

// Partial update (shallow merge)
jsonFs.updateJsonSync('./config.json', {
  version: '2.1.0',
  features: ['notifications', 'analytics']
});
```

## Async Operations

```typescript
import { JsonFileSystem } from '@synet/fs/promises';
import { NodeFileSystem } from '@synet/fs/promises';

const asyncJsonFs = new JsonFileSystem<Config>(new NodeFileSystem());

// All operations return Promises
const config = await asyncJsonFs.readJson('./config.json');
await asyncJsonFs.writeJson('./config.json', config);

// Atomic updates with custom logic
await asyncJsonFs.atomicUpdate('./config.json', (current) => ({
  ...current,
  version: incrementVersion(current.version),
  lastUpdated: new Date().toISOString()
}));
```

## Advanced Configuration

```typescript
const jsonFs = new JsonFileSystem<Config>(new NodeFileSystem(), {
  // Custom formatting
  space: 4, // Use 4 spaces for indentation
  
  // Custom replacer (remove sensitive data)
  replacer: (key, value) => {
    if (key === 'password') return undefined;
    return value;
  },
  
  // Data validation
  validator: (data) => {
    const config = data as Config;
    return config.version && config.theme && Array.isArray(config.features);
  }
});
```

## Error Handling

```typescript
import { JsonParseError, JsonStringifyError, JsonValidationError } from '@synet/fs';

try {
  const config = jsonFs.readJsonSync('./config.json');
} catch (error) {
  if (error instanceof JsonParseError) {
    console.error('Invalid JSON format:', error.cause);
  } else {
    console.error('File read error:', error);
  }
}

try {
  jsonFs.writeJsonSyncWithValidation('./config.json', invalidConfig);
} catch (error) {
  if (error instanceof JsonValidationError) {
    console.error('Data validation failed:', error.message);
  }
}
```

## Testing

JsonFileSystem works seamlessly with in-memory filesystems for testing:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { JsonFileSystem } from '@synet/fs';
import { MemFileSystem } from '@synet/fs';

describe('ConfigService', () => {
  let jsonFs: JsonFileSystem<Config>;
  
  beforeEach(() => {
    // Use in-memory filesystem for fast, isolated tests
    jsonFs = new JsonFileSystem<Config>(new MemFileSystem());
  });
  
  it('should save and load configuration', () => {
    const config: Config = {
      theme: 'dark',
      version: '1.0.0',
      features: ['notifications']
    };
  
    jsonFs.writeJsonSync('./test-config.json', config);
    const loaded = jsonFs.readJsonSync('./test-config.json');
  
    expect(loaded).toEqual(config);
    expect(loaded.theme).toBe('dark'); // Type-safe access
  });
});
```

## Composition with Other Filesystems

```typescript
import { ObservableFileSystem, FilesystemEventTypes } from '@synet/fs';

// Combine with observable filesystem for monitoring
const observableFs = new ObservableFileSystem(new NodeFileSystem());
const jsonFs = new JsonFileSystem<Config>(observableFs);

// Monitor JSON file changes
observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
  update(event) {
    console.log(`Config updated: ${event.data.filePath}`);
  }
});

// Writes will now trigger events
jsonFs.writeJsonSync('./config.json', config);
```

## API Reference

### Constructor

```typescript
new JsonFileSystem<T>(
  baseFileSystem: IFileSystem | IAsyncFileSystem,
  options?: JsonFileSystemOptions
)
```

### Options

```typescript
interface JsonFileSystemOptions {
  space?: string | number;                              // JSON formatting
  replacer?: (key: string, value: unknown) => unknown; // JSON.stringify replacer
  validator?: (data: unknown) => boolean;               // Data validation
}
```

### Sync Methods

| Method                                      | Description                        |
| ------------------------------------------- | ---------------------------------- |
| `readJsonSync(path)`                      | Read and parse JSON file as type T |
| `writeJsonSync(path, data)`               | Stringify and write typed data     |
| `readJsonSyncWithDefault(path, default)`  | Read with fallback value           |
| `updateJsonSync(path, updates)`           | Partial update with merge          |
| `writeJsonSyncWithValidation(path, data)` | Write with validation              |
| `isValidJsonSync(path)`                   | Check if file contains valid JSON  |

### Async Methods

| Method                                  | Description                        |
| --------------------------------------- | ---------------------------------- |
| `readJson(path)`                      | Read and parse JSON file as type T |
| `writeJson(path, data)`               | Stringify and write typed data     |
| `readJsonWithDefault(path, default)`  | Read with fallback value           |
| `updateJson(path, updates)`           | Partial update with merge          |
| `writeJsonWithValidation(path, data)` | Write with validation              |
| `isValidJson(path)`                   | Check if file contains valid JSON  |
| `atomicUpdate(path, updater)`         | Atomic read-modify-write operation |

### Error Types

- `JsonParseError` - JSON parsing failed
- `JsonStringifyError` - JSON stringification failed
- `JsonValidationError` - Data validation failed

## License

MIT
