/**
 * Async Test Filesystem - Zero Dependencies
 * 
 * Ultra-lightweight async filesystem implementation for testing services.
 * No external dependencies, just native JS structures with Promise wrappers.
 * Perfect for testing async service logic without provider complexity.
 * 
 * Handles path normalization like real filesystem backends.
 */

import type { FileStats, IAsyncFileSystem } from '../../src/promises/filesystem.interface';

export class AsyncTestFileSystem implements IAsyncFileSystem {
  private files = new Map<string, string>();
  private dirs = new Set<string>(['/']); // Start with root only
  
  /**
   * Normalize paths to absolute format (like memory backend)
   * Handles: './', '../', 'relative', '/absolute'
   */
  private normalizePath(path: string): string {
    // Already absolute
    if (path.startsWith('/')) {
      return path;
    }
    
    // Current directory references
    if (path === '.' || path === './') {
      return '/';
    }
    
    // Relative paths starting with './'
    if (path.startsWith('./')) {
      return '/' + path.slice(2);
    }
    
    // Simple relative paths
    return '/' + path;
  }
  
  /**
   * Get parent directory path
   */
  private getParentDir(path: string): string {
    const normalizedPath = this.normalizePath(path);
    const lastSlash = normalizedPath.lastIndexOf('/');
    
    if (lastSlash === 0) {
      return '/'; // Root is parent
    }
    
    return normalizedPath.substring(0, lastSlash);
  }
  
  async exists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    return this.files.has(normalizedPath) || this.dirs.has(normalizedPath);
  }
  
  async readFile(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    if (!this.files.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return this.files.get(normalizedPath)!;
  }
  
  async writeFile(path: string, data: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    
    // Auto-create parent directories
    const parentDir = this.getParentDir(normalizedPath);
    await this.ensureDir(parentDir);
    
    this.files.set(normalizedPath, data);
  }
  
  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    if (!this.files.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
    this.files.delete(normalizedPath);
  }
  
  async deleteDir(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.dirs.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`);
    }
    
    // Check if directory has files or subdirectories
    const hasContents = Array.from(this.files.keys()).some(file => 
      file.startsWith(normalizedPath + '/') && file !== normalizedPath
    ) || Array.from(this.dirs).some(dir => 
      dir.startsWith(normalizedPath + '/') && dir !== normalizedPath
    );
    
    if (hasContents) {
      throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
    }
    
    this.dirs.delete(normalizedPath);
  }
  
  async readDir(dirPath: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(dirPath);
    
    if (!this.dirs.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }
    
    const results: string[] = [];
    const searchPrefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
    
    // Find files in this directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(searchPrefix)) {
        const relativePath = filePath.substring(searchPrefix.length);
        // Only immediate children (no nested subdirectories)
        if (!relativePath.includes('/')) {
          results.push(relativePath);
        }
      }
    }
    
    // Find subdirectories
    for (const dir of this.dirs) {
      if (dir !== normalizedPath && dir.startsWith(searchPrefix)) {
        const relativePath = dir.substring(searchPrefix.length);
        // Only immediate subdirectories
        if (!relativePath.includes('/')) {
          results.push(relativePath);
        }
      }
    }
    
    return results.sort();
  }
  
  async ensureDir(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    
    // Add this directory
    this.dirs.add(normalizedPath);
    
    // Ensure all parent directories exist
    let current = normalizedPath;
    while (current !== '/') {
      this.dirs.add(current);
      current = this.getParentDir(current);
    }
  }
  
  async chmod(path: string, mode: number): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    // Permissions not relevant for service tests, just verify path exists
    if (!this.files.has(normalizedPath) && !this.dirs.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, chmod '${path}'`);
    }
  }
  
  async stat(path: string): Promise<FileStats> {
    const normalizedPath = this.normalizePath(path);
    if (!this.files.has(normalizedPath) && !this.dirs.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    
    const now = new Date();
    
    return {
      isFile: () => this.files.has(normalizedPath),
      isDirectory: () => this.dirs.has(normalizedPath),
      isSymbolicLink: () => false,
      size: this.files.has(normalizedPath) ? this.files.get(normalizedPath)!.length : 0,
      mtime: now,
      ctime: now,
      atime: now,
      mode: 0o644
    };
  }
  
  async clear(dirPath?: string): Promise<void> {
    if (dirPath) {
      const normalizedPath = this.normalizePath(dirPath);
      const searchPrefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
      
      // Remove all files in this directory and subdirectories
      for (const filePath of Array.from(this.files.keys())) {
        if (filePath.startsWith(searchPrefix)) {
          this.files.delete(filePath);
        }
      }
      
      // Remove all subdirectories
      for (const dir of Array.from(this.dirs)) {
        if (dir !== normalizedPath && dir.startsWith(searchPrefix)) {
          this.dirs.delete(dir);
        }
      }
    } else {
      // Clear everything except root
      this.files.clear();
      this.dirs.clear();
      this.dirs.add('/');
    }
  }
  
  /**
   * Get current state for debugging tests
   */
  getState(): { files: string[], dirs: string[] } {
    return {
      files: Array.from(this.files.keys()),
      dirs: Array.from(this.dirs)
    };
  }
}
