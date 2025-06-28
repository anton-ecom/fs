import { Octokit } from '@octokit/rest';
import type { IFileSystem, FileStats } from '@synet/patterns/filesystem';

/**
 * GitHub filesystem configuration options
 */
export interface GitHubFileSystemOptions {
  /** GitHub personal access token */
  token: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Base branch (default: 'main') */
  branch?: string;
  /** Commit author name (default: 'GitHubFileSystem') */
  authorName?: string;
  /** Commit author email (default: 'noreply@github.com') */
  authorEmail?: string;
  /** Auto-commit on write operations (default: true) */
  autoCommit?: boolean;
}

/**
 * In-memory cache for file contents and metadata
 */
interface FileCache {
  content: string;
  sha: string;
  path: string;
}

/**
 * GitHub-based filesystem implementation
 * 
 * Stores files in a GitHub repository with automatic version control.
 * Each write operation creates a commit, providing built-in versioning
 * and collaboration features.
 * 
 * Note: This is a synchronous implementation that uses sync-style methods
 * but internally makes async calls. For pure async implementation, use GitHubFileSystemAsync.
 */
export class GitHubFileSystem implements IFileSystem {
  private octokit: Octokit;
  private options: Required<GitHubFileSystemOptions>;
  private cache = new Map<string, FileCache>();

  constructor(options: GitHubFileSystemOptions) {
    this.options = {
      branch: 'main',
      authorName: 'GitHubFileSystem',
      authorEmail: 'noreply@github.com',
      autoCommit: true,
      ...options
    };

    this.octokit = new Octokit({
      auth: this.options.token
    });
  }

  /**
   * Synchronously check if a file exists
   * @param path File path in the repository
   */
  existsSync(path: string): boolean {
    try {
      // Check cache first
      if (this.cache.has(path)) {
        return true;
      }

      // Make synchronous call to GitHub API (blocks execution)
      const response = this.makeSync(() => 
        this.octokit.rest.repos.getContent({
          owner: this.options.owner,
          repo: this.options.repo,
          path: this.normalizePath(path),
          ref: this.options.branch
        })
      );

      if (response && 'content' in response.data && typeof response.data.content === 'string') {
        // Cache the file
        this.cache.set(path, {
          content: Buffer.from(response.data.content, 'base64').toString('utf8'),
          sha: response.data.sha,
          path: this.normalizePath(path)
        });
        return true;
      }

      return false;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false;
      }
      throw new Error(`Failed to check file existence for ${path}: ${error}`);
    }
  }

  /**
   * Synchronously read a file from the repository
   * @param path File path in the repository
   */
  readFileSync(path: string): string {
    try {
      // Check cache first
      const cached = this.cache.get(path);
      if (cached) {
        return cached.content;
      }

      // Fetch from GitHub
      const response = this.makeSync(() =>
        this.octokit.rest.repos.getContent({
          owner: this.options.owner,
          repo: this.options.repo,
          path: this.normalizePath(path),
          ref: this.options.branch
        })
      );

      if (!response || !('content' in response.data) || typeof response.data.content !== 'string') {
        throw new Error(`File ${path} is not a regular file or content is not available`);
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      
      // Cache the file
      this.cache.set(path, {
        content,
        sha: response.data.sha,
        path: this.normalizePath(path)
      });

      return content;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  }

  /**
   * Synchronously write a file to the repository
   * @param path File path in the repository
   * @param data File content
   */
  writeFileSync(path: string): void;
  writeFileSync(path: string, data: string): void;
  writeFileSync(path: string, data?: string): void {
    if (data === undefined) {
      // This overload is for compatibility, but we need data to write
      throw new Error('Data parameter is required for writeFileSync');
    }

    try {
      const normalizedPath = this.normalizePath(path);
      
      // Get current file info if it exists
      const cached = this.cache.get(path);
      let sha: string | undefined = cached?.sha;

      // If not cached, try to get the current SHA
      if (!sha) {
        try {
          const response = this.makeSync(() =>
            this.octokit.rest.repos.getContent({
              owner: this.options.owner,
              repo: this.options.repo,
              path: normalizedPath,
              ref: this.options.branch
            })
          );

          if (response && 'sha' in response.data) {
            sha = response.data.sha;
          }
        } catch (error) {
          // File doesn't exist, that's okay for new files
        }
      }

      if (this.options.autoCommit) {
        // Create or update file with commit
        this.makeSync(() =>
          this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.options.owner,
            repo: this.options.repo,
            path: normalizedPath,
            message: `Update ${path}`,
            content: Buffer.from(data).toString('base64'),
            branch: this.options.branch,
            sha: sha,
            author: {
              name: this.options.authorName,
              email: this.options.authorEmail
            },
            committer: {
              name: this.options.authorName,
              email: this.options.authorEmail
            }
          })
        );
      }

      // Update cache
      this.cache.set(path, {
        content: data,
        sha: sha || '', // Will be updated after commit
        path: normalizedPath
      });

    } catch (error: unknown) {
      throw new Error(`Failed to write file ${path}: ${error}`);
    }
  }

  /**
   * Synchronously delete a file from the repository
   * @param path File path in the repository
   */
  deleteFileSync(path: string): void {
    try {
      const normalizedPath = this.normalizePath(path);
      
      // Get current file SHA
      let sha: string | undefined = this.cache.get(path)?.sha;

      if (!sha) {
        const response = this.makeSync(() =>
          this.octokit.rest.repos.getContent({
            owner: this.options.owner,
            repo: this.options.repo,
            path: normalizedPath,
            ref: this.options.branch
          })
        );

        if (!response || !('sha' in response.data)) {
          throw new Error(`File ${path} not found or cannot be deleted`);
        }

        sha = response.data.sha;
      }

      // Delete the file
      this.makeSync(() =>
        this.octokit.rest.repos.deleteFile({
          owner: this.options.owner,
          repo: this.options.repo,
          path: normalizedPath,
          message: `Delete ${path}`,
          sha: sha as string,
          branch: this.options.branch,
          author: {
            name: this.options.authorName,
            email: this.options.authorEmail
          },
          committer: {
            name: this.options.authorName,
            email: this.options.authorEmail
          }
        })
      );

      // Remove from cache
      this.cache.delete(path);

    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        // File already doesn't exist, that's fine
        return;
      }
      throw new Error(`Failed to delete file ${path}: ${error}`);
    }
  }

  /**
   * Synchronously delete a directory (not supported - GitHub doesn't have empty directories)
   * @param path Directory path
   */
  deleteDirSync(path: string): void {
    throw new Error('GitHub filesystem does not support directory deletion. Delete individual files instead.');
  }

  /**
   * Synchronously ensure a directory exists (no-op - GitHub creates directories implicitly)
   * @param dirPath Directory path
   */
  ensureDirSync(dirPath: string): void {
    // GitHub creates directories implicitly when files are added
    // This is a no-op for compatibility
  }

  /**
   * Synchronously read directory contents
   * @param dirPath Directory path
   */
  readDirSync(dirPath: string): string[] {
    try {
      const normalizedPath = this.normalizePath(dirPath);
      
      const response = this.makeSync(() =>
        this.octokit.rest.repos.getContent({
          owner: this.options.owner,
          repo: this.options.repo,
          path: normalizedPath,
          ref: this.options.branch
        })
      );

      if (!response || !Array.isArray(response.data)) {
        return [];
      }

      return (response.data as Array<{ type: string; name: string }>)
        .filter(item => item.type === 'file')
        .map(item => item.name);

    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return [];
      }
      throw new Error(`Failed to read directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Set file permissions (not supported in GitHub)
   * @param path File path
   * @param mode Permission mode
   */
  chmodSync(path: string, mode: number): void {
    // GitHub doesn't support file permissions
    // This is a no-op for compatibility
  }

  /**
   * Get file statistics
   * @param path File path
   */
  statSync(path: string): FileStats {
    try {
      const normalizedPath = this.normalizePath(path);
      
      // Check cache first
      const cached = this.cache.get(path);
      if (cached) {
        return this.createFileStats(cached.content, new Date(), false);
      }

      // Fetch from GitHub
      const response = this.makeSync(() =>
        this.octokit.rest.repos.getContent({
          owner: this.options.owner,
          repo: this.options.repo,
          path: normalizedPath,
          ref: this.options.branch
        })
      );

      if (!response) {
        throw new Error(`File not found: ${path}`);
      }

      const isDirectory = Array.isArray(response.data);
      
      if (isDirectory) {
        return this.createFileStats('', new Date(), true);
      }

      if ('content' in response.data && typeof response.data.content === 'string') {
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        
        // Cache the file
        this.cache.set(path, {
          content,
          sha: response.data.sha,
          path: normalizedPath
        });

        // Get commit info for more accurate timestamps (simplified)
        return this.createFileStats(content, new Date(), false);
      }

      throw new Error(`Unable to get stats for ${path}`);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`Failed to get file stats for ${path}: ${error}`);
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get repository information
   */
  getRepositoryInfo(): { owner: string; repo: string; branch: string } {
    return {
      owner: this.options.owner,
      repo: this.options.repo,
      branch: this.options.branch
    };
  }

  /**
   * Normalize file path for GitHub API
   * @param path Input path
   */
  private normalizePath(path: string): string {
    // Remove leading slashes and normalize
    return path.replace(/^\.?\/+/, '').replace(/\/+/g, '/');
  }

  /**
   * Make synchronous call to async function
   * This is a helper for the sync API - not recommended for production use
   * @param asyncFn Async function to execute
   */
  private makeSync<T>(asyncFn: () => Promise<T>): T {
    let result: T | undefined;
    let error: unknown;
    let completed = false;

    asyncFn()
      .then(res => {
        result = res;
        completed = true;
      })
      .catch(err => {
        error = err;
        completed = true;
      });

    // Busy wait for completion (not ideal, but necessary for sync API)
    const start = Date.now();
    const timeout = 30000; // 30 second timeout

    while (!completed && (Date.now() - start) < timeout) {
      // Busy wait - empty loop body is intentional
    }

    if (!completed) {
      throw new Error('GitHub API call timed out');
    }

    if (error) {
      throw error;
    }

    if (result === undefined) {
      throw new Error('Unexpected undefined result from GitHub API call');
    }

    return result;
  }

  /**
   * Create file statistics object
   * @param content File content
   * @param lastModified Last modified date
   * @param isDirectory Is the file a directory
   */
  private createFileStats(content: string, lastModified: Date, isDirectory: boolean): FileStats {
    const size = Buffer.byteLength(content, 'utf8');
    
    return {
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isSymbolicLink: () => false, // GitHub doesn't have symlinks in this context
      size: isDirectory ? 0 : size,
      mtime: lastModified,
      ctime: lastModified, // Creation time same as modification for simplicity
      atime: lastModified, // Access time same as modification for simplicity
      mode: 0o644 // Default file permissions
    };
  }
}

/**
 * Create a new GitHub filesystem instance
 * @param options GitHub filesystem configuration
 */
export function createGitHubFileSystem(options: GitHubFileSystemOptions): GitHubFileSystem {
  return new GitHubFileSystem(options);
}
