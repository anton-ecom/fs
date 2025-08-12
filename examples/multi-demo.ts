#!/usr/bin/env node

/**
 * Multi-Layer Filesystem Demo
 * 
 * Demonstrates the composition pattern with:
 * - Base: AsyncNodeFileSystem (real filesystem)
 * - Layer 1: AsyncWithIdFileSystem (deterministic IDs + aliases)
 * - Layer 2: AsyncCachedFileSystem (intelligent caching)
 * - Layer 3: AsyncObservableFileSystem (event monitoring)
 * - Top: AsyncFileSystem Unit (consciousness layer)
 */

import { AsyncFileSystem } from '../src/promises/async-filesystem.unit';

import { 
  NodeFileSystem,
  WithIdFileSystem,
  CachedFileSystem,
  ObservableFileSystem,
  FilesystemEventTypes,
  type FilesystemEvent
} from '../src/promises/index';

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { EventEmitter } from '@synet/patterns';

// Demo configuration
const DEMO_DIR = join(tmpdir(), 'synet-fs-demo');
const DEMO_FILES = {
  config: 'config/app.json',
  user: 'users/john-doe.json',
  document: 'docs/readme.md',
  image: 'assets/logo.png'
};

const CONFIG_DATA = {
  app: 'SYNET Demo',
  version: '2.0.0',
  environment: 'demo',
  features: ['caching', 'observability', 'id-mapping']
};

const USER_DATA = {
  id: 'john-doe',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'developer'
};

const README_CONTENT = `# SYNET Filesystem Demo

This document was created through a multi-layer filesystem composition:

1. **AsyncNodeFileSystem**: Real filesystem operations
2. **AsyncWithIdFileSystem**: Deterministic IDs and aliases
3. **AsyncCachedFileSystem**: Intelligent caching layer
4. **AsyncObservableFileSystem**: Event monitoring and observability
5. **AsyncFileSystem Unit**: Consciousness-based architecture

The file you're reading has a deterministic ID and can be accessed by path, ID, or alias.
`;

async function setupDemo(): Promise<void> {
  console.log('🚀 Setting up demo environment...');
  
  // Clean and create demo directory
  try {
    await fs.rm(DEMO_DIR, { recursive: true, force: true });
  } catch (err) {
    // Directory might not exist, that's fine
  }
  
  await fs.mkdir(DEMO_DIR, { recursive: true });
  process.chdir(DEMO_DIR);
  
  console.log(`📁 Demo directory: ${DEMO_DIR}`);
}

async function createMultiLayerFileSystem(): Promise<{
  fs: AsyncFileSystem;
  eventEmitter: EventEmitter<FilesystemEvent>;
  observableAdapter: ObservableFileSystem;
  withIdAdapter: WithIdFileSystem;
}> {
  console.log('\n🏗️  Building multi-layer filesystem...');
  
  // Layer 0: Base filesystem (real Node.js fs)
  const nodeAdapter = new NodeFileSystem();
  console.log('  ✅ Layer 0: AsyncNodeFileSystem (base filesystem)');
  
  // Layer 1: Add deterministic IDs and aliases
  const withIdAdapter = new WithIdFileSystem(nodeAdapter);
  console.log('  ✅ Layer 1: AsyncWithIdFileSystem (ID mapping)');
  
  // Layer 2: Add intelligent caching
  const cachedAdapter = new CachedFileSystem(withIdAdapter, {
    maxSize: 100,
    ttl: 30000 // 30 seconds TTL for demo
  });
  console.log('  ✅ Layer 2: AsyncCachedFileSystem (intelligent caching)');
  
  // Layer 3: Add observability and monitoring
  const observableAdapter = new ObservableFileSystem(cachedAdapter);
  console.log('  ✅ Layer 3: AsyncObservableFileSystem (monitoring)');
  
  // Get the event emitter before wrapping in Unit
  const eventEmitter = observableAdapter.getEventEmitter();
  
  // Top Layer: Unit Architecture consciousness
  const fsUnit = AsyncFileSystem.create({ adapter: observableAdapter });
  console.log('  ✅ Unit Layer: AsyncFileSystem (consciousness)');
  
  return {
    fs: fsUnit,
    eventEmitter,
    observableAdapter,
    withIdAdapter
  };
}

function setupEventMonitoring(eventEmitter: EventEmitter<FilesystemEvent>): void {
  console.log('\n👁️  Setting up event monitoring...');
  
  // Monitor all filesystem events
  for (const eventType of Object.values(FilesystemEventTypes)) {
    eventEmitter.subscribe(eventType, {
      update(event) {
        const timestamp = new Date().toISOString();
        const { operation, filePath, error, result } = event.data;
        
        if (!error) {
          console.log(`  📝 [${timestamp}] ${operation.toUpperCase()}: ${filePath} ${result ? `(result: ${typeof result})` : ''}`);
        } else {
          console.log(`  ❌ [${timestamp}] ${operation.toUpperCase()} FAILED: ${filePath} - ${error.message}`);
        }
      }
    });
  }
  
  console.log('  ✅ Event monitoring active for all operations');
}

async function demonstrateBasicOperations(fs: AsyncFileSystem): Promise<void> {
  console.log('\n📝 Demonstrating basic operations...');
  
  // Create directory structure and files
  await fs.ensureDir('config');
  await fs.ensureDir('users');
  await fs.ensureDir('docs');
  await fs.ensureDir('assets');
  
  // Write different types of files
  await fs.writeFile(DEMO_FILES.config, JSON.stringify(CONFIG_DATA, null, 2));
  await fs.writeFile(DEMO_FILES.user, JSON.stringify(USER_DATA, null, 2));
  await fs.writeFile(DEMO_FILES.document, README_CONTENT);
  await fs.writeFile(DEMO_FILES.image, 'fake-png-data'); // Simple string for demo
  
  console.log('  ✅ Created directory structure and sample files');
}

async function demonstrateIdMapping(fs: AsyncFileSystem, withIdAdapter: WithIdFileSystem): Promise<void> {
  console.log('\n🔗 Demonstrating ID mapping capabilities...');

  console.log('\n  File ID/Alias mapping:');
  
  for (const [name, path] of Object.entries(DEMO_FILES)) {
    const id = withIdAdapter.getId(path);
    const alias = withIdAdapter.getAlias(path);
    
    console.log(`    ${name.padEnd(10)}: ${path}`);
    console.log(`    ${''.padEnd(10)}  ID: ${id}`);
    console.log(`    ${''.padEnd(10)}  Alias: ${alias}`);
    console.log('');
  }
  
  // Demonstrate triple access (path, ID, alias)
  console.log('  Testing triple access for config file:');
  const configPath = DEMO_FILES.config;
  const configId = withIdAdapter.getId(configPath);
  const configAlias = withIdAdapter.getAlias(configPath);
  
  // Access by original path
  const content1 = await fs.readFile(configPath);
  console.log(`    ✅ Access by path: ${configPath} (${content1.length} bytes)`);
  
  // Access by ID
  const content2 = await withIdAdapter.getByIdOrAlias(configId);
  console.log(`    ✅ Access by ID: ${configId} (${content2.length} bytes)`);
  
  // Access by alias
  const content3 = await withIdAdapter.getByIdOrAlias(configAlias);
  console.log(`    ✅ Access by alias: ${configAlias} (${content3.length} bytes)`);
  
  // Verify all access methods return same content
  const allSame = content1 === content2 && content2 === content3;
  console.log(`    ✅ All access methods return identical content: ${allSame}`);
}

async function demonstrateCaching(fs: AsyncFileSystem): Promise<void> {
  console.log('\n💾 Demonstrating caching capabilities...');
  
  const testFile = 'cache-test.json';
  const testData = { message: 'Testing cache performance', timestamp: Date.now() };
  
  await fs.writeFile(testFile, JSON.stringify(testData));
  
  console.log('  Testing read performance with caching:');
  
  // First read (cache miss)
  const start1 = Date.now();
  await fs.readFile(testFile);
  const time1 = Date.now() - start1;
  console.log(`    First read (cache miss): ${time1}ms`);
  
  // Second read (cache hit)
  const start2 = Date.now();
  await fs.readFile(testFile);
  const time2 = Date.now() - start2;
  console.log(`    Second read (cache hit): ${time2}ms`);
  
  // Third read (cache hit)
  const start3 = Date.now();
  await fs.readFile(testFile);
  const time3 = Date.now() - start3;
  console.log(`    Third read (cache hit): ${time3}ms`);
  
  const improvement = time1 > 0 ? ((time1 - time2) / time1 * 100).toFixed(1) : 'N/A';
  console.log(`    ✅ Cache performance improvement: ~${improvement}% faster`);
}

async function demonstrateDirectoryOperations(fs: AsyncFileSystem): Promise<void> {
  console.log('\n📂 Demonstrating directory operations...');
  
  // List all files
  const allFiles = await fs.readDir('.');
  console.log(`  📁 Root directory contains ${allFiles.length} items:`);
  for (const file of allFiles) {
    console.log(`    - ${file}`);
  }
  
  // Check existence
  console.log('\n  File existence checks:');
  for (const [name, path] of Object.entries(DEMO_FILES)) {
    const exists = await fs.exists(path);
    console.log(`    ${name.padEnd(10)}: ${exists ? '✅' : '❌'} ${path}`);
  }
  
  // Get file stats (if available)
  console.log('\n  File statistics:');
  try {
    const configStats = await fs.stat(DEMO_FILES.config);
    console.log(`    Config file: ${configStats.size} bytes, modified: ${configStats.mtime?.toISOString()}`);
  } catch (error) {
    console.log('    ℹ️  File stats not available on this backend composition');
  }
}

async function demonstrateErrorHandling(fs: AsyncFileSystem): Promise<void> {
  console.log('\n⚠️  Demonstrating error handling...');
  
  try {
    await fs.readFile('nonexistent-file.txt');
  } catch (error) {
    console.log(`    ✅ Gracefully handled missing file error: ${error.message}`);
  }
  
  try {
    await fs.readDir('nonexistent-directory');
  } catch (error) {
    console.log(`    ✅ Gracefully handled missing directory error: ${error.message}`);
  }
}

async function cleanupDemo(): Promise<void> {
  console.log('\n🧹 Cleaning up demo...');
  
  try {
    await fs.rm(DEMO_DIR, { recursive: true, force: true });
    console.log('  ✅ Demo directory cleaned up');
  } catch (error) {
    console.log(`  ⚠️  Cleanup warning: ${error.message}`);
  }
}

async function runDemo(): Promise<void> {
  console.log('🎯 SYNET Multi-Layer Filesystem Demo');
  console.log('=====================================\n');
  
  try {
    // Setup
    await setupDemo();
    
    // Create the multi-layer filesystem
    const { fs, eventEmitter, withIdAdapter } = await createMultiLayerFileSystem();
    
    // Setup monitoring
    setupEventMonitoring(eventEmitter);
    
    // Run demonstrations
    await demonstrateBasicOperations(fs);
    await demonstrateIdMapping(fs, withIdAdapter);
    await demonstrateCaching(fs);
    await demonstrateDirectoryOperations(fs);
    await demonstrateErrorHandling(fs);
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\nKey takeaways:');
    console.log('  • Multi-layer composition works seamlessly');
    console.log('  • Each layer adds specific capabilities');
    console.log('  • Event monitoring provides full observability');
    console.log('  • Caching improves performance automatically');
    console.log('  • ID mapping enables stable references');
    console.log('  • Unit Architecture provides consciousness layer');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  } finally {
    await cleanupDemo();
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
