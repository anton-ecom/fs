import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { GitHubFileSystem } from '../promises/github';

// Mock GitHub API server
const server = setupServer();

// Mock repository data
const mockRepo = {
  owner: 'test-owner',
  repo: 'test-repo',
  branch: 'main'
};

const mockFiles = new Map<string, { content: string; sha: string }>();

// GitHub API mocks
const githubHandlers = [
  // Get file content
  http.get('https://api.github.com/repos/:owner/:repo/contents/:path', ({ params, request }) => {
    const { owner, repo, path } = params;
    const url = new URL(request.url);
    const ref = url.searchParams.get('ref');
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo || ref !== mockRepo.branch) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const filePath = path as string;
    const file = mockFiles.get(filePath);
    
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json({
      content: Buffer.from(file.content).toString('base64'),
      sha: file.sha,
      path: filePath,
      type: 'file'
    });
  }),

  // Create or update file
  http.put('https://api.github.com/repos/:owner/:repo/contents/:path', async ({ params, request }) => {
    const { owner, repo, path } = params;
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const body = await request.json() as {
      content: string;
      message: string;
      sha?: string;
      branch: string;
    };
    
    const filePath = path as string;
    const content = Buffer.from(body.content, 'base64').toString('utf8');
    const newSha = `sha_${Math.random().toString(36).substr(2, 9)}`;
    
    mockFiles.set(filePath, { content, sha: newSha });
    
    return HttpResponse.json({
      content: {
        sha: newSha,
        path: filePath
      },
      commit: {
        sha: `commit_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }),

  // Delete file
  http.delete('https://api.github.com/repos/:owner/:repo/contents/:path', async ({ params, request }) => {
    const { owner, repo, path } = params;
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const body = await request.json() as {
      message: string;
      sha: string;
      branch: string;
    };
    
    const filePath = path as string;
    const file = mockFiles.get(filePath);
    
    if (!file || file.sha !== body.sha) {
      return new HttpResponse(null, { status: 404 });
    }
    
    mockFiles.delete(filePath);
    
    return HttpResponse.json({
      commit: {
        sha: `commit_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }),

  // List directory contents
  http.get('https://api.github.com/repos/:owner/:repo/contents', ({ params, request }) => {
    const { owner, repo } = params;
    const url = new URL(request.url);
    const ref = url.searchParams.get('ref');
    const path = url.searchParams.get('path') || '';
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo || ref !== mockRepo.branch) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const files = Array.from(mockFiles.keys())
      .filter(filePath => {
        if (path === '') return !filePath.includes('/');
        return filePath.startsWith(`${path}/`) && filePath.split('/').length === path.split('/').length + 1;
      })
      .map(filePath => ({
        name: filePath.split('/').pop(),
        path: filePath,
        type: 'file',
        sha: mockFiles.get(filePath)?.sha
      }));
    
    return HttpResponse.json(files);
  }),

  // Get repository info
  http.get('https://api.github.com/repos/:owner/:repo', ({ params }) => {
    const { owner, repo } = params;
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json({
      size: 150,
      default_branch: mockRepo.branch
    });
  }),

  // List commits
  http.get('https://api.github.com/repos/:owner/:repo/commits', ({ params, request }) => {
    const { owner, repo } = params;
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const commits = [
      {
        sha: 'commit_abc123',
        commit: {
          message: 'Initial commit',
          author: {
            name: 'Test Author',
            date: '2023-01-01T00:00:00Z'
          }
        }
      },
      {
        sha: 'commit_def456',
        commit: {
          message: `Update ${path || 'files'}`,
          author: {
            name: 'Test Author',
            date: '2023-01-02T00:00:00Z'
          }
        }
      }
    ];
    
    return HttpResponse.json(commits);
  }),

  // Get tree
  http.get('https://api.github.com/repos/:owner/:repo/git/trees/:tree_sha', ({ params }) => {
    const { owner, repo } = params;
    
    if (owner !== mockRepo.owner || repo !== mockRepo.repo) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const tree = Array.from(mockFiles.keys()).map(path => ({
      path,
      type: 'blob',
      sha: mockFiles.get(path)?.sha
    }));
    
    return HttpResponse.json({
      tree
    });
  })
];

describe('GitHubFileSystem (Async)', () => {
  let gitHubFs: GitHubFileSystem;

  beforeAll(() => {
    server.use(...githubHandlers);
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    mockFiles.clear();
    gitHubFs = new GitHubFileSystem({
      token: 'test-token',
      owner: mockRepo.owner,
      repo: mockRepo.repo,
      branch: mockRepo.branch
    });
  });

  describe('basic file operations', () => {
    it('should write and read a file', async () => {
      const testContent = 'Hello, GitHub!';
      const testPath = 'test.txt';

      await gitHubFs.writeFile(testPath, testContent);
      expect(mockFiles.has(testPath)).toBe(true);
      expect(mockFiles.get(testPath)?.content).toBe(testContent);

      const readContent = await gitHubFs.readFile(testPath);
      expect(readContent).toBe(testContent);
    });

    it('should check file existence', async () => {
      const testPath = 'exists.txt';
      
      expect(await gitHubFs.exists(testPath)).toBe(false);
      
      await gitHubFs.writeFile(testPath, 'content');
      expect(await gitHubFs.exists(testPath)).toBe(true);
    });

    it('should delete a file', async () => {
      const testPath = 'delete-me.txt';
      
      await gitHubFs.writeFile(testPath, 'content');
      expect(await gitHubFs.exists(testPath)).toBe(true);
      
      await gitHubFs.deleteFile(testPath);
      expect(await gitHubFs.exists(testPath)).toBe(false);
      expect(mockFiles.has(testPath)).toBe(false);
    });

    it('should handle file not found gracefully', async () => {
      await expect(gitHubFs.readFile('nonexistent.txt'))
        .rejects.toThrow('File not found: nonexistent.txt');
    });
  });

  describe('directory operations', () => {
    it('should handle ensureDir as no-op', async () => {
      await expect(gitHubFs.ensureDir('test/dir')).resolves.not.toThrow();
    });

    it('should list directory contents', async () => {
      await gitHubFs.writeFile('file1.txt', 'content1');
      await gitHubFs.writeFile('file2.txt', 'content2');
      await gitHubFs.writeFile('subdir/file3.txt', 'content3');

      const rootFiles = await gitHubFs.readDir('');
      expect(rootFiles).toContain('file1.txt');
      expect(rootFiles).toContain('file2.txt');
      expect(rootFiles).not.toContain('file3.txt'); // In subdirectory
    });

    it('should not support directory deletion', async () => {
      await expect(gitHubFs.deleteDir('test/dir'))
        .rejects.toThrow('GitHub filesystem does not support directory deletion');
    });
  });

  describe('caching behavior', () => {
    it('should cache file content after first read', async () => {
      const testPath = 'cached.txt';
      const testContent = 'cached content';
      
      await gitHubFs.writeFile(testPath, testContent);
      
      // First read should hit GitHub API
      const content1 = await gitHubFs.readFile(testPath);
      expect(content1).toBe(testContent);
      
      // Second read should use cache
      const content2 = await gitHubFs.readFile(testPath);
      expect(content2).toBe(testContent);
    });

    it('should clear cache', async () => {
      await gitHubFs.writeFile('test.txt', 'content');
      await gitHubFs.readFile('test.txt'); // Populate cache
      
      gitHubFs.clearCache();
      
      // Should still work after cache clear
      const content = await gitHubFs.readFile('test.txt');
      expect(content).toBe('content');
    });
  });

  describe('version control features', () => {
    it('should get file history', async () => {
      const testPath = 'versioned.txt';
      await gitHubFs.writeFile(testPath, 'version 1');
      
      const history = await gitHubFs.getFileHistory(testPath);
      expect(history).toHaveLength(2);
      expect(history[0].message).toContain('Initial commit');
      expect(history[0].author).toBe('Test Author');
      expect(history[0].sha).toBe('commit_abc123');
    });

    it('should get repository statistics', async () => {
      await gitHubFs.writeFile('file1.txt', 'content1');
      await gitHubFs.writeFile('file2.txt', 'content2');
      
      const stats = await gitHubFs.getRepositoryStats();
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalCommits).toBe(150);
      expect(stats.lastCommit).toBe('Initial commit');
    });
  });

  describe('configuration and metadata', () => {
    it('should return repository information', () => {
      const info = gitHubFs.getRepositoryInfo();
      expect(info).toEqual({
        owner: mockRepo.owner,
        repo: mockRepo.repo,
        branch: mockRepo.branch
      });
    });

    it('should create filesystem with custom options', () => {
      const customFs = new GitHubFileSystem({
        token: 'custom-token',
        owner: 'custom-owner',
        repo: 'custom-repo',
        branch: 'develop',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        autoCommit: false
      });

      const info = customFs.getRepositoryInfo();
      expect(info.owner).toBe('custom-owner');
      expect(info.repo).toBe('custom-repo');
      expect(info.branch).toBe('develop');
    });
  });

  describe('error handling', () => {
    it('should handle invalid repository', async () => {
      const invalidFs = new GitHubFileSystem({
        token: 'test-token',
        owner: 'invalid-owner',
        repo: 'invalid-repo'
      });

      await expect(invalidFs.readFile('test.txt'))
        .rejects.toThrow('File not found: test.txt');
    });

    it('should handle permission errors gracefully', async () => {
      // chmod is a no-op for GitHub
      await expect(gitHubFs.chmod('test.txt', 755)).resolves.not.toThrow();
    });
  });

  describe('path normalization', () => {
    it('should normalize paths correctly', async () => {
      const testContent = 'normalized';
      
      // Test various path formats
      await gitHubFs.writeFile('./test.txt', testContent);
      await gitHubFs.writeFile('/another.txt', testContent);
      await gitHubFs.writeFile('folder//file.txt', testContent);
      
      expect(await gitHubFs.readFile('test.txt')).toBe(testContent);
      expect(await gitHubFs.readFile('another.txt')).toBe(testContent);
      expect(await gitHubFs.readFile('folder/file.txt')).toBe(testContent);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file content', async () => {
      const testPath = 'empty.txt';
      await gitHubFs.writeFile(testPath, '');
      
      const content = await gitHubFs.readFile(testPath);
      expect(content).toBe('');
    });

    it('should handle special characters in content', async () => {
      const testPath = 'special.txt';
      const specialContent = '🚀 Unicode & special chars: "quotes" \\backslash\n\t\r';
      
      await gitHubFs.writeFile(testPath, specialContent);
      const readContent = await gitHubFs.readFile(testPath);
      expect(readContent).toBe(specialContent);
    });

    it('should handle deleting non-existent file', async () => {
      await expect(gitHubFs.deleteFile('nonexistent.txt')).resolves.not.toThrow();
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        gitHubFs.writeFile('concurrent1.txt', 'content1'),
        gitHubFs.writeFile('concurrent2.txt', 'content2'),
        gitHubFs.writeFile('concurrent3.txt', 'content3')
      ];
      
      await Promise.all(promises);
      
      expect(await gitHubFs.readFile('concurrent1.txt')).toBe('content1');
      expect(await gitHubFs.readFile('concurrent2.txt')).toBe('content2');
      expect(await gitHubFs.readFile('concurrent3.txt')).toBe('content3');
    });
  });

  describe('autoCommit behavior', () => {
    it('should auto-commit by default', async () => {
      const testPath = 'auto-commit.txt';
      await gitHubFs.writeFile(testPath, 'auto-committed');
      
      // File should be in mock storage (committed)
      expect(mockFiles.has(testPath)).toBe(true);
    });

    it('should respect autoCommit=false', async () => {
      const fsNoCommit = new GitHubFileSystem({
        token: 'test-token',
        owner: mockRepo.owner,
        repo: mockRepo.repo,
        autoCommit: false
      });
      
      const testPath = 'no-commit.txt';
      await fsNoCommit.writeFile(testPath, 'not-committed');
      
      // File should not be in mock storage (not committed)
      expect(mockFiles.has(testPath)).toBe(false);
    });
  });

  describe('file statistics', () => {
    it('should get file stats', async () => {
      const content = 'file stats test content';
      const path = 'stats-test.txt';
      
      await gitHubFs.writeFile(path, content);
      const stats = await gitHubFs.stat(path);
      
      expect(stats).toBeDefined();
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.isSymbolicLink()).toBe(false);
      expect(stats.size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(stats.mtime).toBeInstanceOf(Date);
      expect(stats.ctime).toBeInstanceOf(Date);
      expect(stats.atime).toBeInstanceOf(Date);
      expect(typeof stats.mode).toBe('number');
    });

    it('should handle file stats with nested paths', async () => {
      // Write files with nested paths
      await gitHubFs.writeFile('testdir/file1.txt', 'content1');
      
      // Test getting stats for the nested file
      const fileStats = await gitHubFs.stat('testdir/file1.txt');
      
      expect(fileStats).toBeDefined();
      expect(fileStats.isFile()).toBe(true);
      expect(fileStats.isDirectory()).toBe(false);
      expect(fileStats.size).toBe(Buffer.byteLength('content1', 'utf8'));
      expect(fileStats.mtime).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent file stats', async () => {
      await expect(gitHubFs.stat('non-existent-stats.txt'))
        .rejects.toThrow('File not found: non-existent-stats.txt');
    });

    it('should return cached file stats on second call', async () => {
      const content = 'cached stats test';
      const path = 'cached-stats.txt';
      
      await gitHubFs.writeFile(path, content);
      
      const stats1 = await gitHubFs.stat(path);
      const stats2 = await gitHubFs.stat(path);
      
      expect(stats1.size).toBe(stats2.size);
      expect(stats1.mtime.getTime()).toBe(stats2.mtime.getTime());
    });
  });
});
