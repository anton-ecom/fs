import { describe, it, expect, beforeEach } from 'vitest';
import { JsonFileSystem, JsonParseError, JsonStringifyError, JsonValidationError } from '../src/json';
import { MemFileSystem } from './fixtures/memory';

interface TestConfig {
  name: string;
  version: string;
  features: {
    enabled: boolean;
    count: number;
  };
}

describe('JsonFileSystem (Sync)', () => {
  let memFs: MemFileSystem;
  let jsonFs: JsonFileSystem<TestConfig>;
  
  beforeEach(() => {
    memFs = new MemFileSystem();
    jsonFs = new JsonFileSystem<TestConfig>(memFs);
  });

  describe('basic operations', () => {
    it('should write and read typed JSON data', () => {
      const config: TestConfig = {
        name: 'test-app',
        version: '1.0.0',
        features: {
          enabled: true,
          count: 42
        }
      };

      jsonFs.writeJsonSync('./config.json', config);
      const result = jsonFs.readJsonSync('./config.json');

      expect(result).toEqual(config);
      expect(typeof result.name).toBe('string');
      expect(typeof result.features.enabled).toBe('boolean');
    });

    it('should format JSON with specified spacing', () => {
      const jsonFsWithSpacing = new JsonFileSystem<TestConfig>(memFs, { space: 4 });
      const config: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      jsonFsWithSpacing.writeJsonSync('./config.json', config);
      const rawContent = memFs.readFileSync('./config.json');

      expect(rawContent).toContain('    '); // 4 spaces
      expect(rawContent).toContain('{\n    "name": "test"');
    });

    it('should handle custom replacer function', () => {
      const jsonFsWithReplacer = new JsonFileSystem<TestConfig>(memFs, {
        replacer: (key, value) => key === 'version' ? undefined : value
      });

      const config: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      jsonFsWithReplacer.writeJsonSync('./config.json', config);
      const rawContent = memFs.readFileSync('./config.json');

      expect(rawContent).not.toContain('version');
      expect(rawContent).toContain('name');
    });
  });

  describe('convenience methods', () => {
    it('should read with default value when file does not exist', () => {
      const defaultConfig: TestConfig = {
        name: 'default',
        version: '0.0.1',
        features: { enabled: false, count: 0 }
      };

      const result = jsonFs.readJsonSyncWithDefault('./nonexistent.json', defaultConfig);
      expect(result).toEqual(defaultConfig);
    });

    it('should read existing file instead of default', () => {
      const existingConfig: TestConfig = {
        name: 'existing',
        version: '2.0.0',
        features: { enabled: true, count: 10 }
      };

      const defaultConfig: TestConfig = {
        name: 'default',
        version: '0.0.1',
        features: { enabled: false, count: 0 }
      };

      jsonFs.writeJsonSync('./config.json', existingConfig);
      const result = jsonFs.readJsonSyncWithDefault('./config.json', defaultConfig);
      
      expect(result).toEqual(existingConfig);
      expect(result.name).toBe('existing');
    });

    it('should update JSON with partial data', () => {
      const initial: TestConfig = {
        name: 'initial',
        version: '1.0.0',
        features: { enabled: false, count: 5 }
      };

      jsonFs.writeJsonSync('./config.json', initial);
      jsonFs.updateJsonSync('./config.json', { 
        version: '1.1.0',
        features: { enabled: true, count: 10 }
      });

      const result = jsonFs.readJsonSync('./config.json');
      expect(result.name).toBe('initial'); // Unchanged
      expect(result.version).toBe('1.1.0'); // Updated
      expect(result.features.enabled).toBe(true); // Updated
      expect(result.features.count).toBe(10); // Updated
    });

    it('should validate JSON structure before writing', () => {
      const validator = (data: unknown): boolean => {
        const config = data as TestConfig;
        return config.name.length > 0 && config.version.length > 0;
      };

      const jsonFsWithValidation = new JsonFileSystem<TestConfig>(memFs, { validator });

      const validConfig: TestConfig = {
        name: 'valid',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      const invalidConfig: TestConfig = {
        name: '',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      // Valid config should work
      expect(() => {
        jsonFsWithValidation.writeJsonSyncWithValidation('./valid.json', validConfig);
      }).not.toThrow();

      // Invalid config should throw
      expect(() => {
        jsonFsWithValidation.writeJsonSyncWithValidation('./invalid.json', invalidConfig);
      }).toThrow(JsonValidationError);
    });

    it('should check if JSON file is valid', () => {
      const validConfig: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      // Non-existent file
      expect(jsonFs.isValidJsonSync('./nonexistent.json')).toBe(false);

      // Valid JSON file
      jsonFs.writeJsonSync('./valid.json', validConfig);
      expect(jsonFs.isValidJsonSync('./valid.json')).toBe(true);

      // Invalid JSON file
      memFs.writeFileSync('./invalid.json', '{ invalid json }');
      expect(jsonFs.isValidJsonSync('./invalid.json')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw JsonParseError for invalid JSON', () => {
      memFs.writeFileSync('./invalid.json', '{ invalid json }');

      expect(() => {
        jsonFs.readJsonSync('./invalid.json');
      }).toThrow(JsonParseError);
    });

    it('should throw JsonStringifyError for unstringifiable data', () => {
      // Create circular reference that can't be stringified
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular; // Create circular reference

      expect(() => {
        jsonFs.writeJsonSync('./circular.json', circular as unknown as TestConfig);
      }).toThrow(JsonStringifyError);
    });
  });

  describe('filesystem delegation', () => {
    it('should delegate filesystem operations to base filesystem', () => {
      const config: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      jsonFs.writeJsonSync('./config.json', config);

      // Test delegated operations
      expect(jsonFs.existsSync('./config.json')).toBe(true);
      expect(jsonFs.existsSync('./nonexistent.json')).toBe(false);

      jsonFs.deleteFileSync('./config.json');
      expect(jsonFs.existsSync('./config.json')).toBe(false);
    });

    it('should expose underlying filesystem', () => {
      expect(jsonFs.fileSystem).toBe(memFs);
    });
  });
});
