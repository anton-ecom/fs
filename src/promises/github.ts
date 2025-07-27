import { Octokit } from "@octokit/rest";
import type { FileStats, IAsyncFileSystem } from "./filesystem.interface";
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
 * Async GitHub-based filesystem implementation
 *
 * Stores files in a GitHub repository with automatic version control.
 * Each write operation creates a commit, providing built-in versioning
 * and collaboration features.
 */
export class GitHubFileSystem implements IAsyncFileSystem {
  private octokit: Octokit;
  private options: Required<GitHubFileSystemOptions>;
  private cache = new Map<string, FileCache>();

  constructor(options: GitHubFileSystemOptions) {
    this.options = {
      branch: "main",
      authorName: "GitHubFileSystem",
      authorEmail: "noreply@github.com",
      autoCommit: true,
      ...options,
    };

    this.octokit = new Octokit({
      auth: this.options.token,
    });
  }

  /**
   * Check if a file exists in the repository
   * @param path File path in the repository
   */
  async exists(path: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.cache.has(path)) {
        return true;
      }

      // Fetch from GitHub
      const response = await this.octokit.rest.repos.getContent({
        owner: this.options.owner,
        repo: this.options.repo,
        path: this.normalizePath(path),
        ref: this.options.branch,
      });

      if (
        response &&
        "content" in response.data &&
        typeof response.data.content === "string"
      ) {
        // Cache the file
        this.cache.set(path, {
          content: Buffer.from(response.data.content, "base64").toString(
            "utf8",
          ),
          sha: response.data.sha,
          path: this.normalizePath(path),
        });
        return true;
      }

      return false;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
        return false;
      }
      throw new Error(`Failed to check file existence for ${path}: ${error}`);
    }
  }

  /**
   * Read a file from the repository
   * @param path File path in the repository
   */
  async readFile(path: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.cache.get(path);
      if (cached) {
        return cached.content;
      }

      // Fetch from GitHub
      const response = await this.octokit.rest.repos.getContent({
        owner: this.options.owner,
        repo: this.options.repo,
        path: this.normalizePath(path),
        ref: this.options.branch,
      });

      if (
        !response ||
        !("content" in response.data) ||
        typeof response.data.content !== "string"
      ) {
        throw new Error(
          `File ${path} is not a regular file or content is not available`,
        );
      }

      const content = Buffer.from(response.data.content, "base64").toString(
        "utf8",
      );

      // Cache the file
      this.cache.set(path, {
        content,
        sha: response.data.sha,
        path: this.normalizePath(path),
      });

      return content;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  }

  /**
   * Write a file to the repository
   * @param path File path in the repository
   * @param data File content
   */
  async writeFile(path: string, data: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);

      // Get current file info if it exists
      const cached = this.cache.get(path);
      let sha: string | undefined = cached?.sha;

      // If not cached, try to get the current SHA
      if (!sha) {
        try {
          const response = await this.octokit.rest.repos.getContent({
            owner: this.options.owner,
            repo: this.options.repo,
            path: normalizedPath,
            ref: this.options.branch,
          });

          if (response && "sha" in response.data) {
            sha = response.data.sha;
          }
        } catch (error) {
          // File doesn't exist, that's okay for new files
        }
      }

      if (this.options.autoCommit) {
        // Create or update file with commit
        const response =
          await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.options.owner,
            repo: this.options.repo,
            path: normalizedPath,
            message: `Update ${path}`,
            content: Buffer.from(data).toString("base64"),
            branch: this.options.branch,
            sha: sha,
            author: {
              name: this.options.authorName,
              email: this.options.authorEmail,
            },
            committer: {
              name: this.options.authorName,
              email: this.options.authorEmail,
            },
          });

        // Update cache with new SHA
        this.cache.set(path, {
          content: data,
          sha: response.data.content?.sha || sha || "",
          path: normalizedPath,
        });
      } else {
        // Just update cache
        this.cache.set(path, {
          content: data,
          sha: sha || "",
          path: normalizedPath,
        });
      }
    } catch (error: unknown) {
      throw new Error(`Failed to write file ${path}: ${error}`);
    }
  }

  /**
   * Delete a file from the repository
   * @param path File path in the repository
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);

      // Get current file SHA
      let sha: string | undefined = this.cache.get(path)?.sha;

      if (!sha) {
        const response = await this.octokit.rest.repos.getContent({
          owner: this.options.owner,
          repo: this.options.repo,
          path: normalizedPath,
          ref: this.options.branch,
        });

        if (!response || !("sha" in response.data)) {
          throw new Error(`File ${path} not found or cannot be deleted`);
        }

        sha = response.data.sha;
      }

      // Delete the file
      await this.octokit.rest.repos.deleteFile({
        owner: this.options.owner,
        repo: this.options.repo,
        path: normalizedPath,
        message: `Delete ${path}`,
        sha: sha as string,
        branch: this.options.branch,
        author: {
          name: this.options.authorName,
          email: this.options.authorEmail,
        },
        committer: {
          name: this.options.authorName,
          email: this.options.authorEmail,
        },
      });

      // Remove from cache
      this.cache.delete(path);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
        // File already doesn't exist, that's fine
        return;
      }
      throw new Error(`Failed to delete file ${path}: ${error}`);
    }
  }

  /**
   * Delete a directory (not supported - GitHub doesn't have empty directories)
   * @param path Directory path
   */
  async deleteDir(path: string): Promise<void> {
    throw new Error(
      "GitHub filesystem does not support directory deletion. Delete individual files instead.",
    );
  }

  /**
   * Ensure a directory exists (no-op - GitHub creates directories implicitly)
   * @param dirPath Directory path
   */
  async ensureDir(dirPath: string): Promise<void> {
    // GitHub creates directories implicitly when files are added
    // This is a no-op for compatibility
  }

  /**
   * Read directory contents
   * @param dirPath Directory path
   */
  async readDir(dirPath: string): Promise<string[]> {
    try {
      const normalizedPath = this.normalizePath(dirPath);

      const response = await this.octokit.rest.repos.getContent({
        owner: this.options.owner,
        repo: this.options.repo,
        path: normalizedPath,
        ref: this.options.branch,
      });

      if (!response || !Array.isArray(response.data)) {
        return [];
      }

      return response.data
        .filter((item) => item.type === "file")
        .map((item) => item.name);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
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
  async chmod(path: string, mode: number): Promise<void> {
    // GitHub doesn't support file permissions
    // This is a no-op for compatibility
  }

  /**
   * Get file statistics
   * @param path File path
   */
  async stat(path: string): Promise<FileStats> {
    try {
      const normalizedPath = this.normalizePath(path);

      // Check cache first
      const cached = this.cache.get(path);
      if (cached) {
        return this.createFileStats(cached.content, new Date(), false);
      }

      // Fetch from GitHub
      const response = await this.octokit.rest.repos.getContent({
        owner: this.options.owner,
        repo: this.options.repo,
        path: normalizedPath,
        ref: this.options.branch,
      });

      const isDirectory = Array.isArray(response.data);

      if (isDirectory) {
        return this.createFileStats("", new Date(), true);
      }

      if (
        "content" in response.data &&
        typeof response.data.content === "string"
      ) {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf8",
        );

        // Cache the file
        this.cache.set(path, {
          content,
          sha: response.data.sha,
          path: normalizedPath,
        });

        // Try to get more accurate timestamp from commits
        try {
          const commits = await this.octokit.rest.repos.listCommits({
            owner: this.options.owner,
            repo: this.options.repo,
            path: normalizedPath,
            per_page: 1,
          });

          const lastModified =
            commits.data.length > 0
              ? new Date(commits.data[0].commit.committer?.date || new Date())
              : new Date();

          return this.createFileStats(content, lastModified, false);
        } catch {
          // Fallback to current date if commit history fails
          return this.createFileStats(content, new Date(), false);
        }
      }

      throw new Error(`Unable to get stats for ${path}`);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
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
      branch: this.options.branch,
    };
  }

  /**
   * Get commit history for a file
   */
  async getFileHistory(
    path: string,
    options?: { perPage?: number; page?: number },
  ): Promise<
    Array<{
      sha: string;
      message: string;
      author: string;
      date: string;
    }>
  > {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner: this.options.owner,
        repo: this.options.repo,
        path: this.normalizePath(path),
        per_page: options?.perPage || 30,
        page: options?.page || 1,
      });

      return response.data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        date: commit.commit.author?.date || "",
      }));
    } catch (error: unknown) {
      throw new Error(`Failed to get file history for ${path}: ${error}`);
    }
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(): Promise<{
    totalFiles: number;
    totalCommits: number;
    lastCommit: string;
  }> {
    try {
      // Get repository info
      const repoResponse = await this.octokit.rest.repos.get({
        owner: this.options.owner,
        repo: this.options.repo,
      });

      // Get commits
      const commitsResponse = await this.octokit.rest.repos.listCommits({
        owner: this.options.owner,
        repo: this.options.repo,
        per_page: 1,
      });

      // Get tree to count files
      const treeResponse = await this.octokit.rest.git.getTree({
        owner: this.options.owner,
        repo: this.options.repo,
        tree_sha: this.options.branch,
        recursive: "true",
      });

      const totalFiles = treeResponse.data.tree.filter(
        (item) => item.type === "blob",
      ).length;
      const lastCommit = commitsResponse.data[0]?.commit.message || "";

      return {
        totalFiles,
        totalCommits: repoResponse.data.size || 0,
        lastCommit,
      };
    } catch (error: unknown) {
      throw new Error(`Failed to get repository stats: ${error}`);
    }
  }

  /**
   * Normalize file path for GitHub API
   * @param path Input path
   */
  private normalizePath(path: string): string {
    // Remove leading slashes and normalize
    return path.replace(/^\.?\/+/, "").replace(/\/+/g, "/");
  }

  /**
   * Create file statistics object
   * @param content File content
   * @param lastModified Last modified date
   * @param isDirectory Is the file a directory
   */
  private createFileStats(
    content: string,
    lastModified: Date,
    isDirectory: boolean,
  ): FileStats {
    const size = Buffer.byteLength(content, "utf8");

    return {
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isSymbolicLink: () => false, // GitHub doesn't have symlinks in this context
      size: isDirectory ? 0 : size,
      mtime: lastModified,
      ctime: lastModified, // Creation time same as modification for simplicity
      atime: lastModified, // Access time same as modification for simplicity
      mode: 0o644, // Default file permissions
    };
  }
}

/**
 * Create a new async GitHub filesystem instance
 * @param options GitHub filesystem configuration
 */
export function createGitHubFileSystem(
  options: GitHubFileSystemOptions,
): GitHubFileSystem {
  return new GitHubFileSystem(options);
}
