/**
 * S3 Filesystem Demo - Cloud storage with Filesystem Unit
 * 
 * This demo shows how to use S3 as a backend for identity and data storage.
 * You'll need valid AWS credentials to run the full demo.
 */

import { FilesystemUnit, FilesystemUnits } from '../src/filesystem-unit';
import type { S3FileSystemOptions } from '../src/s3';

/**
 * Demo configuration - Update with your actual AWS credentials
 */
const S3_CONFIG: S3FileSystemOptions = {
  region: 'region', // Update this!
  bucket: 'bucket', // Update this!
  prefix: 'synet-demo/',               // Optional: acts as root directory
  accessKeyId: '',   // Or use AWS profile/IAM role
  secretAccessKey: '',   // Or use AWS profile/IAM role
};

/**
 * Demo: S3 filesystem for cloud storage
 */
export async function demonstrateS3Filesystem() {
  console.log('☁️  S3 Filesystem Unit Demo\n');

  try {
    // 1. Create S3 filesystem unit
    console.log('1. Creating S3 filesystem unit...');
    const s3Unit = FilesystemUnits.s3(S3_CONFIG, true); // Always use async for S3
    const fs = s3Unit.teach();
    
    console.log('   Backend type:', fs.getBackendType());
    console.log('   Is async:', fs.isAsync());
    console.log('   Bucket:', S3_CONFIG.bucket);
    console.log('   Region:', S3_CONFIG.region);
    console.log('   Prefix:', S3_CONFIG.prefix || '(root)');
    console.log('');

    // 2. Basic operations
    console.log('2. Testing basic S3 operations...');
    
    // Write test data
    const testData = {
      message: 'Hello from S3 filesystem!',
      timestamp: new Date().toISOString(),
      backend: 's3',
      bucket: S3_CONFIG.bucket,
      region: S3_CONFIG.region
    };
    
    console.log('   Writing test file to S3...');
    await fs.writeFile('/test.json', JSON.stringify(testData, null, 2));
    console.log('   ✅ File written to S3');
    
    // Read back the data
    console.log('   Reading file from S3...');
    const content = await fs.readFile('/test.json');
    const parsed = JSON.parse(content);
    console.log('   ✅ File read back:', parsed.message);
    
    // Check if file exists
    const exists = await fs.exists('/test.json');
    console.log('   ✅ File exists:', exists);
    console.log('');

    // 3. Identity storage in cloud
    console.log('3. Cloud identity storage simulation...');
    
    // Create directory structure (S3 handles this virtually)
    await fs.ensureDir('/identities');
    await fs.ensureDir('/identities/users');
    await fs.ensureDir('/identities/organizations');
    
    const cloudIdentity = {
      alias: 's3-cloud-user',
      did: 'did:key:s3-cloud-123',
      publicKeyHex: '0x9876543210abcdef',
      privateKeyHex: '0xfedcba0987654321',
      provider: 's3-filesystem',
      createdAt: new Date().toISOString(),
      storage: {
        bucket: S3_CONFIG.bucket,
        region: S3_CONFIG.region,
        encrypted: false // Could be encrypted with @hsfs/encrypted
      }
    };
    
    console.log('   Saving identity to S3...');
    await fs.writeFile(
      '/identities/users/s3-cloud-user.json', 
      JSON.stringify(cloudIdentity, null, 2)
    );
    
    // Save public identity
    const { privateKeyHex, ...publicIdentity } = cloudIdentity;
    await fs.writeFile(
      '/identities/users/s3-cloud-user.public.json',
      JSON.stringify(publicIdentity, null, 2)
    );
    
    console.log('   ✅ Identity saved to S3');
    
    // Verify we can restore it
    console.log('   Restoring identity from S3...');
    const restoredContent = await fs.readFile('/identities/users/s3-cloud-user.json');
    const restoredIdentity = JSON.parse(restoredContent);
    console.log('   ✅ Identity restored:', restoredIdentity.alias);
    console.log('   ✅ Has private key:', !!restoredIdentity.privateKeyHex);
    console.log('   ✅ Stored in bucket:', restoredIdentity.storage.bucket);
    console.log('');

    // 4. Multi-user scenario
    console.log('4. Multi-user cloud scenario...');
    
    const users = ['alice', 'bob', 'charlie'];
    
    for (const user of users) {
      const userIdentity = {
        alias: user,
        did: `did:key:${user}-${Date.now()}`,
        publicKeyHex: `0x${user}${'0'.repeat(20)}`,
        createdAt: new Date().toISOString(),
        cloudBackup: true
      };
      
      await fs.writeFile(
        `/identities/users/${user}.json`,
        JSON.stringify(userIdentity, null, 2)
      );
    }
    
    console.log(`   ✅ Created ${users.length} user identities in S3`);
    
    // List all users (simulated - S3 doesn't have real directories)
    try {
      const userFiles = await fs.readDir('/identities/users');
      console.log('   ✅ User files:', userFiles.length);
    } catch (error) {
      console.log('   📝 Note: S3 directory listing may not work exactly like local filesystem');
    }
    console.log('');

    // 5. Performance and learning insights
    console.log('5. S3 performance insights...');
    const stats = fs.getStats();
    const learning = s3Unit.learn();
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

    // 6. Configuration scenarios
    console.log('6. S3 configuration scenarios...');
    
    const configScenarios = {
      'development': {
        encryption: false,
        versioning: false,
        lifecycle: 'none'
      },
      'staging': {
        encryption: true,
        versioning: true,
        lifecycle: '30-days'
      },
      'production': {
        encryption: true,
        versioning: true,
        lifecycle: '7-years',
        backup: true,
        multiRegion: true
      }
    };

    await fs.ensureDir('/config/environments');
    
    for (const [env, config] of Object.entries(configScenarios)) {
      await fs.writeFile(
        `/config/environments/${env}.json`,
        JSON.stringify(config, null, 2)
      );
    }
    
    console.log('   ✅ Created environment configurations in S3');
    console.log('');

    // 7. Cleanup demo files
    console.log('7. Cleaning up demo files...');
    try {
      await fs.deleteFile('/test.json');
      await fs.deleteFile('/identities/users/s3-cloud-user.json');
      await fs.deleteFile('/identities/users/s3-cloud-user.public.json');
      
      for (const user of users) {
        await fs.deleteFile(`/identities/users/${user}.json`);
      }
      
      for (const env of Object.keys(configScenarios)) {
        await fs.deleteFile(`/config/environments/${env}.json`);
      }
      
      console.log('   ✅ Demo files cleaned up from S3');
    } catch (error) {
      console.log('   ⚠️  Some files may not exist:', (error as Error).message);
    }
    console.log('');

    console.log('✨ S3 Filesystem demo complete!');
    console.log('');
    console.log('Use cases for S3 filesystem:');
    console.log('   - Cloud-native applications');
    console.log('   - Distributed identity storage');
    console.log('   - Backup and disaster recovery');
    console.log('   - Multi-region deployment');
    console.log('   - Serverless applications');
    console.log('   - Enterprise data governance');

  } catch (error) {
    console.error('❌ S3 Demo failed:', (error as Error).message);
    console.log('');
    console.log('Common issues:');
    console.log('   - AWS credentials not configured');
    console.log('   - S3 bucket does not exist');
    console.log('   - Insufficient permissions');
    console.log('   - Network connectivity issues');
    console.log('');
    console.log('To fix:');
    console.log('   1. Update S3_CONFIG with your bucket name');
    console.log('   2. Configure AWS credentials:');
    console.log('      - Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars');
    console.log('      - Or use AWS profile: aws configure');
    console.log('      - Or use IAM role if running on AWS');
    console.log('   3. Ensure bucket exists and has proper permissions');
  }
}

/**
 * Production S3 setup example
 */
export async function demonstrateProductionS3Setup() {
  console.log('🏢 Production S3 Setup Example\n');

  const productionConfigs = {
    'multi-region': {
      primary: {
        region: 'us-east-1',
        bucket: 'synet-identity-primary',
        prefix: 'production/'
      },
      backup: {
        region: 'eu-west-1', 
        bucket: 'synet-identity-backup',
        prefix: 'production/'
      }
    },
    'encrypted': {
      region: 'us-east-1',
      bucket: 'synet-identity-encrypted',
      prefix: 'secure/',
      encryption: 'AES256'
    },
    'compliance': {
      region: 'us-gov-east-1',
      bucket: 'synet-identity-compliance',
      prefix: 'regulated/',
      encryption: 'aws:kms',
      versioning: true,
      mfa: true
    }
  };

  console.log('Production S3 configurations:');
  console.log('');

  for (const [name, config] of Object.entries(productionConfigs)) {
    console.log(`${name.toUpperCase()} Configuration:`);
    console.log('   ', JSON.stringify(config, null, 4));
    console.log('');
  }

  console.log('Example usage:');
  console.log('');
  console.log('// Primary region storage');
  console.log('const primaryS3 = FilesystemUnits.s3({');
  console.log('  region: "us-east-1",');
  console.log('  bucket: "synet-identity-primary",');
  console.log('  prefix: "production/"');
  console.log('});');
  console.log('');
  console.log('// Encrypted storage');
  console.log('const encryptedS3 = FilesystemUnits.s3({');
  console.log('  region: "us-east-1",');
  console.log('  bucket: "synet-identity-encrypted",');
  console.log('  prefix: "secure/"');
  console.log('});');
  console.log('');
  console.log('// Usage in CLI');
  console.log('const fs = encryptedS3.teach();');
  console.log('await fs.writeFile("/identity.json", identityData);');
}

/**
 * S3 vs other backends comparison
 */
export function compareS3WithOtherBackends() {
  console.log('📊 S3 vs Other Backends Comparison\n');

  const comparison = {
    'Features': {
      'Node': 'Local, Fast, Simple',
      'Memory': 'Temporary, Ultra-fast, Testing',
      'GitHub': 'Version control, Collaboration, Public',
      'S3': 'Cloud, Scalable, Durable, Enterprise'
    },
    'Performance': {
      'Node': 'Fast (local disk)',
      'Memory': 'Ultra-fast (RAM)',
      'GitHub': 'Medium (API calls)',
      'S3': 'Medium (network latency)'
    },
    'Durability': {
      'Node': 'Single point of failure',
      'Memory': 'Lost on restart',
      'GitHub': 'High (Git history)',
      'S3': 'Very high (11 9s)'
    },
    'Scalability': {
      'Node': 'Limited to local storage',
      'Memory': 'Limited to available RAM',
      'GitHub': 'Limited by Git repository size',
      'S3': 'Virtually unlimited'
    },
    'Cost': {
      'Node': 'Free (local resources)',
      'Memory': 'Free (local resources)', 
      'GitHub': 'Free/Paid (based on usage)',
      'S3': 'Pay per use (storage + requests)'
    },
    'Use Cases': {
      'Node': 'Development, CLI tools, Desktop apps',
      'Memory': 'Testing, Caching, Temporary data',
      'GitHub': 'Open source, Configuration, Collaboration',
      'S3': 'Production, Enterprise, Cloud-native'
    }
  };

  for (const [category, backends] of Object.entries(comparison)) {
    console.log(`${category}:`);
    for (const [backend, description] of Object.entries(backends)) {
      console.log(`   ${backend.padEnd(8)}: ${description}`);
    }
    console.log('');
  }

  console.log('✨ Choose the right backend for your use case!');
}

// Example usage:
 demonstrateS3Filesystem()
   .then(() => demonstrateProductionS3Setup())
   .then(() => compareS3WithOtherBackends())
   .catch(console.error);
