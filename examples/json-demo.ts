import { JsonFileSystem } from '../src/json';
import { MemFileSystem } from '../src/memory';

interface AppConfig {
  name: string;
  version: string;
  features: {
    darkMode: boolean;
    analytics: boolean;
    notifications: boolean;
  };
  metadata: {
    created: string;
    lastModified: string;
  };
}

/**
 * Example demonstrating JsonFileSystem usage
 */
export function demonstrateJsonFileSystem() {
  console.log('🚀 JsonFileSystem Demonstration\n');

  // Create JsonFileSystem with in-memory storage for demo
  const memFs = new MemFileSystem();
  const jsonFs = new JsonFileSystem<AppConfig>(memFs, {
    space: 2,
    validator: (data): boolean => {
      const config = data as AppConfig;
      return Boolean(config.name && config.version && config.features !== undefined);
    }
  });

  // Sample configuration data
  const initialConfig: AppConfig = {
    name: 'MyApp',
    version: '1.0.0',
    features: {
      darkMode: false,
      analytics: true,
      notifications: true
    },
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  };

  console.log('1️⃣ Writing initial configuration...');
  jsonFs.writeJsonSync('./app-config.json', initialConfig);
  console.log('✅ Configuration written');

  console.log('\n2️⃣ Reading configuration...');
  const loadedConfig = jsonFs.readJsonSync('./app-config.json');
  console.log('✅ Configuration loaded:', {
    name: loadedConfig.name,
    version: loadedConfig.version,
    darkMode: loadedConfig.features.darkMode
  });

  console.log('\n3️⃣ Updating configuration...');
  jsonFs.updateJsonSync('./app-config.json', {
    version: '1.1.0',
    features: {
      darkMode: true,
      analytics: true,
      notifications: false
    },
    metadata: {
      ...loadedConfig.metadata,
      lastModified: new Date().toISOString()
    }
  });

  const updatedConfig = jsonFs.readJsonSync('./app-config.json');
  console.log('✅ Configuration updated:', {
    version: updatedConfig.version,
    darkMode: updatedConfig.features.darkMode,
    notifications: updatedConfig.features.notifications
  });

  console.log('\n4️⃣ Testing default fallback...');
  const defaultConfig: AppConfig = {
    name: 'DefaultApp',
    version: '0.1.0',
    features: {
      darkMode: false,
      analytics: false,
      notifications: true
    },
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  };

  const configFromNonExistent = jsonFs.readJsonSyncWithDefault('./nonexistent.json', defaultConfig);
  console.log('✅ Default configuration used:', configFromNonExistent.name);

  console.log('\n5️⃣ Testing validation...');
  try {
    jsonFs.writeJsonSyncWithValidation('./validated-config.json', updatedConfig);
    console.log('✅ Validation passed');
  } catch (error) {
    console.log('❌ Validation failed:', error);
  }

  console.log('\n6️⃣ Testing invalid JSON handling...');
  // Manually write invalid JSON to test error handling
  memFs.writeFileSync('./invalid.json', '{ invalid json }');
  
  try {
    jsonFs.readJsonSync('./invalid.json');
  } catch (error: unknown) {
    console.log('✅ Invalid JSON properly caught:', (error as Error).name);
  }

  console.log('\n7️⃣ Testing JSON validation check...');
  console.log('Valid JSON file:', jsonFs.isValidJsonSync('./app-config.json'));
  console.log('Invalid JSON file:', jsonFs.isValidJsonSync('./invalid.json'));
  console.log('Non-existent file:', jsonFs.isValidJsonSync('./does-not-exist.json'));

  console.log('\n✨ JsonFileSystem demonstration complete!');
}

// Run the demo
demonstrateJsonFileSystem();
