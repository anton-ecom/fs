import { WithIdFileSystem, FileFormat } from '../src/with-id';
import { MemFileSystem } from '../src/memory';

/**
 * Demonstration of WithIdFileSystem capabilities
 */
export function demonstrateWithIdFileSystem() {
  console.log('🆔 WithIdFileSystem Demonstration\n');

  // Create filesystem with ID mapping
  const memFs = new MemFileSystem();
  const withIdFs = new WithIdFileSystem(memFs);

  console.log('1️⃣ Saving files with meaningful paths...');
  
  // Save user profile
  const userProfile = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin'
  };
  
  const profilePath = './vault/profiles/user1.json';
  withIdFs.writeFileSync(profilePath, JSON.stringify(userProfile, null, 2));
  
  // Save configuration
  const appConfig = {
    theme: 'dark',
    language: 'en',
    notifications: true
  };
  
  const configPath = './config/app.json';
  withIdFs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
  
  // Save document
  const documentContent = '# Project Documentation\n\nThis is our main project documentation.';
  const docPath = './docs/project.md';
  withIdFs.writeFileSync(docPath, documentContent);
  
  console.log('✅ Files saved with original paths\n');

  console.log('2️⃣ Generated identifiers...');
  
  // Get IDs and aliases
  const profileId = withIdFs.getId(profilePath);
  const profileAlias = withIdFs.getAlias(profilePath);
  
  const configId = withIdFs.getId(configPath);
  const configAlias = withIdFs.getAlias(configPath);
  
  const docId = withIdFs.getId(docPath);
  const docAlias = withIdFs.getAlias(docPath);
  
  console.log('User Profile:');
  console.log(`   ID: ${profileId}`);
  console.log(`   Alias: ${profileAlias}`);
  
  console.log('App Config:');
  console.log(`   ID: ${configId}`);
  console.log(`   Alias: ${configAlias}`);
  
  console.log('Documentation:');
  console.log(`   ID: ${docId}`);
  console.log(`   Alias: ${docAlias}\n`);

  console.log('Reading files using different methods...');
  
  // Read by original path
  console.log('📂 Reading by original path:');
  const profile1 = withIdFs.readFileSync(profilePath);
  console.log(`   Profile loaded: ${JSON.parse(profile1).name}`);
  
  // Read by ID
  console.log('🆔 Reading by ID:');
  const profile2 = withIdFs.getByIdOrAlias(profileId);
  console.log(`   Profile loaded: ${JSON.parse(profile2).name}`);
  
  // Read by alias  
  console.log('🏷️  Reading by alias:');
  const profile3 = withIdFs.getByIdOrAlias(profileAlias);
  console.log(`   Profile loaded: ${JSON.parse(profile3).name}`);
  
  console.log(`✅ All methods return identical content: ${profile1 === profile2 && profile2 === profile3}\n`);

  console.log('4️⃣ Format validation...');
  
  try {
    // Should work - correct format
    const configData = withIdFs.getByIdOrAlias(configId, FileFormat.JSON);
    console.log('✅ JSON format validation passed');

    // Should fail - wrong format
    withIdFs.getByIdOrAlias(configId, FileFormat.PDF);
  } catch (error: unknown) {
    console.log(`✅ Format mismatch correctly caught: ${(error as Error).message}`);
  }
  
  console.log('');

  console.log('5️⃣ File metadata and tracking...');
  
  const trackedFiles = withIdFs.listTrackedFiles();
  console.log(`📊 Currently tracking ${trackedFiles.length} files:`);
  
  for (const file of trackedFiles) {
    console.log(`   ${file.format.toUpperCase()}: ${file.alias} (${file.id.substring(0, 8)}...)`);
  }
  
  console.log('');

  console.log('6️⃣ Detailed metadata example...');
  
  const profileMetadata = withIdFs.getMetadata(profilePath);
  console.log('📋 User profile metadata:');
  console.log(`   Original Path: ${profileMetadata.originalPath}`);
  console.log(`   Stored Path: ${profileMetadata.storedPath}`);
  console.log(`   ID: ${profileMetadata.id}`);
  console.log(`   Alias: ${profileMetadata.alias}`);
  console.log(`   Format: ${profileMetadata.format}\n`);

  console.log('7️⃣ Simulating database integration...');
  
  // Simulate database records with stable file references
  const databaseRecords = {
    users: [
      {
        id: 'user1',
        name: 'John Doe',
        profileFileId: profileId, // Stable reference
        configFileId: configId
      }
    ],
    documents: [
      {
        id: 'doc1',
        title: 'Project Documentation',
        fileId: docId, // Stable reference
        alias: docAlias // Human-readable reference
      }
    ]
  };
  
  console.log('💾 Database records with stable file references:');
  console.log('👤 User record:');
  console.log(`   Profile File ID: ${databaseRecords.users[0].profileFileId}`);
  console.log(`   Config File ID: ${databaseRecords.users[0].configFileId}`);
  
  console.log('📄 Document record:');
  console.log(`   File ID: ${databaseRecords.documents[0].fileId}`);
  console.log(`   Alias: ${databaseRecords.documents[0].alias}\n`);

  console.log('8️⃣ File access by database reference...');
  
  // Load user profile by database reference
  const userRecord = databaseRecords.users[0];
  const userProfileData = withIdFs.getByIdOrAlias(userRecord.profileFileId, FileFormat.JSON);
  const parsedProfile = JSON.parse(userProfileData);
  
  console.log(`✅ Loaded user profile: ${parsedProfile.name} (${parsedProfile.email})`);
  
  // Load document by alias
  const docRecord = databaseRecords.documents[0];
  const docData = withIdFs.getByIdOrAlias(docRecord.alias, FileFormat.MD);
  
  console.log(`✅ Loaded document: "${docData.split('\\n')[0].replace('# ', '')}"`);
  console.log('');

  console.log('9️⃣ Storage format demonstration...');
  
  // Show how files are actually stored in the underlying filesystem
  console.log('💽 Underlying storage structure:');
  const storedFiles = memFs.readDirSync('./');
  
  function listStoredFiles(dir: string, indent = '') {
    try {
      const items = memFs.readDirSync(dir);
      for (const item of items) {
        const fullPath = `${dir}/${item}`.replace(/\\/g, '/');
        if (memFs.existsSync(fullPath) && !item.includes(':')) {
          // It's a directory
          console.log(`${indent}📁 ${item}/`);
          listStoredFiles(fullPath, `${indent}  `);
        } else if (item.includes(':')) {
          // It's a stored file with our format
          console.log(`${indent}📄 ${item}`);
        }
      }
    } catch {
      // Not a directory or doesn't exist
    }
  }
  
  listStoredFiles('.');
  
  console.log('');

  console.log('🔟 Testing file operations...');
  
  // Test exists
  console.log(`✅ Profile exists: ${withIdFs.existsSync(profilePath)}`);
  console.log(`✅ Non-existent file: ${withIdFs.existsSync('./nonexistent.txt')}`);
  
  // Test deletion with cleanup
  const tempPath = './temp/test.txt';
  withIdFs.writeFileSync(tempPath, 'temporary content');
  const tempId = withIdFs.getId(tempPath);
  
  console.log(`📝 Created temp file with ID: ${tempId}`);
  console.log(`📊 Files tracked before deletion: ${withIdFs.listTrackedFiles().length}`);
  
  withIdFs.deleteFileSync(tempPath);
  
  console.log(`📊 Files tracked after deletion: ${withIdFs.listTrackedFiles().length}`);
  
  try {
    withIdFs.getByIdOrAlias(tempId);
  } catch (error: unknown) {
    console.log(`✅ Deleted file ID no longer accessible: ${(error as Error).message.includes('File not found')}`);
  }

  console.log('\n✨ WithIdFileSystem demonstration complete!');
  console.log('💡 Key benefits demonstrated:');
  console.log('   • Deterministic IDs for stable database references');
  console.log('   • Human-readable aliases for developer convenience');
  console.log('   • Format validation for type safety');
  console.log('   • Seamless integration with existing filesystem patterns');
  console.log('   • Automatic metadata management and cleanup');
}

// Run the demo
demonstrateWithIdFileSystem();
