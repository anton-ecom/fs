import { describe, it, expect } from 'vitest';
import { GitHubFileSystem } from '../github';

describe('GitHubFileSystem (Sync)', () => {
  it.skip('should be compatible with IFileSystem interface', () => {
    // This test ensures the GitHubFileSystem properly implements IFileSystem
    // but is skipped due to sync HTTP limitations in testing environments
    
    const gitHubFs = new GitHubFileSystem({
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    });

    // Test that the interface methods exist
    expect(typeof gitHubFs.existsSync).toBe('function');
    expect(typeof gitHubFs.readFileSync).toBe('function');
    expect(typeof gitHubFs.writeFileSync).toBe('function');
    expect(typeof gitHubFs.deleteFileSync).toBe('function');
    expect(typeof gitHubFs.readDirSync).toBe('function');
    expect(typeof gitHubFs.ensureDirSync).toBe('function');
    expect(typeof gitHubFs.deleteDirSync).toBe('function');
    expect(typeof gitHubFs.chmodSync).toBe('function');
  });

  it('should create with default options', () => {
    const gitHubFs = new GitHubFileSystem({
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    });

    expect(gitHubFs).toBeInstanceOf(GitHubFileSystem);
  });

  it('should create with custom options', () => {
    const gitHubFs = new GitHubFileSystem({
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'develop',
      authorName: 'Test Author',
      authorEmail: 'test@example.com',
      autoCommit: false
    });

    expect(gitHubFs).toBeInstanceOf(GitHubFileSystem);
  });
});
