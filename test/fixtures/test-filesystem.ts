/**
 * Minimal Test Filesystem - Zero Dependencies
 * 
 * Ultra-lightweight filesystem implementation for testing services.
 * No external dependencies, just native JS structures.
 * Perfect for testing service logic without provider complexity.
 * 
 * Handles path normalization like real filesystem backends.
 */

import type { FileStats, IFileSystem } from '../../src/filesystem.interface';

export class TestFileSystem implements IFileSystem {
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
  
  existsSync(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.files.has(normalizedPath) || this.dirs.has(normalizedPath);
  }
  
  readFileSync(path: string): string {
    const normalizedPath = this.normalizePath(path);
    if (!this.files.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return this.files.get(normalizedPath)!;
  }
  
  writeFileSync(path: string, data: string): void {
    const normalizedPath = this.normalizePath(path);
    
    // Auto-create parent directories
    const parentDir = this.getParentDir(normalizedPath);
    this.ensureDirSync(parentDir);
    
    this.files.set(normalizedPath, data);
  }
  
  deleteFileSync(path: string): void {
    const normalizedPath = this.normalizePath(path);
    if (!this.files.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
    this.files.delete(normalizedPath);
  }
  
  deleteDirSync(path: string): void {
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
  
  readDirSync(dirPath: string): string[] {
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
  
  ensureDirSync(path: string): void {
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
  
  chmodSync(path: string, mode: number): void {
    const normalizedPath = this.normalizePath(path);
    // Permissions not relevant for service tests, just verify path exists
    if (!this.files.has(normalizedPath) && !this.dirs.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, chmod '${path}'`);
    }
  }
  
  statSync(path: string): FileStats {
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
  
  /**
   * Clear all files and directories (except root)
   * Useful for test cleanup
   */
  clear(): void {
    this.files.clear();
    this.dirs.clear();
    this.dirs.add('/'); // Keep root
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
