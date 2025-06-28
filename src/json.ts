import type { IFileSystem } from "@synet/patterns/filesystem";

/**
 * Type-safe JSON filesystem that automatically handles JSON parsing/stringification
 * Wraps any IFileSystem implementation to provide typed JSON operations
 * @template T The type of data stored in JSON files
 */
export class JsonFileSystem<T = unknown> {
  constructor(
    private baseFileSystem: IFileSystem,
    private options: JsonFileSystemOptions = {}
  ) {}

  /**
   * Read and parse JSON file as typed object
   * @param path File path
   * @returns Parsed object of type T
   */
  readJsonSync(path: string): T {
    const content = this.baseFileSystem.readFileSync(path);
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new JsonParseError(`Failed to parse JSON from ${path}`, error as Error);
    }
  }

  /**
   * Stringify and write typed object as JSON
   * @param path File path
   * @param data Typed data to write
   */
  writeJsonSync(path: string, data: T): void {
    try {
      const content = JSON.stringify(data, this.options.replacer, this.options.space ?? 2);
      this.baseFileSystem.writeFileSync(path, content);
    } catch (error) {
      throw new JsonStringifyError(`Failed to stringify data for ${path}`, error as Error);
    }
  }

  /**
   * Read and parse JSON file with default fallback
   * @param path File path
   * @param defaultValue Default value if file doesn't exist
   * @returns Parsed object or default value
   */
  readJsonSyncWithDefault(path: string, defaultValue: T): T {
    if (!this.baseFileSystem.existsSync(path)) {
      return defaultValue;
    }
    return this.readJsonSync(path);
  }

  /**
   * Update JSON file with partial data (shallow merge)
   * @param path File path
   * @param updates Partial data to merge
   */
  updateJsonSync(path: string, updates: Partial<T>): void {
    const current = this.readJsonSync(path);
    const updated = { ...current, ...updates } as T;
    this.writeJsonSync(path, updated);
  }

  /**
   * Validate JSON structure before writing (if validator provided)
   * @param path File path
   * @param data Data to validate and write
   */
  writeJsonSyncWithValidation(path: string, data: T): void {
    if (this.options.validator) {
      const isValid = this.options.validator(data);
      if (!isValid) {
        throw new JsonValidationError(`Data validation failed for ${path}`);
      }
    }
    this.writeJsonSync(path, data);
  }

  /**
   * Check if JSON file exists and is valid
   * @param path File path
   * @returns true if file exists and contains valid JSON
   */
  isValidJsonSync(path: string): boolean {
    if (!this.baseFileSystem.existsSync(path)) {
      return false;
    }
    try {
      this.readJsonSync(path);
      return true;
    } catch {
      return false;
    }
  }

  // Expose underlying filesystem operations for convenience
  get fileSystem(): IFileSystem {
    return this.baseFileSystem;
  }

  // Common filesystem operations (delegate to base)
  existsSync(path: string): boolean {
    return this.baseFileSystem.existsSync(path);
  }

  deleteFileSync(path: string): void {
    this.baseFileSystem.deleteFileSync(path);
  }

  deleteDirSync(path: string): void {
    this.baseFileSystem.deleteDirSync(path);
  }

  ensureDirSync(path: string): void {
    this.baseFileSystem.ensureDirSync(path);
  }

  readDirSync(path: string): string[] {
    return this.baseFileSystem.readDirSync(path);
  }

  chmodSync(path: string, mode: number): void {
    this.baseFileSystem.chmodSync(path, mode);
  }

  clear?(dirPath: string): void {
    if (this.baseFileSystem.clear) {
      this.baseFileSystem.clear(dirPath);
    }
  }
}

/**
 * Configuration options for JsonFileSystem
 */
export interface JsonFileSystemOptions {
  /**
   * JSON.stringify space parameter for formatting
   * @default 2
   */
  space?: string | number;

  /**
   * JSON.stringify replacer function
   */
  replacer?: (key: string, value: unknown) => unknown;

  /**
   * Optional validator function to validate data before writing
   */
  validator?: (data: unknown) => boolean;
}

/**
 * Error thrown when JSON parsing fails
 */
export class JsonParseError extends Error {
  constructor(message: string, public readonly cause: Error) {
    super(message);
    this.name = 'JsonParseError';
  }
}

/**
 * Error thrown when JSON stringification fails
 */
export class JsonStringifyError extends Error {
  constructor(message: string, public readonly cause: Error) {
    super(message);
    this.name = 'JsonStringifyError';
  }
}

/**
 * Error thrown when JSON validation fails
 */
export class JsonValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonValidationError';
  }
}
