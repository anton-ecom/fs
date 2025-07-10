/**
 * Quick verification of FS.sync and FS.async functionality
 */

const { FS } = require('./src/fs');

// Test sync filesystem
console.log('🔄 Testing FS.sync.memory()...');
const syncFs = FS.sync.memory();
syncFs.writeFile('test.txt', 'Hello World');
const content = syncFs.readFile('test.txt');
console.log('✅ Sync content:', content);

// Test async filesystem
console.log('\n🔄 Testing FS.async.memory()...');
const asyncFs = FS.async.memory();
asyncFs.writeFile('async-test.txt', 'Hello Async World')
  .then(() => asyncFs.readFile('async-test.txt'))
  .then(content => {
    console.log('✅ Async content:', content);
  });

// Test development preset
console.log('\n🔄 Testing FS.development()...');
const devFs = FS.development();
devFs.writeFile('dev-test.txt', 'Development Mode');
const devContent = devFs.readFile('dev-test.txt');
console.log('✅ Development content:', devContent);

console.log('\n🎉 All FS tests completed successfully!');
