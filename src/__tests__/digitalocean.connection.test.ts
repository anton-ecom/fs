/**
 * Simple DigitalOcean Spaces Connection Test
 * 
 * This test checks the basic connection and authentication to DigitalOcean Spaces
 * to help us understand why R2 tests are failing.
 */

import { describe, test, expect } from 'vitest';
import { createDigitalOceanSpacesFileSystem } from '../promises/digitalocean';
import * as fs from 'fs';
import * as path from 'path';

describe('DigitalOcean Spaces Connection Test', () => {
  test('should connect and perform basic operations', async () => {
    // Load DO Spaces test credentials
    const testConfigPath = path.join(__dirname, '../../private/digitalocean-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🔗 Testing DigitalOcean Spaces connection...');
    console.log(`📁 Bucket: ${testConfig.bucket}`);
    console.log(`🌍 Region: ${testConfig.region}`);
    console.log(`🔗 Endpoint: ${testConfig.endpoint}`);
    
    // Initialize DigitalOcean Spaces FileSystem
    const doFS = createDigitalOceanSpacesFileSystem({
      endpoint: testConfig.endpoint,
      accessKeyId: testConfig.accessKey,
      secretAccessKey: testConfig.secretKey,
      bucket: testConfig.bucket,
      region: testConfig.region,
      prefix: 'connection-test'
    });

    // Test basic operations
    const testFile = `connection-test-${Date.now()}.txt`;
    const testContent = 'Hello DigitalOcean Spaces from SYNET FS!';

    try {
      // Test write
      await doFS.writeFile(testFile, testContent);
      console.log(`✅ Write successful: ${testFile}`);

      // Test read
      const readContent = await doFS.readFile(testFile);
      expect(readContent).toBe(testContent);
      console.log(`✅ Read successful: ${readContent.length} bytes`);

      // Test exists
      const exists = await doFS.exists(testFile);
      expect(exists).toBe(true);
      console.log(`✅ Exists check successful: ${exists}`);

      // Test stats
      const stats = await doFS.stat(testFile);
      expect(stats.size).toBe(Buffer.byteLength(testContent, 'utf-8'));
      console.log(`✅ Stats successful: ${stats.size} bytes`);

      // Clean up
      await doFS.deleteFile(testFile);
      console.log(`✅ Delete successful: ${testFile}`);

      // Verify deletion
      const existsAfterDelete = await doFS.exists(testFile);
      expect(existsAfterDelete).toBe(false);
      console.log(`✅ Verification successful: file deleted`);

      console.log('🎉 DigitalOcean Spaces connection test passed!');
      
    } catch (error) {
      console.error('❌ DigitalOcean Spaces test failed:', error);
      throw error;
    }
  }, 30000);

  test('should fail gracefully with invalid credentials', async () => {
    console.log('🔗 Testing invalid credentials handling...');
    
    // Create filesystem with invalid credentials
    const doFS = createDigitalOceanSpacesFileSystem({
      endpoint: 'https://invalid.digitaloceanspaces.com',
      accessKeyId: 'invalid-key',
      secretAccessKey: 'invalid-secret',
      bucket: 'invalid-bucket',
      region: 'invalid-region'
    });

    // This should fail
    await expect(doFS.writeFile('test.txt', 'content')).rejects.toThrow();
    console.log('✅ Invalid credentials properly rejected');
  }, 30000);
});
