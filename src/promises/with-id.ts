import crypto from "node:crypto";
import path from "node:path";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";

/**
 * Supported file formats for ID-based file operations
 */
export enum FileFormat {
  JSON = "json",
  TXT = "txt",
  PDF = "pdf",
  MD = "md",
  XML = "xml",
  CSV = "csv",
  LOG = "log",
  CONFIG = "config",
}

/**
 * File metadata containing ID and alias information
 */
export interface FileMetadata {
  id: string;
  alias: string;
  originalPath: string;
  storedPath: string;
  format: FileFormat;
}

/**
 * WithIdFileSystem provides deterministic IDs for files while preserving original names
 * Files are stored with format: basename:filename-path-hash.ext
 * Enables access by original path, ID, or alias
 */
export class WithIdFileSystem implements IAsyncFileSystem {
  private fileMap = new Map<string, FileMetadata>();
  private idMap = new Map<string, FileMetadata>();
  private aliasMap = new Map<string, FileMetadata>();

  constructor(private baseFileSystem: IAsyncFileSystem) {}

  /**
   * Generate deterministic ID for a file path
   */
  private generateId(filePath: string): string {
    return crypto
      .createHash("sha256")
      .update(filePath)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Generate alias from file path (readable identifier)
   */
  private generateAlias(filePath: string): string {
    // Remove leading slash and convert path separators to hyphens
    const normalized = filePath.replace(/^[./]+/, "").replace(/[/\\]/g, "-");
    // Remove extension
    const withoutExt = normalized.replace(/\.[^.]*$/, "");
    return withoutExt;
  }

  /**
   * Get file format from extension
   */
  private getFileFormat(filePath: string): FileFormat {
    const ext = path.extname(filePath).toLowerCase().substring(1);

    // Map common extensions to FileFormat enum
    switch (ext) {
      case "json":
        return FileFormat.JSON;
      case "txt":
        return FileFormat.TXT;
      case "pdf":
        return FileFormat.PDF;
      case "md":
      case "markdown":
        return FileFormat.MD;
      case "xml":
        return FileFormat.XML;
      case "csv":
        return FileFormat.CSV;
      case "log":
        return FileFormat.LOG;
      case "conf":
      case "config":
      case "ini":
        return FileFormat.CONFIG;
      default:
        return FileFormat.TXT; // Default fallback
    }
  }

  /**
   * Generate stored file path with ID format
   */
  private generateStoredPath(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const dir = path.dirname(normalizedPath);
    const ext = path.extname(normalizedPath);
    const basename = path.basename(normalizedPath, ext);
    const id = this.generateId(normalizedPath);
    const alias = this.generateAlias(normalizedPath);

    const storedName = `${basename}:${alias}-${id}${ext}`;

    // Preserve the original directory structure including leading ./
    if (dir === ".") {
      return `./${storedName}`;
    }
    return `${dir}/${storedName}`;
  }

  /**
   * Get file metadata for a path, creating if necessary
   */
  private getOrCreateMetadata(filePath: string): FileMetadata {
    const normalizedPath = filePath.replace(/\\/g, "/");

    const existing = this.fileMap.get(normalizedPath);
    if (existing) {
      return existing;
    }

    const id = this.generateId(normalizedPath);
    const alias = this.generateAlias(normalizedPath);
    const storedPath = this.generateStoredPath(normalizedPath);
    const format = this.getFileFormat(normalizedPath);

    const metadata: FileMetadata = {
      id,
      alias,
      originalPath: normalizedPath,
      storedPath,
      format,
    };

    // Store in all maps
    this.fileMap.set(normalizedPath, metadata);
    this.idMap.set(id, metadata);
    this.aliasMap.set(alias, metadata);

    return metadata;
  }

  /**
   * Find metadata by ID or alias
   */
  private findMetadata(idOrAlias: string): FileMetadata | undefined {
    return this.idMap.get(idOrAlias) || this.aliasMap.get(idOrAlias);
  }

  /**
   * Get deterministic ID for a file path
   */
  getId(filePath: string): string {
    const metadata = this.getOrCreateMetadata(filePath);
    return metadata.id;
  }

  /**
   * Get alias (readable identifier) for a file path
   */
  getAlias(filePath: string): string {
    const metadata = this.getOrCreateMetadata(filePath);
    return metadata.alias;
  }

  /**
   * Get file content by ID or alias with optional format specification
   */
  async getByIdOrAlias(
    idOrAlias: string,
    expectedFormat?: FileFormat,
  ): Promise<string> {
    const metadata = this.findMetadata(idOrAlias);

    if (!metadata) {
      throw new Error(`File not found with ID or alias: ${idOrAlias}`);
    }

    if (expectedFormat && metadata.format !== expectedFormat) {
      throw new Error(
        `File format mismatch. Expected: ${expectedFormat}, Found: ${metadata.format}`,
      );
    }

    return await this.baseFileSystem.readFile(metadata.storedPath);
  }

  /**
   * Get metadata for a file by its original path
   */
  getMetadata(filePath: string): FileMetadata {
    return this.getOrCreateMetadata(filePath);
  }

  /**
   * List all tracked files
   */
  listTrackedFiles(): FileMetadata[] {
    return Array.from(this.fileMap.values());
  }

  // IAsyncFileSystem implementation

  async exists(path: string): Promise<boolean> {
    const normalizedPath = path.replace(/\\/g, "/");
    const existing = this.fileMap.get(normalizedPath);

    if (existing) {
      // File is tracked, check if it exists in base filesystem
      return await this.baseFileSystem.exists(existing.storedPath);
    }

    // File not tracked, check if we should track it
    // Generate the stored path and check if it exists
    const metadata = this.getOrCreateMetadata(normalizedPath);
    const exists = await this.baseFileSystem.exists(metadata.storedPath);

    if (!exists) {
      // If file doesn't exist, clean up the metadata we just created
      this.fileMap.delete(metadata.originalPath);
      this.idMap.delete(metadata.id);
      this.aliasMap.delete(metadata.alias);
    }

    return exists;
  }

  async readFile(path: string): Promise<string> {
    const metadata = this.getOrCreateMetadata(path);
    return await this.baseFileSystem.readFile(metadata.storedPath);
  }

  async writeFile(path: string, data: string): Promise<void> {
    const metadata = this.getOrCreateMetadata(path);
    await this.baseFileSystem.writeFile(metadata.storedPath, data);
  }

  async deleteFile(path: string): Promise<void> {
    const metadata = this.getOrCreateMetadata(path);
    await this.baseFileSystem.deleteFile(metadata.storedPath);

    // Clean up metadata
    this.fileMap.delete(metadata.originalPath);
    this.idMap.delete(metadata.id);
    this.aliasMap.delete(metadata.alias);
  }

  async deleteDir(path: string): Promise<void> {
    // Clean up metadata for files in the directory
    const normalizedPath = path.replace(/\\/g, "/");
    for (const [filePath, metadata] of this.fileMap.entries()) {
      if (filePath.startsWith(normalizedPath)) {
        this.idMap.delete(metadata.id);
        this.aliasMap.delete(metadata.alias);
        this.fileMap.delete(filePath);
      }
    }

    await this.baseFileSystem.deleteDir(path);
  }

  async readDir(dirPath: string): Promise<string[]> {
    return await this.baseFileSystem.readDir(dirPath);
  }

  async ensureDir(path: string): Promise<void> {
    await this.baseFileSystem.ensureDir(path);
  }

  async chmod(path: string, mode: number): Promise<void> {
    const metadata = this.getOrCreateMetadata(path);
    await this.baseFileSystem.chmod(metadata.storedPath, mode);
  }

  async clear?(dirPath: string): Promise<void> {
    if (this.baseFileSystem.clear) {
      // Clean up metadata for the directory
      const normalizedPath = dirPath.replace(/\\/g, "/");
      for (const [filePath, metadata] of this.fileMap.entries()) {
        if (filePath.startsWith(normalizedPath)) {
          this.idMap.delete(metadata.id);
          this.aliasMap.delete(metadata.alias);
          this.fileMap.delete(filePath);
        }
      }

      await this.baseFileSystem.clear(dirPath);
    }
  }
}
