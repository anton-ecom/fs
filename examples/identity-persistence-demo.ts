/**
 * Example: Using Filesystem Unit for Identity Persistence
 * 
 * This demonstrates how to use the Filesystem Unit in a CLI application
 * to handle identity creation, saving, and restoration.
 */

import type { FilesystemUnit, FilesystemUnits } from '../src/filesystem-unit-multiple';

/**
 * Identity data structure (simplified for demo)
 */
interface IdentityData {
  alias: string;
  did: string;
  publicKeyHex: string;
  privateKeyHex?: string;
  provider: string;
  createdAt: string;
}

/**
 * CLI Identity Manager using Filesystem Unit
 */
export class IdentityManager {
  private fs: ReturnType<FilesystemUnit['teach']>;
  private identitiesPath = '/identities';

  constructor(filesystemUnit: FilesystemUnit) {
    this.fs = filesystemUnit.teach();
  }

  /**
   * Save an identity to filesystem
   */
  async saveIdentity(identity: IdentityData): Promise<void> {
    try {
      // Ensure identities directory exists
      await this.fs.ensureDir(this.identitiesPath);

      // Save full identity data (including private key)
      const filePath = `${this.identitiesPath}/${identity.alias}.json`;
      const jsonData = JSON.stringify(identity, null, 2);
      
      await this.fs.writeFile(filePath, jsonData);
      
      console.log(`✅ Identity '${identity.alias}' saved to ${filePath}`);
      
      // Also save public data separately for easy sharing
      const publicData = this.extractPublicData(identity);
      const publicPath = `${this.identitiesPath}/${identity.alias}.public.json`;
      const publicJson = JSON.stringify(publicData, null, 2);
      
      await this.fs.writeFile(publicPath, publicJson);
      
      console.log(`✅ Public identity data saved to ${publicPath}`);
      
    } catch (error) {
      console.error(`❌ Failed to save identity '${identity.alias}':`, error);
      throw error;
    }
  }

  /**
   * Load an identity from filesystem
   */
  async loadIdentity(alias: string, includePrivateKey = false): Promise<IdentityData | null> {
    try {
      const filePath = includePrivateKey 
        ? `${this.identitiesPath}/${alias}.json`
        : `${this.identitiesPath}/${alias}.public.json`;

      const exists = await this.fs.exists(filePath);
      if (!exists) {
        console.log(`⚠️  Identity '${alias}' not found`);
        return null;
      }

      const jsonData = await this.fs.readFile(filePath);
      const identity = JSON.parse(jsonData) as IdentityData;
      
      console.log(`✅ Identity '${alias}' loaded from ${filePath}`);
      return identity;
      
    } catch (error) {
      console.error(`❌ Failed to load identity '${alias}':`, error);
      throw error;
    }
  }

  /**
   * List all available identities
   */
  async listIdentities(): Promise<string[]> {
    try {
      const exists = await this.fs.exists(this.identitiesPath);
      if (!exists) {
        return [];
      }

      const files = await this.fs.readDir(this.identitiesPath);
      
      // Extract aliases from .json files (not .public.json)
      const identities = files
        .filter(file => file.endsWith('.json') && !file.endsWith('.public.json'))
        .map(file => file.replace('.json', ''));
      
      return identities;
      
    } catch (error) {
      console.error('❌ Failed to list identities:', error);
      throw error;
    }
  }

  /**
   * Delete an identity
   */
  async deleteIdentity(alias: string): Promise<boolean> {
    try {
      const filePath = `${this.identitiesPath}/${alias}.json`;
      const publicPath = `${this.identitiesPath}/${alias}.public.json`;
      
      const exists = await this.fs.exists(filePath);
      if (!exists) {
        console.log(`⚠️  Identity '${alias}' not found`);
        return false;
      }

      await this.fs.deleteFile(filePath);
      
      // Delete public file if it exists
      const publicExists = await this.fs.exists(publicPath);
      if (publicExists) {
        await this.fs.deleteFile(publicPath);
      }
      
      console.log(`✅ Identity '${alias}' deleted`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to delete identity '${alias}':`, error);
      throw error;
    }
  }

  /**
   * Get filesystem statistics
   */
  getStats() {
    return this.fs.getStats();
  }

  /**
   * Get configured backends
   */
  getBackends() {
    return {
      primary: this.fs.getPrimary(),
      fallbacks: this.fs.getFallbacks(),
      all: this.fs.getBackends()
    };
  }

  /**
   * Extract public data from identity (remove private key)
   */
  private extractPublicData(identity: IdentityData): Omit<IdentityData, 'privateKeyHex'> {
    const { privateKeyHex, ...publicData } = identity;
    return publicData;
  }
}

/**
 * Demo function showing full identity lifecycle with Filesystem Unit
 */
export async function demonstrateIdentityPersistence() {
  console.log('🚀 Filesystem Unit Identity Persistence Demo\n');

  // 1. Create filesystem unit for local development
  console.log('1. Setting up Filesystem Unit...');
  const fsUnit = FilesystemUnits.development();
  const manager = new IdentityManager(fsUnit);
  
  console.log('   Primary backend:', manager.getBackends().primary);
  console.log('   Fallback backends:', manager.getBackends().fallbacks);
  console.log('');

  // 2. Create mock identity data
  console.log('2. Creating mock identity...');
  const mockIdentity: IdentityData = {
    alias: 'demo-user',
    did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    publicKeyHex: '0x1234567890abcdef...',
    privateKeyHex: '0xabcdef1234567890...',
    provider: 'mock-provider',
    createdAt: new Date().toISOString()
  };
  console.log('   Alias:', mockIdentity.alias);
  console.log('   DID:', mockIdentity.did);
  console.log('');

  // 3. Save identity
  console.log('3. Saving identity...');
  await manager.saveIdentity(mockIdentity);
  console.log('');

  // 4. List identities
  console.log('4. Listing identities...');
  const identities = await manager.listIdentities();
  console.log('   Found identities:', identities);
  console.log('');

  // 5. Load public identity data
  console.log('5. Loading public identity data...');
  const publicIdentity = await manager.loadIdentity('demo-user', false);
  if (publicIdentity) {
    console.log('   Has private key:', 'privateKeyHex' in publicIdentity);
    console.log('   DID:', publicIdentity.did);
  }
  console.log('');

  // 6. Load full identity data
  console.log('6. Loading full identity data...');
  const fullIdentity = await manager.loadIdentity('demo-user', true);
  if (fullIdentity) {
    console.log('   Has private key:', 'privateKeyHex' in fullIdentity);
    console.log('   Can recreate signer:', !!fullIdentity.privateKeyHex);
  }
  console.log('');

  // 7. Show filesystem stats
  console.log('7. Filesystem statistics...');
  const stats = manager.getStats();
  console.log('   Writes performed:', stats.writes);
  console.log('   Errors encountered:', stats.errors);
  console.log('');

  // 8. Cleanup
  console.log('8. Cleaning up...');
  await manager.deleteIdentity('demo-user');
  console.log('');

  console.log('✨ Demo complete!');
}

/**
 * Production example with S3 backend
 */
export async function productionExample() {
  console.log('🏢 Production Filesystem Unit Example\n');

  // Note: This would require actual AWS credentials
  const s3Options = {
    region: 'us-east-1',
    bucket: 'my-identity-storage',
    prefix: 'identities/'
  };

  try {
    const fsUnit = FilesystemUnits.production(s3Options);
    const manager = new IdentityManager(fsUnit);
    
    console.log('Production setup configured:');
    console.log('   Primary:', manager.getBackends().primary);
    console.log('   Fallbacks:', manager.getBackends().fallbacks);
    console.log('   Note: S3 operations would require valid AWS credentials');
    
  } catch (error) {
    console.log('⚠️  Production setup requires AWS credentials');
    console.log('   Error:', (error as Error).message);
  }
}

// Example usage:
// demonstrateIdentityPersistence()
//   .then(() => productionExample())
//   .catch(console.error);
