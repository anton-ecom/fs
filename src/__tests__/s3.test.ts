import { describe, expect, test, beforeEach, vi } from 'vitest';
import { S3FileSystem } from '../s3';

// Mock AWS SDK
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockSend
  })),
  GetObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn()
}));

describe('S3FileSystem (Sync)', () => {
  let s3FileSystem: S3FileSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockClear();
    
    s3FileSystem = new S3FileSystem({
      region: 'us-east-1',
      bucket: 'test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret'
    });
  });

  describe('interface compliance', () => {
    test('should implement IFileSystem interface', () => {
      // Test that all required methods exist
      expect(typeof s3FileSystem.existsSync).toBe('function');
      expect(typeof s3FileSystem.readFileSync).toBe('function');
      expect(typeof s3FileSystem.writeFileSync).toBe('function');
      expect(typeof s3FileSystem.deleteFileSync).toBe('function');
      expect(typeof s3FileSystem.readDirSync).toBe('function');
      expect(typeof s3FileSystem.ensureDirSync).toBe('function');
      expect(typeof s3FileSystem.deleteDirSync).toBe('function');
      expect(typeof s3FileSystem.chmodSync).toBe('function');
      expect(typeof s3FileSystem.statSync).toBe('function');
    });

    test('should create with required configuration', () => {
      expect(() => new S3FileSystem({
        region: 'us-west-2',
        bucket: 'another-bucket'
      })).not.toThrow();
    });

    test('should provide bucket info', () => {
      const info = s3FileSystem.getBucketInfo();
      expect(info.bucket).toBe('test-bucket');
      expect(info.region).toBe('us-east-1');
      expect(info.prefix).toBe('');
    });

    test('should handle cache operations', () => {
      expect(() => s3FileSystem.clearCache()).not.toThrow();
    });
  });

  // Note: The sync methods use a busy-wait implementation that doesn't work well in test environments
  // For comprehensive testing, use the async version tests in s3.async.test.ts
  describe('basic operations (interface only)', () => {
    test('should have ensureDir as no-op', () => {
      expect(() => s3FileSystem.ensureDirSync('some/path')).not.toThrow();
    });

    test('should have chmod as no-op', () => {
      expect(() => s3FileSystem.chmodSync('some/file', 0o755)).not.toThrow();
    });
  });
});
