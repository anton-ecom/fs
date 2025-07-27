/**
 * Cloudflare R2 Connection Test
 * 
 * Simple connection test to validate R2 credentials and endpoint configuration.
 */

import { describe, test, expect } from 'vitest';
import { createCloudflareR2FileSystem, type CloudflareR2Options } from '../../src/promises/r2';
import * as fs from 'fs';
import * as path from 'path';

describe('Cloudflare R2 Connection Test', () => {
  test('should connect to R2 and perform basic operations', async () => {
    // Load R2 test credentials
    const testConfigPath = path.join(__dirname, '../../private/r2-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🔗 Testing R2 connection...');
    console.log('📦 Bucket:', testConfig.bucket);
    console.log('🆔 Account ID:', testConfig.accountId);
    console.log('🔗 Endpoint:', testConfig.s3ApiEndpoint);
    
    // Initialize R2 FileSystem with test credentials
    const r2Options: CloudflareR2Options = {
      accountId: testConfig.accountId || 'ddf6ea2efa179944a417844222f31b8d',
      accessKeyId: testConfig.accessKeyId,
      secretAccessKey: testConfig.secretAccessKey,
      bucket: testConfig.bucket,
      region: 'auto',
      endpoint: testConfig.s3ApiEndpoint,
      prefix: 'synet-fs-r2-connection-test'
    };

    const r2FS = createCloudflareR2FileSystem(r2Options);
    
    // Test file for connection validation
    const testFileName = `connection-test-${Date.now()}.txt`;
    const testContent = 'R2 connection test - Hello from SYNET FS!';
    
    try {
      // Test write operation
      console.log('📝 Testing write operation...');
      await r2FS.writeFile(testFileName, testContent);
      console.log('✅ Write successful');
      
      // Test read operation
      console.log('📖 Testing read operation...');
      const readContent = await r2FS.readFile(testFileName);
      expect(readContent).toBe(testContent);
      console.log(`✅ Read successful (${readContent.length} bytes)`);
      
      // Test exists operation
      console.log('🔍 Testing exists operation...');
      const exists = await r2FS.exists(testFileName);
      expect(exists).toBe(true);
      console.log('✅ Exists check successful');
      
      // Test stats operation
      console.log('📊 Testing stats operation...');
      const stats = await r2FS.stat(testFileName);
      expect(stats.size).toBe(testContent.length);
      console.log(`✅ Stats successful (${stats.size} bytes)`);
      
      // Test delete operation
      console.log('🗑️ Testing delete operation...');
      await r2FS.deleteFile(testFileName);
      console.log('✅ Delete successful');
      
      // Verify deletion
      console.log('🔍 Verifying deletion...');
      const deletedExists = await r2FS.exists(testFileName);
      expect(deletedExists).toBe(false);
      console.log('✅ Verification successful (file deleted)');
      
      console.log('🎉 Cloudflare R2 connection test passed!');
      
    } catch (error) {
      console.error('❌ R2 connection test failed:', error);
      
      // Try to clean up even if test failed
      try {
        await r2FS.deleteFile(testFileName);
        console.log('🧹 Cleanup completed');
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup failed:', cleanupError);
      }
      
      throw error;
    }
  }, 30000);

  test('should handle invalid credentials gracefully', async () => {
    console.log('🔒 Testing invalid credentials...');
    
    const invalidR2Options: CloudflareR2Options = {
      accountId: 'invalid-account-id',
      accessKeyId: 'invalid-access-key',
      secretAccessKey: 'invalid-secret',
      bucket: 'invalid-bucket',
      region: 'auto',
      endpoint: 'https://invalid.r2.cloudflarestorage.com'
    };

    const invalidR2FS = createCloudflareR2FileSystem(invalidR2Options);
    
    // Should throw an error for invalid credentials
    await expect(invalidR2FS.writeFile('test.txt', 'test')).rejects.toThrow();
    console.log('✅ Invalid credentials handled correctly');
  }, 15000);
});
