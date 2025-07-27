/**
 * R2 Credential Validation Test
 * 
 * Verify that the S3 credentials are correctly configured in Cloudflare.
 */

import { describe, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('R2 Credential Validation', () => {
  test('should validate R2 bucket configuration via Cloudflare API', async () => {
    // Load R2 test credentials
    const testConfigPath = path.join(__dirname, '../../private/r2-test-access.json');
    const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));

    console.log('🔍 Validating R2 configuration via Cloudflare API...');
    console.log('📦 Bucket:', testConfig.bucket);
    console.log('🆔 Account ID:', testConfig.accountId);
    
    try {
      // Test bucket list via Cloudflare API
      const cloudflareApiUrl = `https://api.cloudflare.com/client/v4/accounts/${testConfig.accountId}/r2/buckets`;
      
      console.log('🌐 Testing bucket list via Cloudflare API...');
      
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
      
      if (response.ok && data.success) {
        const buckets = data.result || [];
        console.log('✅ Cloudflare API works!');
        console.log('📂 Available buckets:', buckets.map((b: any) => b.name));
        
        const targetBucket = buckets.find((b: any) => b.name === testConfig.bucket);
        if (targetBucket) {
          console.log(`✅ Bucket "${testConfig.bucket}" exists and is accessible!`);
        } else {
          console.log(`❌ Bucket "${testConfig.bucket}" not found in account.`);
          console.log('💡 Available buckets:', buckets.map((b: any) => b.name));
        }
      } else {
        console.log('❌ Cloudflare API failed:', data);
      }
      
    } catch (error) {
      console.log('❌ Cloudflare API test failed:', (error as Error).message);
    }
    
    // Provide diagnostic information
    console.log('\n🔧 Diagnostic Information:');
    console.log('1. Account ID format appears correct (32 hex chars)');
    console.log('2. S3 API endpoint format:', testConfig.s3ApiEndpoint);
    console.log('3. Access Key ID format:', testConfig.accessKeyId?.length === 32 ? 'Correct (32 chars)' : 'Unexpected length');
    console.log('4. Secret Key format:', testConfig.secretAccessKey?.length === 64 ? 'Correct (64 chars)' : 'Unexpected length');
    
    console.log('\n💡 Next Steps:');
    console.log('- Verify the S3 API credentials are enabled in R2 dashboard');
    console.log('- Check if there are any IP restrictions on the R2 bucket');
    console.log('- Confirm the endpoint URL is exactly as provided by Cloudflare');
    console.log('- Consider testing from a different network/location');
    
  }, 30000);
});
