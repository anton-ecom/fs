import { FS } from '../dist/fs.js';
import { createLinodeObjectStorageFileSystem } from '../src/promises/linode.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Demo script to test Linode Object Storage filesystem implementation
 */

async function runLinodeDemo() {
  console.log('🔄 Testing Linode Object Storage filesystem...\n');

  // Load credentials from private config
  const testConfigPath = path.join(__dirname, '../private/linode-test-access.json');
  const credentials = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

  console.log('📋 Configuration:');
  console.log(`   Bucket: ${credentials.bucket}`);
  console.log(`   Region: ${credentials.region}`);
  console.log(`   Endpoint: ${credentials.region}.linodeobjects.com`);
  console.log(`   Access Key: ${credentials.accessKey.substring(0, 8)}...`);
  console.log('');

  try {
    // Method 1: Direct factory function
    console.log('1️⃣ Testing direct factory function...');
    const linodeFs1 = createLinodeObjectStorageFileSystem(credentials);
    
    // Method 2: Through FS factory (if we've added it)
    console.log('2️⃣ Testing FS factory...');
    try {
      const linodeFs2 = FS.async.linode(credentials);
      console.log('   ✅ FS factory works');
    } catch (error) {
      console.log('   ❌ FS factory not implemented yet:', (error as Error).message);
    }

    // Test basic operations
    console.log('\n🧪 Testing basic operations...');
    
    // Test 1: Write a file
    console.log('   📝 Writing test file...');
    const testContent = `Hello from Linode Object Storage!\nTimestamp: ${new Date().toISOString()}`;
    await linodeFs1.writeFile('demo/test.txt', testContent);
    console.log('   ✅ File written successfully');

    // Test 2: Read the file back
    console.log('   📖 Reading test file...');
    const readContent = await linodeFs1.readFile('demo/test.txt');
    console.log('   ✅ File read successfully');
    console.log(`   📄 Content: ${readContent.substring(0, 50)}...`);

    // Test 3: Check if file exists
    console.log('   🔍 Checking file existence...');
    const exists = await linodeFs1.exists('demo/test.txt');
    console.log(`   ✅ File exists: ${exists}`);

    // Test 4: Get file stats
    console.log('   📊 Getting file stats...');
    const stats = await linodeFs1.stat('demo/test.txt');
    console.log(`   ✅ File size: ${stats.size} bytes`);
    console.log(`   ✅ Modified: ${stats.mtime.toISOString()}`);

    // Test 5: List directory
    console.log('   📁 Listing directory...');
    const files = await linodeFs1.readDir('demo');
    console.log(`   ✅ Files found: ${files.join(', ')}`);

    // Test 6: Write JSON file
    console.log('   📝 Writing JSON file...');
    const jsonData = {
      message: 'Hello from SYNET FS',
      timestamp: new Date().toISOString(),
      test: true,
      numbers: [1, 2, 3, 4, 5]
    };
    await linodeFs1.writeFile('demo/data.json', JSON.stringify(jsonData, null, 2));
    console.log('   ✅ JSON file written');

    // Test 7: Read and parse JSON
    console.log('   📖 Reading JSON file...');
    const jsonContent = await linodeFs1.readFile('demo/data.json');
    const parsedData = JSON.parse(jsonContent);
    console.log(`   ✅ JSON parsed: ${parsedData.message}`);

    // Test 8: Cache functionality
    console.log('   🧠 Testing cache...');
    const cacheStats = linodeFs1.getCacheStats();
    console.log(`   ✅ Cache size: ${cacheStats.size} items`);
    console.log(`   ✅ Cached files: ${cacheStats.keys.join(', ')}`);

    // Test 9: Multiple operations (concurrent)
    console.log('   ⚡ Testing concurrent operations...');
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        linodeFs1.writeFile(`demo/concurrent-${i}.txt`, `File ${i} content`)
      );
    }
    await Promise.all(promises);
    console.log('   ✅ Concurrent writes completed');

    // Test 10: List all files again
    console.log('   📁 Final directory listing...');
    const finalFiles = await linodeFs1.readDir('demo');
    console.log(`   ✅ Total files: ${finalFiles.length}`);
    console.log(`   📄 Files: ${finalFiles.join(', ')}`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during demo:', error);
    console.error('Stack trace:', (error as Error).stack);
    
    // Try to provide helpful debugging info
    if ((error as any).code) {
      console.error(`AWS Error Code: ${(error as any).code}`);
    }
    if ((error as any).statusCode) {
      console.error(`HTTP Status: ${(error as any).statusCode}`);
    }
  }
}

// Run the demo
runLinodeDemo().catch(console.error);
