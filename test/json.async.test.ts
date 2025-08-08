import { describe, it, expect, beforeEach } from 'vitest';
import { JsonFileSystem, JsonParseError, JsonStringifyError, JsonValidationError } from '../src/promises/json';
import { MemFileSystem } from './fixtures/async-memory';

interface TestConfig {
  name: string;
  version: string;
  features: {
    enabled: boolean;
    count: number;
  };
}

describe('JsonFileSystem (Async)', () => {
  let memFs: MemFileSystem;
  let jsonFs: JsonFileSystem<TestConfig>;
  
  beforeEach(() => {
    memFs = new MemFileSystem();
    jsonFs = new JsonFileSystem<TestConfig>(memFs);
  });

  describe('basic operations', () => {
    it('should write and read typed JSON data', async () => {
      const config: TestConfig = {
        name: 'test-app',
        version: '1.0.0',
        features: {
          enabled: true,
          count: 42
        }
      };

      await jsonFs.writeJson('./config.json', config);
      const result = await jsonFs.readJson('./config.json');

      expect(result).toEqual(config);
      expect(typeof result.name).toBe('string');
      expect(typeof result.features.enabled).toBe('boolean');
    });

    it('should format JSON with specified spacing', async () => {
      const jsonFsWithSpacing = new JsonFileSystem<TestConfig>(memFs, { space: 4 });
      const config: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      await jsonFsWithSpacing.writeJson('./config.json', config);
      const rawContent = await memFs.readFile('./config.json');

      expect(rawContent).toContain('    '); // 4 spaces
      expect(rawContent).toContain('{\n    "name": "test"');
    });

    it('should handle custom replacer function', async () => {
      const jsonFsWithReplacer = new JsonFileSystem<TestConfig>(memFs, {
        replacer: (key, value) => key === 'version' ? undefined : value
      });

      const config: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      await jsonFsWithReplacer.writeJson('./config.json', config);
      const rawContent = await memFs.readFile('./config.json');

      expect(rawContent).not.toContain('version');
      expect(rawContent).toContain('name');
    });
  });

  describe('convenience methods', () => {
    it('should read with default value when file does not exist', async () => {
      const defaultConfig: TestConfig = {
        name: 'default',
        version: '0.0.1',
        features: { enabled: false, count: 0 }
      };

      const result = await jsonFs.readJsonWithDefault('./nonexistent.json', defaultConfig);
      expect(result).toEqual(defaultConfig);
    });

    it('should read existing file instead of default', async () => {
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

      await jsonFs.writeJson('./config.json', existingConfig);
      const result = await jsonFs.readJsonWithDefault('./config.json', defaultConfig);
      
      expect(result).toEqual(existingConfig);
      expect(result.name).toBe('existing');
    });

    it('should update JSON with partial data', async () => {
      const initial: TestConfig = {
        name: 'initial',
        version: '1.0.0',
        features: { enabled: false, count: 5 }
      };

      await jsonFs.writeJson('./config.json', initial);
      await jsonFs.updateJson('./config.json', { 
        version: '1.1.0',
        features: { enabled: true, count: 10 }
      });

      const result = await jsonFs.readJson('./config.json');
      expect(result.name).toBe('initial'); // Unchanged
      expect(result.version).toBe('1.1.0'); // Updated
      expect(result.features.enabled).toBe(true); // Updated
      expect(result.features.count).toBe(10); // Updated
    });

    it('should validate JSON structure before writing', async () => {
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
      await expect(
        jsonFsWithValidation.writeJsonWithValidation('./valid.json', validConfig)
      ).resolves.not.toThrow();

      // Invalid config should throw
      await expect(
        jsonFsWithValidation.writeJsonWithValidation('./invalid.json', invalidConfig)
      ).rejects.toThrow(JsonValidationError);
    });

    it('should check if JSON file is valid', async () => {
      const validConfig: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      // Non-existent file
      expect(await jsonFs.isValidJson('./nonexistent.json')).toBe(false);

      // Valid JSON file
      await jsonFs.writeJson('./valid.json', validConfig);
      expect(await jsonFs.isValidJson('./valid.json')).toBe(true);

      // Invalid JSON file
      await memFs.writeFile('./invalid.json', '{ invalid json }');
      expect(await jsonFs.isValidJson('./invalid.json')).toBe(false);
    });

    it('should atomically update JSON file', async () => {
      const initial: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: false, count: 5 }
      };

      await jsonFs.writeJson('./config.json', initial);
      
      await jsonFs.atomicUpdate('./config.json', (current) => ({
        ...current,
        version: '2.0.0',
        features: {
          ...current.features,
          count: current.features.count * 2
        }
      }));

      const result = await jsonFs.readJson('./config.json');
      expect(result.version).toBe('2.0.0');
      expect(result.features.count).toBe(10); // 5 * 2
      expect(result.name).toBe('test'); // Unchanged
    });
  });

  describe('error handling', () => {
    it('should throw JsonParseError for invalid JSON', async () => {
      await memFs.writeFile('./invalid.json', '{ invalid json }');

      await expect(jsonFs.readJson('./invalid.json')).rejects.toThrow(JsonParseError);
    });

    it('should throw JsonStringifyError for unstringifiable data', async () => {
      // Create circular reference that can't be stringified
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular; // Create circular reference

      await expect(
        jsonFs.writeJson('./circular.json', circular as unknown as TestConfig)
      ).rejects.toThrow(JsonStringifyError);
    });
  });

  describe('filesystem delegation', () => {
    it('should delegate filesystem operations to base filesystem', async () => {
      const config: TestConfig = {
        name: 'test',
        version: '1.0.0',
        features: { enabled: true, count: 1 }
      };

      await jsonFs.writeJson('./config.json', config);

      // Test delegated operations
      expect(await jsonFs.exists('./config.json')).toBe(true);
      expect(await jsonFs.exists('./nonexistent.json')).toBe(false);

      await jsonFs.deleteFile('./config.json');
      expect(await jsonFs.exists('./config.json')).toBe(false);
    });

    it('should expose underlying filesystem', () => {
      expect(jsonFs.fileSystem).toBe(memFs);
    });
  });
});
