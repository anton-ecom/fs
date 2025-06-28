/**
 * S3FileSystem Real-Life Example
 * 
 * This example demonstrates how to use S3FileSystem for a cloud-native file storage
 * service that handles user uploads, configuration management, and data processing
 * with both local and cloud environments.
 */

import { S3FileSystem } from '../s3';
import { S3FileSystem as AsyncS3FileSystem } from '../promises/s3';

// Environment-aware configuration
interface AppConfig {
  storage: 'local' | 's3';
  aws?: {
    region: string;
    bucket: string;
    prefix?: string;
  };
}

// Document metadata interface
interface DocumentMetadata {
  originalName: string;
  uploadDate: string;
  userId: string;
  department?: string;
  category?: string;
  confidential?: boolean;
  [key: string]: unknown;
}

/**
 * Document Storage Service
 * 
 * Handles user document uploads with automatic organization,
 * metadata tracking, and efficient retrieval.
 */
class DocumentStorageService {
  private fs: S3FileSystem;
  private asyncFs: AsyncS3FileSystem;

  constructor(config: AppConfig['aws']) {
    if (!config) {
      throw new Error('AWS configuration required for S3 storage');
    }

    // Sync filesystem for simple operations
    this.fs = new S3FileSystem({
      region: config.region,
      bucket: config.bucket,
      prefix: config.prefix || 'documents/',
      // Uses default AWS credentials from environment/IAM role
    });

    // Async filesystem for heavy operations
    this.asyncFs = new AsyncS3FileSystem({
      region: config.region,
      bucket: config.bucket,
      prefix: config.prefix || 'documents/',
    });

    console.log(`📁 Document storage initialized: s3://${config.bucket}/${config.prefix || ''}`);
  }

  /**
   * Upload user document with automatic organization
   */
  async uploadDocument(
    userId: string,
    filename: string,
    content: string | Buffer,
    metadata?: Partial<DocumentMetadata>
  ): Promise<{ path: string; url: string; size: number }> {
    // Organize files by user and date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const documentPath = `users/${userId}/${date}/${sanitizedFilename}`;

    try {
      // Upload document
      await this.asyncFs.writeFile(documentPath, content.toString());
      
      // Store metadata separately
      if (metadata) {
        const metadataPath = `${documentPath}.meta`;
        await this.asyncFs.writeFile(metadataPath, JSON.stringify({
          originalName: filename,
          uploadDate: new Date().toISOString(),
          userId,
          ...metadata
        }, null, 2));
      }

      // Get file stats
      const stats = await this.asyncFs.stat(documentPath);
      
      console.log(`📄 Document uploaded: ${documentPath} (${stats.size} bytes)`);
      
      return {
        path: documentPath,
        url: `https://${this.fs.getBucketInfo().bucket}.s3.${this.fs.getBucketInfo().region}.amazonaws.com/${documentPath}`,
        size: stats.size
      };

    } catch (error) {
      console.error(`❌ Failed to upload document: ${error}`);
      throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve document with metadata
   */
  async getDocument(path: string): Promise<{ content: string; metadata?: DocumentMetadata }> {
    try {
      const content = await this.asyncFs.readFile(path);
      
      // Try to load metadata
      let metadata: DocumentMetadata | undefined;
      try {
        const metadataContent = await this.asyncFs.readFile(`${path}.meta`);
        metadata = JSON.parse(metadataContent) as DocumentMetadata;
      } catch {
        // Metadata file doesn't exist - that's okay
      }

      return { content, metadata };
    } catch (error) {
      throw new Error(`Failed to retrieve document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List user documents with pagination
   */
  async listUserDocuments(userId: string, page = 1, pageSize = 20): Promise<{
    documents: Array<{ path: string; size: number; lastModified: Date; metadata?: DocumentMetadata }>;
    total: number;
    hasMore: boolean;
  }> {
    try {
      const userPath = `users/${userId}/`;
      const allFiles = await this.asyncFs.readDir(userPath);
      
      // Filter out metadata files and get document files only
      const documentFiles = allFiles
        .filter(file => !file.endsWith('.meta'))
        .sort()
        .reverse(); // Most recent first

      const total = documentFiles.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageFiles = documentFiles.slice(startIndex, endIndex);

      // Get stats and metadata for each file
      const documents = await Promise.all(
        pageFiles.map(async (file) => {
          const fullPath = `${userPath}${file}`;
          const stats = await this.asyncFs.stat(fullPath);
          
          // Try to load metadata
          let metadata: DocumentMetadata | undefined;
          try {
            const metadataContent = await this.asyncFs.readFile(`${fullPath}.meta`);
            metadata = JSON.parse(metadataContent) as DocumentMetadata;
          } catch {
            // No metadata
          }

          return {
            path: fullPath,
            size: stats.size,
            lastModified: stats.mtime,
            metadata
          };
        })
      );

      return {
        documents,
        total,
        hasMore: endIndex < total
      };

    } catch (error) {
      throw new Error(`Failed to list documents for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete document and its metadata
   */
  async deleteDocument(path: string): Promise<void> {
    try {
      await this.asyncFs.deleteFile(path);
      
      // Try to delete metadata file
      try {
        await this.asyncFs.deleteFile(`${path}.meta`);
      } catch {
        // Metadata file might not exist
      }

      console.log(`🗑️ Document deleted: ${path}`);
    } catch (error) {
      throw new Error(`Failed to delete document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage statistics
   */
  getStorageInfo(): { bucket: string; region: string; prefix: string } {
    return this.fs.getBucketInfo();
  }

  /**
   * Clear cache to free memory (useful for long-running services)
   */
  clearCache(): void {
    this.fs.clearCache();
    this.asyncFs.clearCache();
    console.log('💾 Storage cache cleared');
  }
}

/**
 * Configuration Management Service
 * 
 * Manages application configuration files stored in S3 with
 * environment-specific organization and automatic fallbacks.
 */
class ConfigurationService {
  private fs: S3FileSystem;

  constructor(bucket: string, region: string, environment: string) {
    this.fs = new S3FileSystem({
      region,
      bucket,
      prefix: `config/${environment}/`
    });
  }

  /**
   * Load configuration with fallback to defaults
   */
  async loadConfig<T>(name: string, defaultValue: T): Promise<T> {
    const configPath = `${name}.json`;
    
    try {
      if (this.fs.existsSync(configPath)) {
        const content = this.fs.readFileSync(configPath);
        const config = JSON.parse(content);
        console.log(`⚙️ Loaded config: ${name}`);
        return { ...defaultValue, ...config };
      }
      
      // Save default config for future use
      await this.saveConfig(name, defaultValue);
      console.log(`⚙️ Created default config: ${name}`);
      return defaultValue;
    } catch (error) {
      console.warn(`⚠️ Failed to load config ${name}, using defaults: ${error}`);
      return defaultValue;
    }
  }

  /**
   * Save configuration
   */
  async saveConfig<T>(name: string, config: T): Promise<void> {
    const configPath = `${name}.json`;
    
    try {
      const content = JSON.stringify(config, null, 2);
      this.fs.writeFileSync(configPath, content);
      console.log(`💾 Saved config: ${name}`);
    } catch (error) {
      throw new Error(`Failed to save config ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all configuration files
   */
  listConfigs(): string[] {
    try {
      return this.fs.readDirSync('.')
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.warn(`⚠️ Failed to list configs: ${error}`);
      return [];
    }
  }
}

/**
 * Example Usage
 */
async function exampleUsage() {
  const config: AppConfig = {
    storage: 's3',
    aws: {
      region: 'us-east-1',
      bucket: 'my-app-storage',
      prefix: 'production/'
    }
  };

  // Initialize services
  const documentService = new DocumentStorageService(config.aws);
  const configService = new ConfigurationService(
    config.aws?.bucket || 'default-bucket', 
    config.aws?.region || 'us-east-1', 
    'production'
  );

  try {
    // Configuration management
    const appConfig = await configService.loadConfig('app', {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['pdf', 'docx', 'txt'],
      retentionDays: 90
    });

    console.log('📋 App configuration:', appConfig);

    // Document operations
    const userId = 'user123';
    
    // Upload a document
    const uploadResult = await documentService.uploadDocument(
      userId,
      'report.pdf',
      'This is a sample PDF content...',
      {
        department: 'sales',
        category: 'report',
        confidential: true
      }
    );

    console.log('📤 Upload result:', uploadResult);

    // List user documents
    const userDocs = await documentService.listUserDocuments(userId);
    console.log(`📁 Found ${userDocs.total} documents for user ${userId}`);

    // Retrieve a document
    const document = await documentService.getDocument(uploadResult.path);
    console.log('📄 Retrieved document with metadata:', {
      contentLength: document.content.length,
      metadata: document.metadata
    });

    // Storage info
    const storageInfo = documentService.getStorageInfo();
    console.log('☁️ Storage info:', storageInfo);

  } catch (error) {
    console.error('❌ Example failed:', error);
  }

  // Cleanup
  documentService.clearCache();
}

/**
 * Environment-specific initialization
 */
function createFileSystemForEnvironment(): S3FileSystem | null {
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production' || environment === 'staging') {
    // Use S3 in cloud environments
    return new S3FileSystem({
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'app-storage',
      prefix: `${environment}/`
    });
  }
  
  // Use local filesystem for development
  console.log('🏠 Using local filesystem for development');
  return null; // Would use NodeFileSystem instead
}

// Export services for use in other modules
export {
  DocumentStorageService,
  ConfigurationService,
  createFileSystemForEnvironment,
  exampleUsage
};

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}
