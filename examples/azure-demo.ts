/**
 * Azure Blob Storage FileSystem Demo
 * 
 * This demo showcases the Azure Blob Storage FileSystem capabilities using real cloud storage.
 * 
 * Usage:
 *   npm run build
 *   node examples/azure-demo.js
 */

import { createAzureBlobStorageFileSystem, type AzureBlobStorageOptions } from '../src/promises/azure';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAzureDemo() {
  console.log('🚀 SYNET FS - Azure Blob Storage Demo\n');

  try {
    // Load credentials
    const testConfigPath = path.join(__dirname, '../private/azyre-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log(`📁 Container: ${testConfig.containerName}`);
    console.log(`🔗 Account: hsfstest`);
    console.log(`🔑 Using connection string authentication\n`);

    // Initialize Azure Blob Storage FileSystem
    const azureOptions: AzureBlobStorageOptions = {
      connectionString: testConfig.connectionString,
      containerName: testConfig.containerName,
      prefix: 'demo' // Use demo prefix
    };

    const azureFS = createAzureBlobStorageFileSystem(azureOptions);
    console.log('✅ Azure Blob Storage FileSystem initialized\n');

    // Demo 1: Simple file operations
    console.log('📄 Demo 1: Basic File Operations');
    const textFile = `demo-text-${Date.now()}.txt`;
    const textContent = `Hello Azure Blob Storage from SYNET FS!\n\nThis is a demonstration of the Azure adapter.\nTimestamp: ${new Date().toISOString()}`;
    
    await azureFS.writeFile(textFile, textContent);
    console.log(`  ✅ Wrote: ${textFile}`);
    
    const readContent = await azureFS.readFile(textFile);
    console.log(`  ✅ Read: ${readContent.length} bytes`);
    console.log(`  📖 Preview: "${readContent.substring(0, 50)}..."\n`);

    // Demo 2: JSON file handling
    console.log('📄 Demo 2: JSON File Operations');
    const jsonFile = `demo-data-${Date.now()}.json`;
    const jsonData = {
      project: 'SYNET FS',
      adapter: 'Azure Blob Storage',
      timestamp: Date.now(),
      features: ['async operations', 'cloud storage', 'caching', 'directory simulation'],
      metadata: {
        version: '1.0.0',
        author: 'SYNET',
        performance: {
          upload: 'fast',
          download: 'cached',
          concurrent: 'supported'
        }
      }
    };
    
    await azureFS.writeFile(jsonFile, JSON.stringify(jsonData, null, 2));
    console.log(`  ✅ Wrote JSON: ${jsonFile}`);
    
    const readJsonContent = await azureFS.readFile(jsonFile);
    const parsedData = JSON.parse(readJsonContent);
    console.log(`  ✅ Read and parsed JSON successfully`);
    console.log(`  📊 Features: ${parsedData.features.join(', ')}\n`);

    // Demo 3: Directory operations
    console.log('📂 Demo 3: Directory Operations');
    const baseDir = `demo-directory-${Date.now()}`;
    
    // Create nested file structure
    await azureFS.writeFile(`${baseDir}/readme.md`, '# Demo Directory\n\nThis directory contains demo files.');
    await azureFS.writeFile(`${baseDir}/config.json`, '{"setting": "demo"}');
    await azureFS.writeFile(`${baseDir}/logs/app.log`, 'Demo log entry 1\nDemo log entry 2');
    await azureFS.writeFile(`${baseDir}/data/users.json`, '[{"id": 1, "name": "Demo User"}]');
    
    console.log(`  ✅ Created nested file structure in: ${baseDir}`);
    
    // List directory contents
    const contents = await azureFS.readDir(baseDir);
    console.log(`  📂 Directory contents: ${contents.join(', ')}`);
    
    // List subdirectory
    const logContents = await azureFS.readDir(`${baseDir}/logs`);
    console.log(`  📁 Logs directory: ${logContents.join(', ')}\n`);

    // Demo 4: File statistics
    console.log('📊 Demo 4: File Statistics');
    const stats = await azureFS.stat(textFile);
    console.log(`  📏 File size: ${stats.size} bytes`);
    console.log(`  🕒 Modified: ${stats.mtime.toISOString()}`);
    console.log(`  📄 Is file: ${stats.isFile()}`);
    console.log(`  📁 Is directory: ${stats.isDirectory()}\n`);

    // Demo 5: Concurrent operations
    console.log('⚡ Demo 5: Concurrent Operations');
    const concurrentPromises: Promise<void>[] = [];
    const concurrentBase = Date.now();
    
    for (let i = 0; i < 5; i++) {
      const fileName = `concurrent-demo-${concurrentBase}-${i}.txt`;
      const content = `Concurrent file ${i}\nUploaded at: ${new Date().toISOString()}`;
      concurrentPromises.push(azureFS.writeFile(fileName, content));
    }
    
    const startTime = Date.now();
    await Promise.all(concurrentPromises);
    const duration = Date.now() - startTime;
    
    console.log(`  ✅ Uploaded 5 files concurrently in ${duration}ms\n`);

    // Demo 6: Cache performance
    console.log('🗄️  Demo 6: Cache Performance');
    const cacheFile = `cache-demo-${Date.now()}.txt`;
    const cacheContent = 'This file will be cached for performance testing.';
    
    await azureFS.writeFile(cacheFile, cacheContent);
    
    // First read (will cache)
    const readStart1 = Date.now();
    await azureFS.readFile(cacheFile);
    const readTime1 = Date.now() - readStart1;
    
    // Second read (from cache)
    const readStart2 = Date.now();
    await azureFS.readFile(cacheFile);
    const readTime2 = Date.now() - readStart2;
    
    console.log(`  📖 First read: ${readTime1}ms (network + cache)`);
    console.log(`  📖 Second read: ${readTime2}ms (cache only)`);
    
    if (readTime2 < readTime1) {
      console.log(`  🚀 Cache improved performance by ${((readTime1 - readTime2) / readTime1 * 100).toFixed(1)}%\n`);
    }

    // Demo 7: Container information
    console.log('ℹ️  Demo 7: Container Information');
    const containerInfo = azureFS.getContainerInfo();
    console.log(`  📁 Container: ${containerInfo.containerName}`);
    console.log(`  📂 Prefix: ${containerInfo.prefix}`);
    console.log(`  🔑 Auth method: ${containerInfo.hasConnectionString ? 'Connection String' : 'Account Key'}`);
    
    if (containerInfo.blobServiceEndpoint) {
      console.log(`  🌐 Endpoint: ${containerInfo.blobServiceEndpoint}`);
    }
    console.log();

    // Cleanup
    console.log('🧹 Demo Cleanup');
    const cleanupFiles = [
      textFile,
      jsonFile,
      cacheFile,
      ...Array.from({length: 5}, (_, i) => `concurrent-demo-${concurrentBase}-${i}.txt`)
    ];
    
    for (const file of cleanupFiles) {
      try {
        await azureFS.deleteFile(file);
        console.log(`  ✅ Deleted: ${file}`);
      } catch (error) {
        console.log(`  ⚠️  Could not delete ${file}: ${(error as Error).message}`);
      }
    }
    
    // Delete demo directory
    try {
      await azureFS.deleteDir(baseDir);
      console.log(`  ✅ Deleted directory: ${baseDir}`);
    } catch (error) {
      console.log(`  ⚠️  Could not delete directory ${baseDir}: ${(error as Error).message}`);
    }

    console.log('\n🎉 Azure Blob Storage Demo completed successfully!');
    console.log('\n📚 Summary of demonstrated features:');
    console.log('  ✅ File read/write operations');
    console.log('  ✅ JSON file handling');
    console.log('  ✅ Directory operations and listing');
    console.log('  ✅ File statistics and metadata');
    console.log('  ✅ Concurrent operations');
    console.log('  ✅ Performance caching');
    console.log('  ✅ Container information access');
    console.log('  ✅ Cleanup and deletion');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
runAzureDemo().catch(console.error);
