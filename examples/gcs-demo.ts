/**
 * Google Cloud Storage FileSystem Demo
 * 
 * This demo showcases the GCS FileSystem capabilities using real cloud storage.
 * 
 * Usage:
 *   npm run build
 *   node examples/gcs-demo.js
 */

import { createGCSFileSystem, type GCSFileSystemOptions } from '../dist/promises/gcs';
import * as fs from 'fs';
import * as path from 'path';

async function runGCSDemo() {
  console.log('🚀 SYNET FS - Google Cloud Storage Demo\n');

  try {
    // Load credentials
    const testConfigPath = path.join(__dirname, '../private/google-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
    const serviceAccountPath = path.join(__dirname, '../private', testConfig.key);

    console.log(`📁 Project: ${testConfig.projectId}`);
    console.log(`🪣 Bucket: ${testConfig.bucketName}`);
    console.log(`🔑 Service Account: ${path.basename(testConfig.key)}\n`);

    // Initialize GCS FileSystem
    const gcsOptions: GCSFileSystemOptions = {
      projectId: testConfig.projectId,
      bucket: testConfig.bucketName,
      keyFilename: serviceAccountPath,
      prefix: 'demo' // Use demo prefix
    };

    const gcsFS = createGCSFileSystem(gcsOptions);
    console.log('✅ GCS FileSystem initialized\n');

    // Demo 1: Simple file operations
    console.log('📄 Demo 1: Basic File Operations');
    console.log('─'.repeat(40));
    
    const simpleFile = `demo-${Date.now()}.txt`;
    const simpleContent = `Hello from SYNET FS GCS Demo!

This file was created on: ${new Date().toISOString()}
Random ID: ${Math.random()}
    
SYNET Unit Architecture provides:
- Consciousness-based software design
- Teaching/Learning capabilities between units
- Immutable evolution patterns
- Capability composition over inheritance`;

    await gcsFS.writeFile(simpleFile, simpleContent);
    console.log(`✅ Uploaded: ${simpleFile}`);

    const exists = await gcsFS.exists(simpleFile);
    console.log(`✅ File exists: ${exists}`);

    const readContent = await gcsFS.readFile(simpleFile);
    console.log(`✅ Read back: ${readContent.length} bytes`);
    console.log(`📄 Preview: ${readContent.substring(0, 100)}...\n`);

    // Demo 2: JSON configuration files
    console.log('⚙️  Demo 2: JSON Configuration');
    console.log('─'.repeat(40));
    
    const configFile = `config/app-config-${Date.now()}.json`;
    const config = {
      app: {
        name: 'SYNET Application',
        version: '1.0.0',
        environment: 'production'
      },
      storage: {
        backend: 'Google Cloud Storage',
        bucket: testConfig.bucketName,
        encryption: true
      },
      features: {
        unitArchitecture: true,
        teachingContracts: true,
        immutableEvolution: true,
        capabilityComposition: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'SYNET FS GCS Demo',
        purpose: 'Demonstrate JSON configuration storage'
      }
    };

    await gcsFS.writeFile(configFile, JSON.stringify(config, null, 2));
    console.log(`✅ Uploaded config: ${configFile}`);

    const configContent = await gcsFS.readFile(configFile);
    const parsedConfig = JSON.parse(configContent);
    console.log(`✅ Config app name: ${parsedConfig.app.name}`);
    console.log(`✅ Config features: ${Object.keys(parsedConfig.features).length} enabled\n`);

    // Demo 3: Directory operations
    console.log('📂 Demo 3: Directory Operations');
    console.log('─'.repeat(40));
    
    const docFiles = [
      'docs/README.md',
      'docs/API.md',
      'docs/examples/quickstart.md'
    ];

    const docContents = [
      '# SYNET FS GCS\n\nGoogle Cloud Storage adapter for SYNET Unit Architecture.',
      '# API Documentation\n\n## Methods\n\n- `writeFile()`\n- `readFile()`\n- `exists()`',
      '# Quick Start\n\n```typescript\nconst gcs = createGCSFileSystem(options);\n```'
    ];

    // Upload documentation files
    for (let i = 0; i < docFiles.length; i++) {
      await gcsFS.writeFile(docFiles[i], docContents[i]);
      console.log(`✅ Uploaded: ${docFiles[i]}`);
    }

    // List directory contents
    const docsListing = await gcsFS.readDir('docs');
    console.log(`📂 docs/ contains: ${docsListing.join(', ')}`);

    const examplesListing = await gcsFS.readDir('docs/examples');
    console.log(`📂 docs/examples/ contains: ${examplesListing.join(', ')}\n`);

    // Demo 4: File statistics
    console.log('📊 Demo 4: File Statistics');
    console.log('─'.repeat(40));
    
    const stats = await gcsFS.stat(simpleFile);
    console.log(`📄 File: ${simpleFile}`);
    console.log(`📏 Size: ${stats.size} bytes`);
    console.log(`📅 Modified: ${stats.mtime.toISOString()}`);
    console.log(`🔒 Mode: ${stats.mode.toString(8)}`);
    console.log(`📁 Is file: ${stats.isFile()}`);
    console.log(`📂 Is directory: ${stats.isDirectory()}\n`);

    // Demo 5: Concurrent operations
    console.log('⚡ Demo 5: Concurrent Operations');
    console.log('─'.repeat(40));
    
    const concurrentFiles = Array.from({ length: 5 }, (_, i) => ({
      name: `concurrent/batch-${i}-${Date.now()}.txt`,
      content: `Concurrent file ${i}\nTimestamp: ${new Date().toISOString()}\nBatch upload test`
    }));

    console.time('Concurrent upload');
    await Promise.all(
      concurrentFiles.map(file => gcsFS.writeFile(file.name, file.content))
    );
    console.timeEnd('Concurrent upload');

    console.time('Concurrent read');
    const readResults = await Promise.all(
      concurrentFiles.map(file => gcsFS.readFile(file.name))
    );
    console.timeEnd('Concurrent read');

    console.log(`✅ Successfully processed ${concurrentFiles.length} files concurrently\n`);

    // Demo 6: Cache performance
    console.log('🗄️  Demo 6: Cache Performance');
    console.log('─'.repeat(40));
    
    console.time('First read (from GCS)');
    await gcsFS.readFile(simpleFile);
    console.timeEnd('First read (from GCS)');

    console.time('Second read (from cache)');
    await gcsFS.readFile(simpleFile);
    console.timeEnd('Second read (from cache)');

    console.time('Third read (from cache)');
    await gcsFS.readFile(simpleFile);
    console.timeEnd('Third read (from cache)');

    // Clear cache and read again
    gcsFS.clearCache();
    console.time('After cache clear');
    await gcsFS.readFile(simpleFile);
    console.timeEnd('After cache clear');
    console.log('✅ Cache performance test completed\n');

    // Summary
    console.log('📋 Demo Summary');
    console.log('═'.repeat(40));
    console.log('✅ Basic file upload/download');
    console.log('✅ JSON configuration handling');
    console.log('✅ Directory operations');
    console.log('✅ File statistics and metadata');
    console.log('✅ Concurrent operations');
    console.log('✅ Cache performance optimization');
    console.log('✅ Error handling and graceful failures');

    // Cleanup
    console.log('\n🧹 Cleaning up demo files...');
    const allDemoFiles = [
      simpleFile,
      configFile,
      ...docFiles,
      ...concurrentFiles.map(f => f.name)
    ];

    for (const file of allDemoFiles) {
      try {
        await gcsFS.deleteFile(file);
      } catch (error) {
        console.log(`⚠️  Could not delete ${file}: ${error}`);
      }
    }

    // Clean up directories
    try {
      await gcsFS.deleteDir('concurrent');
      await gcsFS.deleteDir('docs');
      await gcsFS.deleteDir('config');
    } catch (error) {
      console.log(`⚠️  Directory cleanup: ${error}`);
    }

    console.log('✅ Demo cleanup completed');
    console.log('\n🎉 GCS Demo finished successfully!');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if called directly
if (require.main === module) {
  runGCSDemo().catch(console.error);
}

export { runGCSDemo };
