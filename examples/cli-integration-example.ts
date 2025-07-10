/**
 * CLI Integration Example - How Filesystem Unit works with Identity Unit
 * 
 * This shows the pattern for a CLI that creates identities, saves them,
 * and restores them using the Filesystem Unit architecture.
 */

import type { FilesystemUnit, FilesystemUnits } from '../src/filesystem-unit';

// Mock Identity Unit interface (would import from @synet/identity)
interface MockIdentityUnit {
  get(key: 'alias' | 'did' | 'publicKeyHex' | 'provider'): string;
  toJson(): { alias: string; did: string; publicKeyHex: string; privateKeyHex?: string; provider: string; };
  public(): Omit<ReturnType<MockIdentityUnit['toJson']>, 'privateKeyHex'>;
}

// Mock Identity Unit factory (would import from @synet/identity)
const MockIdentity = {
  generate: async (alias: string): Promise<MockIdentityUnit> => {
    const data = {
      alias,
      did: `did:key:mock-${Date.now()}`,
      publicKeyHex: '0x' + Math.random().toString(16).slice(2),
      privateKeyHex: '0x' + Math.random().toString(16).slice(2),
      provider: 'mock-provider'
    };
    
    return {
      get: (key) => data[key],
      toJson: () => data,
      public: () => {
        const { privateKeyHex, ...publicData } = data;
        return publicData;
      }
    };
  },
  
  create: (data: any): MockIdentityUnit => ({
    get: (key) => data[key],
    toJson: () => data,
    public: () => {
      const { privateKeyHex, ...publicData } = data;
      return publicData;
    }
  })
};

/**
 * CLI Application class demonstrating the full cycle
 */
export class IdentityCLI {
  private fs: ReturnType<FilesystemUnit['teach']>;
  private configPath = '/synet';
  private identitiesPath = '/synet/identities';

  constructor(filesystemUnit: FilesystemUnit) {
    this.fs = filesystemUnit.teach();
  }

  /**
   * Initialize the CLI storage
   */
  async init(): Promise<void> {
    console.log('🔧 Initializing Synet CLI...');
    
    await this.fs.ensureDir(this.configPath);
    await this.fs.ensureDir(this.identitiesPath);
    
    // Save CLI configuration
    const config = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      filesystem: {
        primary: this.fs.getPrimary(),
        backends: this.fs.getBackends()
      }
    };
    
    await this.fs.writeFile(`${this.configPath}/config.json`, JSON.stringify(config, null, 2));
    console.log('✅ CLI initialized');
  }

  /**
   * Create a new identity
   */
  async createIdentity(alias: string): Promise<void> {
    console.log(`\n🔑 Creating identity: ${alias}`);
    
    // Check if identity already exists
    const existingPath = `${this.identitiesPath}/${alias}.json`;
    const exists = await this.fs.exists(existingPath);
    
    if (exists) {
      throw new Error(`Identity '${alias}' already exists`);
    }

    // Generate new identity using Identity Unit
    console.log('   Generating cryptographic keys...');
    const identity = await MockIdentity.generate(alias);
    
    console.log('   ✅ Identity generated');
    console.log('      Alias:', identity.get('alias'));
    console.log('      DID:', identity.get('did'));
    console.log('      Provider:', identity.get('provider'));

    // Save identity using Filesystem Unit
    console.log('   Saving identity to storage...');
    await this.saveIdentity(identity);
    
    console.log(`✅ Identity '${alias}' created and saved`);
  }

  /**
   * Save identity to filesystem
   */
  private async saveIdentity(identity: MockIdentityUnit): Promise<void> {
    const alias = identity.get('alias');
    const fullData = identity.toJson();
    const publicData = identity.public();

    // Save full identity (with private key)
    const fullPath = `${this.identitiesPath}/${alias}.json`;
    await this.fs.writeFile(fullPath, JSON.stringify(fullData, null, 2));

    // Save public identity (without private key)
    const publicPath = `${this.identitiesPath}/${alias}.public.json`;
    await this.fs.writeFile(publicPath, JSON.stringify(publicData, null, 2));

    console.log(`   ✅ Identity saved to ${fullPath}`);
    console.log(`   ✅ Public data saved to ${publicPath}`);
  }

  /**
   * Restore an identity from filesystem
   */
  async restoreIdentity(alias: string): Promise<MockIdentityUnit | null> {
    console.log(`\n🔄 Restoring identity: ${alias}`);
    
    const identityPath = `${this.identitiesPath}/${alias}.json`;
    const exists = await this.fs.exists(identityPath);
    
    if (!exists) {
      console.log(`   ❌ Identity '${alias}' not found`);
      return null;
    }

    console.log('   Loading identity data...');
    const jsonData = await this.fs.readFile(identityPath);
    const identityData = JSON.parse(jsonData);

    console.log('   Recreating Identity Unit...');
    const identity = MockIdentity.create(identityData);

    console.log('   ✅ Identity restored');
    console.log('      Alias:', identity.get('alias'));
    console.log('      DID:', identity.get('did'));
    console.log('      Has private key:', !!identityData.privateKeyHex);

    return identity;
  }

  /**
   * List all identities
   */
  async listIdentities(): Promise<string[]> {
    console.log('\n📋 Listing identities...');
    
    const exists = await this.fs.exists(this.identitiesPath);
    if (!exists) {
      console.log('   No identities found');
      return [];
    }

    const files = await this.fs.readDir(this.identitiesPath);
    const identities = files
      .filter(file => file.endsWith('.json') && !file.endsWith('.public.json'))
      .map(file => file.replace('.json', ''));

    if (identities.length === 0) {
      console.log('   No identities found');
    } else {
      console.log(`   Found ${identities.length} identities:`);
      identities.forEach(alias => console.log(`   - ${alias}`));
    }

    return identities;
  }

  /**
   * Get CLI status and statistics
   */
  async status(): Promise<void> {
    console.log('\n📊 CLI Status');
    
    // Filesystem statistics
    const stats = this.fs.getStats();
    console.log('   Filesystem Operations:');
    console.log(`   - Writes: ${stats.writes}`);
    console.log(`   - Errors: ${stats.errors}`);
    
    // Backend configuration
    console.log('   Storage Configuration:');
    console.log(`   - Primary: ${this.fs.getPrimary()}`);
    console.log(`   - Fallbacks: ${this.fs.getFallbacks().join(', ') || 'none'}`);
    console.log(`   - All backends: ${this.fs.getBackends().join(', ')}`);

    // Identity count
    const identities = await this.listIdentities();
    console.log(`   - Identities: ${identities.length}`);
  }
}

/**
 * Demo showing the complete CLI workflow
 */
export async function demonstrateCLIWorkflow() {
  console.log('🚀 Synet CLI Full Workflow Demo\n');

  // 1. Setup filesystem for development
  console.log('1. Setting up development environment...');
  const fsUnit = FilesystemUnits.development();
  const cli = new IdentityCLI(fsUnit);
  
  await cli.init();

  // 2. Create multiple identities
  console.log('\n2. Creating identities...');
  await cli.createIdentity('alice');
  await cli.createIdentity('bob');
  await cli.createIdentity('charlie');

  // 3. List all identities
  await cli.listIdentities();

  // 4. Restore an identity
  const restoredAlice = await cli.restoreIdentity('alice');
  
  if (restoredAlice) {
    console.log('\n✅ Successfully restored Alice\'s identity');
    console.log('   Can now use for signing, authentication, etc.');
  }

  // 5. Try to restore non-existent identity
  await cli.restoreIdentity('nonexistent');

  // 6. Show CLI status
  await cli.status();

  console.log('\n✨ CLI workflow demo complete!');
  console.log('\nThis demonstrates the complete cycle:');
  console.log('   1. Create identity (cryptographic keys)');
  console.log('   2. Save to filesystem (with fallback)');
  console.log('   3. Restore from filesystem');
  console.log('   4. Ready for use in applications');
}

/**
 * Production CLI setup example
 */
export async function productionCLISetup() {
  console.log('\n🏢 Production CLI Setup Example\n');
  
  // In production, you might use:
  // - S3 for primary storage (cloud backup)
  // - Local filesystem for fallback (offline access)
  // - GitHub for configuration/public data sharing
  
  console.log('Production setup would configure:');
  console.log('   - S3 primary storage for cloud backup');
  console.log('   - Local filesystem fallback for offline access');
  console.log('   - Encrypted storage for sensitive data');
  console.log('   - Multiple identity providers');
  console.log('');
  console.log('Example configuration:');
  console.log('   synet create-identity alice --provider=kepler');
  console.log('   synet backup --to=s3');
  console.log('   synet restore alice --from=local');
  console.log('   synet sync --with=github');
}

// Example usage:
// demonstrateCLIWorkflow()
//   .then(() => productionCLISetup())
//   .catch(console.error);
