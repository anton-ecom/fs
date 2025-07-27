/**
 * R2 REST API Test
 * 
 * Test using Cloudflare's REST API instead of S3 API to see if credentials work.
 */

import { describe, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('R2 REST API Tests', () => {
  test('should test R2 using Cloudflare REST API', async () => {
    // Load R2 test credentials
    const testConfigPath = path.join(__dirname, '../../private/r2-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🔍 Testing R2 with Cloudflare REST API...');
    console.log('📦 Bucket:', testConfig.bucket);
    console.log('🔑 Token:', testConfig.token?.slice(0, 10) + '...');
    
    // Test with Cloudflare API
    try {
      const cloudflareApiUrl = `https://api.cloudflare.com/client/v4/accounts/${testConfig.accountId}/r2/buckets`;
      
      console.log('🌐 Testing bucket list via Cloudflare API...');
      console.log('🔗 URL:', cloudflareApiUrl);
      
      const response = await fetch(cloudflareApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testConfig.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('📊 Response status:', response.status);
      console.log('📊 Response data:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log('✅ Cloudflare API works! This confirms the token is valid.');
        console.log('❓ The issue is that these are Cloudflare API tokens, not S3 access keys.');
        console.log('💡 For S3 API access, you need to create S3 API tokens in the R2 dashboard.');
      } else {
        console.log('❌ Cloudflare API failed. Token might be invalid or expired.');
      }
      
    } catch (error) {
      console.log('❌ Cloudflare API test failed:', (error as Error).message);
    }
    
    // Provide guidance
    console.log('\n📋 R2 S3 API Credential Requirements:');
    console.log('1. Go to Cloudflare Dashboard > R2 > Manage R2 API tokens');
    console.log('2. Create S3 API credentials (different from general API tokens)');
    console.log('3. Use the S3 Access Key ID and Secret Access Key');
    console.log('4. The S3 API endpoint format should be: https://<account-id>.r2.cloudflarestorage.com');
    
  }, 30000);
});
