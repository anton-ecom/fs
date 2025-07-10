/**
 * Filesystem Unit Demonstration Runner
 * 
 * Shows the simplified Filesystem Unit in action with different backends
 */

import { demonstrateNodeFilesystem } from './node-demo';
import { demonstrateS3Filesystem, compareS3WithOtherBackends } from './s3-demo-unit';
import { FilesystemUnits } from '../src/filesystem-unit';

async function demonstrateAllBackends() {
  console.log('🚀 Filesystem Unit - Complete Backend Demonstration\n');
  console.log('='.repeat(60));
  console.log('');

  // 1. Memory backend demo
  console.log('1️⃣  MEMORY BACKEND DEMO');
  console.log('='.repeat(30));
  
  const memoryUnit = FilesystemUnits.memory();
  const memFs = memoryUnit.teach();
  
  console.log('Backend:', memFs.getBackendType());
  console.log('Async:', memFs.isAsync());
  
  await memFs.writeFile('/memory-test.txt', 'Hello from memory!');
  const memContent = await memFs.readFile('/memory-test.txt');
  console.log('Content:', memContent);
  console.log('Stats:', memFs.getStats());
  console.log('');

  // 2. Node backend demo
  console.log('2️⃣  NODE BACKEND DEMO');
  console.log('='.repeat(30));
  await demonstrateNodeFilesystem();
  console.log('');

  // 3. Backend switching demo
  console.log('3️⃣  RUNTIME BACKEND SWITCHING');
  console.log('='.repeat(30));
  
  const switchableUnit = FilesystemUnits.memory();
  console.log('Initial backend:', switchableUnit.teach().getBackendType());
  
  // Switch to Node
  switchableUnit.switchBackend({ type: 'node', async: true });
  console.log('Switched to:', switchableUnit.teach().getBackendType());
  
  // Write a file with Node backend
  await switchableUnit.teach().ensureDir('./demo-switching');
  await switchableUnit.teach().writeFile('./demo-switching/test.txt', 'Switched backend!');
  
  // Switch back to Memory
  switchableUnit.switchBackend({ type: 'memory' });
  console.log('Switched back to:', switchableUnit.teach().getBackendType());
  console.log('Stats reset:', switchableUnit.teach().getStats());
  console.log('');

  // 4. Configuration comparison
  console.log('4️⃣  CONFIGURATION COMPARISON');
  console.log('='.repeat(30));
  compareS3WithOtherBackends();
  console.log('');

  // 5. S3 backend demo (may fail without credentials)
  console.log('5️⃣  S3 BACKEND DEMO (requires AWS credentials)');
  console.log('='.repeat(50));
  await demonstrateS3Filesystem();
  console.log('');

  console.log('✨ All demos complete!');
  console.log('');
  console.log('Summary of Filesystem Unit capabilities:');
  console.log('  ✅ Single backend architecture (simplified)');
  console.log('  ✅ Dynamic backend switching at runtime');
  console.log('  ✅ Unified interface across all backends');
  console.log('  ✅ Usage analytics and learning');
  console.log('  ✅ Type-safe configuration');
  console.log('  ✅ Both sync and async support');
  console.log('  ✅ Ready for CLI integration');
}

// For CLI usage
export async function quickDemo() {
  console.log('⚡ Quick Filesystem Unit Demo\n');
  
  // Create memory filesystem
  const fs = FilesystemUnits.development().teach();
  
  // Simulate identity storage
  const identity = {
    alias: 'quick-demo',
    did: 'did:key:demo-123',
    publicKey: '0x123456789abcdef'
  };
  
  await fs.ensureDir('/identities');
  await fs.writeFile('/identities/demo.json', JSON.stringify(identity, null, 2));
  
  const restored = await fs.readFile('/identities/demo.json');
  console.log('Stored and restored identity:', JSON.parse(restored).alias);
  
  console.log('Backend:', fs.getBackendType());
  console.log('Stats:', fs.getStats());
  console.log('✅ Quick demo complete!');
}

// Run demos
if (require.main === module) {
  demonstrateAllBackends().catch(console.error);
}

// Example usage:
// demonstrateAllBackends().catch(console.error);
// quickDemo().catch(console.error);
