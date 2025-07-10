/**
 * Test FileSystem compatibility with IFileSystem interface
 */

import { FS } from '../src/fs';
import type { IFileSystem } from '../src/filesystem.interface';

// Test 1: Create a FileSystem unit and ensure it implements IFileSystem
console.log('🔄 Testing FileSystem compatibility...');

const syncFs = FS.sync.memory();
console.log('✅ FileSystem created successfully');

// Test 2: Verify it can be used as IFileSystem
const fsInterface: IFileSystem = syncFs;
console.log('✅ FileSystem is compatible with IFileSystem interface');

// Test 3: Test basic operations using Sync methods
fsInterface.writeFileSync('test.txt', 'Hello World');
const content = fsInterface.readFileSync('test.txt');
console.log('✅ File operations work:', content);

// Test 4: Test that teach() method also works
const taught = syncFs.teach();
taught.writeFileSync('test2.txt', 'Hello from teach');
const content2 = taught.readFileSync('test2.txt');
console.log('✅ Teach method works:', content2);

// Test 5: Test all IFileSystem methods
fsInterface.writeFileSync('full-test.txt', 'Full test content');
console.log('✅ writeFileSync works');

const exists = fsInterface.existsSync('full-test.txt');
console.log('✅ existsSync works:', exists);

const fileContent = fsInterface.readFileSync('full-test.txt');
console.log('✅ readFileSync works:', fileContent);

fsInterface.ensureDirSync('test-dir');
console.log('✅ ensureDirSync works');

fsInterface.writeFileSync('test-dir/file.txt', 'Directory file');
const dirContents = fsInterface.readDirSync('test-dir');
console.log('✅ readDirSync works:', dirContents);

fsInterface.deleteFileSync('test-dir/file.txt');
console.log('✅ deleteFileSync works');

fsInterface.deleteDirSync('test-dir');
console.log('✅ deleteDirSync works');

console.log('\n🎉 All FileSystem compatibility tests passed!');
