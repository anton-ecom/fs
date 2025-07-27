/**
 * R2 Debug Test - Basic AWS SDK Configuration
 * 
 * Direct test using AWS SDK to understand R2 connection issues.
 */

import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { describe, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('R2 Debug Tests', () => {
  test('should debug R2 connection with different configurations', async () => {
    // Load R2 test credentials
    const testConfigPath = path.join(__dirname, '../../private/r2-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🔍 Debugging R2 connection...');
    console.log('📦 Bucket:', testConfig.bucket);
    console.log('🆔 Account ID:', testConfig.accountId);
    console.log('🔗 Original endpoint:', testConfig.s3ApiEndpoint);
    
    // Test configuration 1: Path-style with original endpoint
    console.log('\n🧪 Testing Configuration 1: Path-style with original endpoint');
    try {
      const s3Client1 = new S3Client({
        region: 'auto',
        endpoint: testConfig.s3ApiEndpoint,
        credentials: {
          accessKeyId: testConfig.accessKeyId,
          secretAccessKey: testConfig.secretAccessKey
        },
        forcePathStyle: true
      });

      await s3Client1.send(new PutObjectCommand({
        Bucket: testConfig.bucket,
        Key: 'debug-test-1.txt',
        Body: 'Test 1'
      }));
      console.log('✅ Configuration 1 worked!');
    } catch (error) {
      console.log('❌ Configuration 1 failed:', (error as Error).message);
    }

    // Test configuration 2: Virtual-hosted with original endpoint
    console.log('\n🧪 Testing Configuration 2: Virtual-hosted with original endpoint');
    try {
      const s3Client2 = new S3Client({
        region: 'auto',
        endpoint: testConfig.s3ApiEndpoint,
        credentials: {
          accessKeyId: testConfig.accessKeyId,
          secretAccessKey: testConfig.secretAccessKey
        },
        forcePathStyle: false
      });

      await s3Client2.send(new PutObjectCommand({
        Bucket: testConfig.bucket,
        Key: 'debug-test-2.txt',
        Body: 'Test 2'
      }));
      console.log('✅ Configuration 2 worked!');
    } catch (error) {
      console.log('❌ Configuration 2 failed:', (error as Error).message);
    }

    // Test configuration 3: Standard R2 endpoint format
    const standardEndpoint = `https://${testConfig.accountId}.r2.cloudflarestorage.com`;
    console.log('\n🧪 Testing Configuration 3: Standard R2 endpoint format');
    console.log('🔗 Standard endpoint:', standardEndpoint);
    try {
      const s3Client3 = new S3Client({
        region: 'auto',
        endpoint: standardEndpoint,
        credentials: {
          accessKeyId: testConfig.accessKeyId,
          secretAccessKey: testConfig.secretAccessKey
        },
        forcePathStyle: true
      });

      await s3Client3.send(new PutObjectCommand({
        Bucket: testConfig.bucket,
        Key: 'debug-test-3.txt',
        Body: 'Test 3'
      }));
      console.log('✅ Configuration 3 worked!');
    } catch (error) {
      console.log('❌ Configuration 3 failed:', (error as Error).message);
    }

    // Test configuration 4: List buckets to validate credentials
    console.log('\n🧪 Testing Configuration 4: List buckets (credential validation)');
    try {
      const s3Client4 = new S3Client({
        region: 'auto',
        endpoint: standardEndpoint,
        credentials: {
          accessKeyId: testConfig.accessKeyId,
          secretAccessKey: testConfig.secretAccessKey
        },
        forcePathStyle: true
      });

      const result = await s3Client4.send(new ListBucketsCommand({}));
      console.log('✅ Credentials valid! Buckets:', result.Buckets?.map(b => b.Name));
    } catch (error) {
      console.log('❌ Credential test failed:', (error as Error).message);
    }

    // Test configuration 5: Try different region
    console.log('\n🧪 Testing Configuration 5: Different region');
    try {
      const s3Client5 = new S3Client({
        region: 'us-east-1', // Different region
        endpoint: standardEndpoint,
        credentials: {
          accessKeyId: testConfig.accessKeyId,
          secretAccessKey: testConfig.secretAccessKey
        },
        forcePathStyle: true
      });

      await s3Client5.send(new PutObjectCommand({
        Bucket: testConfig.bucket,
        Key: 'debug-test-5.txt',
        Body: 'Test 5'
      }));
      console.log('✅ Configuration 5 worked!');
    } catch (error) {
      console.log('❌ Configuration 5 failed:', (error as Error).message);
    }

  }, 60000);
});
