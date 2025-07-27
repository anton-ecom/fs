/**
 * R2 Final Test - Mimicking DigitalOcean Success Pattern
 * 
 * Using the exact same patterns that worked for DigitalOcean Spaces.
 */

import { describe, test } from 'vitest';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

describe('R2 Final Connection Test', () => {
  test('should connect to R2 using DigitalOcean-style configuration', async () => {
    // Load R2 test credentials
    const testConfigPath = path.join(__dirname, '../../private/r2-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🎯 Final R2 test using proven DigitalOcean patterns...');
    console.log('📦 Bucket:', testConfig.bucket);
    console.log('🔗 Endpoint:', testConfig.s3ApiEndpoint);
    
    // Configuration that worked for DigitalOcean
    const s3Client = new S3Client({
      region: 'auto', // Same as DigitalOcean
      endpoint: testConfig.s3ApiEndpoint,
      credentials: {
        accessKeyId: testConfig.accessKeyId,
        secretAccessKey: testConfig.secretAccessKey
      },
      forcePathStyle: true, // Same as DigitalOcean
      maxAttempts: 3
    });

    const testKey = 'final-r2-test.txt';
    const testContent = 'R2 final test content';

    try {
      console.log('📝 Testing PUT object...');
      
      // Put object
      await s3Client.send(new PutObjectCommand({
        Bucket: testConfig.bucket,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain'
      }));
      
      console.log('✅ PUT successful!');
      
      // Get object
      console.log('📖 Testing GET object...');
      const getResult = await s3Client.send(new GetObjectCommand({
        Bucket: testConfig.bucket,
        Key: testKey
      }));
      
      const retrievedContent = await getResult.Body?.transformToString();
      console.log(`✅ GET successful! Content: "${retrievedContent}"`);
      
      // Delete object
      console.log('🗑️ Testing DELETE object...');
      await s3Client.send(new DeleteObjectCommand({
        Bucket: testConfig.bucket,
        Key: testKey
      }));
      
      console.log('✅ DELETE successful!');
      console.log('🎉 R2 connection works perfectly!');
      
    } catch (error) {
      console.error('❌ R2 test failed:', error);
      console.error('🔍 Error details:', (error as any)?.name, (error as any)?.message);
      
      // Try alternative endpoint format
      console.log('\n🔄 Trying alternative endpoint without account ID prefix...');
      
      const alternativeClient = new S3Client({
        region: 'auto',
        endpoint: 'https://r2.cloudflarestorage.com', // Generic R2 endpoint
        credentials: {
          accessKeyId: testConfig.accessKeyId,
          secretAccessKey: testConfig.secretAccessKey
        },
        forcePathStyle: true,
        maxAttempts: 3
      });
      
      try {
        await alternativeClient.send(new PutObjectCommand({
          Bucket: testConfig.bucket,
          Key: testKey,
          Body: testContent,
          ContentType: 'text/plain'
        }));
        console.log('✅ Alternative endpoint works!');
      } catch (altError) {
        console.error('❌ Alternative endpoint also failed:', (altError as any)?.message);
      }
      
      throw error;
    }
    
  }, 30000);
});
