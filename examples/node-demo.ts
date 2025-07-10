/**
 * Node Filesystem Demo - Local file storage with Filesystem Unit
 */

import { FS } from '../src/fs';
import { demonstrateIdentityPersistence } from './identity-persistence-demo';

/**
 * Demo: Node filesystem for local development and testing
 */
export async function demonstrateNodeFilesystem() {
  console.log('🗂️  Node Filesystem Unit Demo\n');

  // 1. Create Node filesystem unit
  console.log('1. Creating Node filesystem unit...');
  const nodeUnit = FS.async.node(); // Use async version
  const fs = nodeUnit.teach();
  
  console.log('   Backend type:', fs.getBackendType());
  console.log('   Is async:', fs.isAsync());
  console.log('');

  // 2. Basic operations
  console.log('2. Testing basic operations...');


  // Ensure test directory exists
  await fs.ensureDir('./demo-data');
  
  // Write test data
  const testData = {
    message: 'Hello from Node filesystem!',
    timestamp: new Date().toISOString(),
    backend: 'node'
  };
  
  await fs.writeFile('./demo-data/test.json', JSON.stringify(testData, null, 2));
  console.log('   ✅ File written to ./demo-data/test.json');
  
  // Read back the data
  const content = await fs.readFile('./demo-data/test.json');
  const parsed = JSON.parse(content);
  console.log('   ✅ File read back:', parsed.message);
  
  // List directory contents
  const files = await fs.readDir('./demo-data');
  console.log('   ✅ Directory contents:', files);
  console.log('');

  // 3. Identity storage simulation
  console.log('3. Simulating identity storage...');
  
  await fs.ensureDir('./demo-data/identities');
  
  const mockIdentity = {
    alias: 'node-demo-user',
    did: 'did:key:node-demo-123',
    publicKeyHex: '0x1234567890abcdef',
    privateKeyHex: '0xabcdef1234567890',
    provider: 'node-filesystem',
    createdAt: new Date().toISOString()
  };
  
  // Save full identity
  await fs.writeFile(
    './demo-data/identities/node-demo-user.json', 
    JSON.stringify(mockIdentity, null, 2)
  );
  
  // Save public identity
  const { privateKeyHex, ...publicIdentity } = mockIdentity;
  await fs.writeFile(
    './demo-data/identities/node-demo-user.public.json',
    JSON.stringify(publicIdentity, null, 2)
  );
  
  console.log('   ✅ Identity saved to local filesystem');
  
  // Verify we can restore it
  const restoredContent = await fs.readFile('./demo-data/identities/node-demo-user.json');
  const restoredIdentity = JSON.parse(restoredContent);
  console.log('   ✅ Identity restored:', restoredIdentity.alias);
  console.log('   ✅ Has private key:', !!restoredIdentity.privateKeyHex);
  console.log('');

  // 4. Performance and learning insights
  console.log('4. Performance insights...');
  const stats = fs.getStats();
  const learning = nodeUnit.learn();
  const pattern = learning.getUsagePattern();
  const insights = learning.getPerformanceInsights();
  
  console.log('   Operations performed:');
  console.log(`   - Reads: ${stats.reads}`);
  console.log(`   - Writes: ${stats.writes}`);
  console.log(`   - Errors: ${stats.errors}`);
  console.log(`   - Total: ${pattern.totalOperations}`);
  console.log('');
  console.log('   Performance insights:');
  console.log(`   - Backend: ${insights.backendType}`);
  console.log(`   - Async: ${insights.isAsync}`);
  console.log(`   - Recommendation: ${insights.recommendation}`);
  console.log('');

  // 5. Test switching backends
  console.log('5. Testing backend switching...');
  console.log('   Current backend:', nodeUnit.teach().getBackendType());
  
  // Switch to memory for fast operations
  nodeUnit.switchBackend({ type: 'memory' });
  console.log('   Switched to:', nodeUnit.teach().getBackendType());
  
  // Switch back to node
  nodeUnit.switchBackend({ type: 'node', async: true });
  console.log('   Switched back to:', nodeUnit.teach().getBackendType());
  console.log('');

  // 6. Cleanup
  console.log('6. Cleaning up demo files...');
  try {
    await fs.deleteFile('./demo-data/test.json');
    await fs.deleteFile('./demo-data/identities/node-demo-user.json');
    await fs.deleteFile('./demo-data/identities/node-demo-user.public.json');
    console.log('   ✅ Demo files cleaned up');
  } catch (error) {
    console.log('   ⚠️  Some files may not exist:', (error as Error).message);
  }
  console.log('');

  console.log('✨ Node Filesystem demo complete!');
  console.log('');
  console.log('Use cases for Node filesystem:');
  console.log('   - Local development and testing');
  console.log('   - Desktop applications');
  console.log('   - Server-side storage');
  console.log('   - Backup and archival');
  console.log('   - CLI applications (like synet-cli)');
}

/**
 * Advanced Node filesystem patterns
 */
export async function demonstrateAdvancedNodePatterns() {
  console.log('🚀 Advanced Node Filesystem Patterns\n');

  const nodeUnit = FileSystems.node(true);
  const fs = nodeUnit.teach();

  // 1. Hierarchical identity storage
  console.log('1. Hierarchical identity storage...');
  
  const identityPaths = [
    './demo-data/users/alice',
    './demo-data/users/bob', 
    './demo-data/organizations/acme-corp',
    './demo-data/devices/laptop-001'
  ];

  for (const path of identityPaths) {
    await fs.ensureDir(path);
    
    const identity = {
      path,
      type: path.includes('users') ? 'user' : 
            path.includes('organizations') ? 'organization' : 'device',
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(`${path}/identity.json`, JSON.stringify(identity, null, 2));
  }
  
  console.log('   ✅ Created hierarchical identity structure');
  console.log('');

  // 2. Configuration management
  console.log('2. Configuration management...');
  
  const configs = {
    development: { 
      debug: true, 
      logLevel: 'verbose',
      storage: 'memory'
    },
    production: { 
      debug: false, 
      logLevel: 'error',
      storage: 's3' 
    },
    testing: { 
      debug: true, 
      logLevel: 'silent',
      storage: 'memory' 
    }
  };

  await fs.ensureDir('./demo-data/config');
  
  for (const [env, config] of Object.entries(configs)) {
    await fs.writeFile(
      `./demo-data/config/${env}.json`, 
      JSON.stringify(config, null, 2)
    );
  }
  
  console.log('   ✅ Created environment configurations');
  console.log('');

  // 3. Audit log
  console.log('3. Audit logging...');
  
  await fs.ensureDir('./demo-data/logs');
  
  const auditEntries = [
    { action: 'identity.created', user: 'alice', timestamp: new Date().toISOString() },
    { action: 'identity.accessed', user: 'bob', timestamp: new Date().toISOString() },
    { action: 'config.updated', user: 'admin', timestamp: new Date().toISOString() }
  ];

  for (const [index, entry] of auditEntries.entries()) {
    await fs.writeFile(
      `./demo-data/logs/audit-${index + 1}.json`,
      JSON.stringify(entry, null, 2)
    );
  }
  
  console.log('   ✅ Created audit log entries');
  console.log('');

  // 4. Show final stats
  const finalStats = fs.getStats();
  console.log('Final statistics:');
  console.log(`   Total operations: ${finalStats.reads + finalStats.writes}`);
  console.log(`   Files created: ${finalStats.writes}`);
  console.log(`   Files read: ${finalStats.reads}`);
  console.log('');

  console.log('✨ Advanced Node patterns demo complete!');
}

// Example usage:
 demonstrateNodeFilesystem()
   .then(() => demonstrateAdvancedNodePatterns())
   .catch(console.error);
