import type { IAsyncFileSystem } from "./async-filesystem.interface";

/**
 * Type-safe async JSON filesystem that automatically handles JSON parsing/stringification
 * Wraps any IAsyncFileSystem implementation to provide typed JSON operations
 * @template T The type of data stored in JSON files
 */
export class JsonFileSystem<T = unknown> {
  constructor(
    private baseFileSystem: IAsyncFileSystem,
    private options: JsonFileSystemOptions = {},
  ) {}

  /**
   * Read and parse JSON file as typed object
   * @param path File path
   * @returns Parsed object of type T
   */
  async readJson(path: string): Promise<T> {
    const content = await this.baseFileSystem.readFile(path);
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new JsonParseError(
        `Failed to parse JSON from ${path}`,
        error as Error,
      );
    }
  }

  /**
   * Stringify and write typed object as JSON
   * @param path File path
   * @param data Typed data to write
   */
  async writeJson(path: string, data: T): Promise<void> {
    try {
      const content = JSON.stringify(
        data,
        this.options.replacer,
        this.options.space ?? 2,
      );
      await this.baseFileSystem.writeFile(path, content);
    } catch (error) {
      throw new JsonStringifyError(
        `Failed to stringify data for ${path}`,
        error as Error,
      );
    }
  }

  /**
   * Read and parse JSON file with default fallback
   * @param path File path
   * @param defaultValue Default value if file doesn't exist
   * @returns Parsed object or default value
   */
  async readJsonWithDefault(path: string, defaultValue: T): Promise<T> {
    if (!(await this.baseFileSystem.exists(path))) {
      return defaultValue;
    }
    return this.readJson(path);
  }

  /**
   * Update JSON file with partial data (shallow merge)
   * @param path File path
   * @param updates Partial data to merge
   */
  async updateJson(path: string, updates: Partial<T>): Promise<void> {
    const current = await this.readJson(path);
    const updated = { ...current, ...updates } as T;
    await this.writeJson(path, updated);
  }

  /**
   * Validate JSON structure before writing (if validator provided)
   * @param path File path
   * @param data Data to validate and write
   */
  async writeJsonWithValidation(path: string, data: T): Promise<void> {
    if (this.options.validator) {
      const isValid = this.options.validator(data);
      if (!isValid) {
        throw new JsonValidationError(`Data validation failed for ${path}`);
      }
    }
    await this.writeJson(path, data);
  }

  /**
   * Check if JSON file exists and is valid
   * @param path File path
   * @returns true if file exists and contains valid JSON
   */
  async isValidJson(path: string): Promise<boolean> {
    if (!(await this.baseFileSystem.exists(path))) {
      return false;
    }
    try {
      await this.readJson(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Atomically update JSON file (read-modify-write with custom updater function)
   * @param path File path
   * @param updater Function that receives current data and returns updated data
   */
  async atomicUpdate(path: string, updater: (current: T) => T): Promise<void> {
    const current = await this.readJson(path);
    const updated = updater(current);
    await this.writeJson(path, updated);
  }

  // Expose underlying filesystem operations for convenience
  get fileSystem(): IAsyncFileSystem {
    return this.baseFileSystem;
  }

  // Common filesystem operations (delegate to base)
  async exists(path: string): Promise<boolean> {
    return this.baseFileSystem.exists(path);
  }

  async deleteFile(path: string): Promise<void> {
    return this.baseFileSystem.deleteFile(path);
  }

  async deleteDir(path: string): Promise<void> {
    return this.baseFileSystem.deleteDir(path);
  }

  async ensureDir(path: string): Promise<void> {
    return this.baseFileSystem.ensureDir(path);
  }

  async readDir(path: string): Promise<string[]> {
    return this.baseFileSystem.readDir(path);
  }

  async chmod(path: string, mode: number): Promise<void> {
    return this.baseFileSystem.chmod(path, mode);
  }

  async clear?(dirPath: string): Promise<void> {
    if (this.baseFileSystem.clear) {
      return this.baseFileSystem.clear(dirPath);
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
  constructor(
    message: string,
    public readonly cause: Error,
  ) {
    super(message);
    this.name = "JsonParseError";
  }
}

/**
 * Error thrown when JSON stringification fails
 */
export class JsonStringifyError extends Error {
  constructor(
    message: string,
    public readonly cause: Error,
  ) {
    super(message);
    this.name = "JsonStringifyError";
  }
}

/**
 * Error thrown when JSON validation fails
 */
export class JsonValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonValidationError";
  }
}
