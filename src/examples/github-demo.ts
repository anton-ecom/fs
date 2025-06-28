import { GitHubFileSystem } from '../github';
import { GitHubFileSystem as AsyncGitHubFileSystem } from '../promises/github';

/**
 * Demonstration of GitHubFileSystem capabilities
 * 
 * This example shows how to use GitHub as a file storage system
 * for configuration management, document storage, and version control.
 */
export async function demonstrateGitHubFileSystem() {
  console.log('📁 GitHubFileSystem Demonstration\n');

  // Note: In a real application, use environment variables
  const mockOptions = {
    token: 'ghp_mock_token_for_demo',
    owner: 'mycompany',
    repo: 'app-config',
    branch: 'main',
    authorName: 'Config Manager',
    authorEmail: 'config@mycompany.com'
  };

  console.log('🚀 Creating GitHub filesystem instances...');
  const syncFs = new GitHubFileSystem(mockOptions);
  const asyncFs = new AsyncGitHubFileSystem(mockOptions);

  const repoInfo = syncFs.getRepositoryInfo();
  console.log(`✅ Connected to repository: ${repoInfo.owner}/${repoInfo.repo} (branch: ${repoInfo.branch})\n`);

  console.log('1️⃣ Configuration Management Demo...');
  
  // Application configuration
  const appConfig = {
    app: {
      name: 'MyApp',
      version: '2.1.0',
      environment: 'production'
    },
    database: {
      host: 'prod-db.mycompany.com',
      port: 5432,
      database: 'myapp_prod',
      ssl: true
    },
    features: {
      enableNewDashboard: true,
      enableBetaFeatures: false,
      maxUsers: 10000
    },
    integrations: {
      stripe: {
        publishableKey: 'pk_live_...',
        webhookEndpoint: 'https://api.mycompany.com/webhooks/stripe'
      },
      slack: {
        botToken: 'xoxb-...',
        channel: '#alerts'
      }
    }
  };

  try {
    // Store configuration (this would create a commit in GitHub)
    console.log('📝 Storing application configuration...');
    await asyncFs.writeFile('config/production.json', JSON.stringify(appConfig, null, 2));
    
    // Store environment-specific settings
    const dbConfig = {
      connectionString: 'postgresql://user:pass@prod-db.mycompany.com:5432/myapp_prod',
      poolSize: 20,
      timeout: 30000
    };
    
    await asyncFs.writeFile('config/database.json', JSON.stringify(dbConfig, null, 2));
    console.log('✅ Configuration files stored with automatic version control\n');

    console.log('2️⃣ Multi-environment configuration...');
    
    // Development environment configuration
    const devConfig = {
      ...appConfig,
      app: { ...appConfig.app, environment: 'development' },
      database: {
        host: 'localhost',
        port: 5432,
        database: 'myapp_dev',
        ssl: false
      },
      features: {
        ...appConfig.features,
        enableBetaFeatures: true,
        maxUsers: 100
      }
    };

    await asyncFs.writeFile('config/development.json', JSON.stringify(devConfig, null, 2));
    
    // Feature flags
    const featureFlags = {
      flags: {
        newUserOnboarding: { enabled: true, rollout: 0.1 },
        advancedAnalytics: { enabled: false, rollout: 0.0 },
        darkMode: { enabled: true, rollout: 1.0 },
        experimentalUI: { enabled: true, rollout: 0.05 }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'config-manager@mycompany.com'
    };

    await asyncFs.writeFile('features/flags.json', JSON.stringify(featureFlags, null, 2));
    console.log('✅ Multi-environment configurations created\n');

    console.log('3️⃣ Document and content management...');
    
    // API documentation
    const apiDocs = `# API Documentation

## Authentication

All API requests require authentication using Bearer tokens:

\`\`\`bash
curl -H "Authorization: Bearer your-token" https://api.mycompany.com/v1/users
\`\`\`

## Endpoints

### Users
- \`GET /v1/users\` - List all users
- \`POST /v1/users\` - Create a new user
- \`GET /v1/users/{id}\` - Get user by ID
- \`PUT /v1/users/{id}\` - Update user
- \`DELETE /v1/users/{id}\` - Delete user

### Configuration
- \`GET /v1/config\` - Get current configuration
- \`POST /v1/config\` - Update configuration (admin only)

## Rate Limits

- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated requests

Last updated: ${new Date().toISOString()}
`;

    await asyncFs.writeFile('docs/api.md', apiDocs);
    
    // Release notes
    const releaseNotes = `# Release Notes

## Version 2.1.0 (${new Date().toISOString().split('T')[0]})

### New Features
- ✨ New user dashboard with enhanced analytics
- 🔐 Two-factor authentication support
- 📊 Real-time usage metrics
- 🌙 Dark mode theme

### Improvements
- ⚡ 40% faster API response times
- 💾 Reduced memory usage by 25%
- 🔧 Better error handling and logging
- 📱 Mobile responsive improvements

### Bug Fixes
- 🐛 Fixed user profile image upload issue
- 🔨 Resolved pagination edge case
- 🎯 Fixed notification timing issues

### Breaking Changes
- ⚠️ API endpoint \`/api/v1/user\` changed to \`/api/v1/users\`
- ⚠️ Configuration format updated (see migration guide)

### Migration Guide
\`\`\`javascript
// Old format
{ user: { settings: {...} } }

// New format  
{ users: { settings: {...} } }
\`\`\`
`;

    await asyncFs.writeFile('docs/release-notes.md', releaseNotes);
    console.log('✅ Documentation stored with version history\n');

    console.log('4️⃣ Reading and validating stored data...');
    
    // Read back configuration
    const storedConfig = JSON.parse(await asyncFs.readFile('config/production.json'));
    console.log(`📖 Retrieved config for ${storedConfig.app.name} v${storedConfig.app.version}`);
    
    // List all configuration files
    const configFiles = await asyncFs.readDir('config');
    console.log(`📂 Configuration files: ${configFiles.join(', ')}`);
    
    // Check if optional files exist
    const hasSecrets = await asyncFs.exists('config/secrets.json');
    console.log(`🔐 Secrets file exists: ${hasSecrets}`);
    
    console.log('✅ Data retrieval and validation complete\n');

    console.log('5️⃣ Version control and history...');
    
    // Update feature flags
    const updatedFlags = {
      ...featureFlags,
      flags: {
        ...featureFlags.flags,
        newUserOnboarding: { enabled: true, rollout: 0.5 }, // Increased rollout
        advancedAnalytics: { enabled: true, rollout: 0.1 }   // Enabled for testing
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'product-manager@mycompany.com'
    };

    await asyncFs.writeFile('features/flags.json', JSON.stringify(updatedFlags, null, 2));
    console.log('🔄 Feature flags updated with automatic commit');

    try {
      // Get file history (would work with real GitHub API)
      const history = await asyncFs.getFileHistory('features/flags.json');
      console.log(`📜 File history: ${history.length} commits found`);
      
      if (history.length > 0) {
        console.log('🕐 Recent changes:');
        for (const commit of history.slice(0, 3)) {
          console.log(`   ${commit.date}: ${commit.message} by ${commit.author}`);
        }
      }
    } catch (error) {
      console.log('📜 File history: (simulated - would show real Git history with actual GitHub token)');
      console.log('   2024-01-15: Update features/flags.json by product-manager@mycompany.com');
      console.log('   2024-01-14: Initial features/flags.json by config-manager@mycompany.com');
    }

    console.log('✅ Version control demonstration complete\n');

    console.log('6️⃣ Repository statistics and management...');
    
    try {
      // Get repository statistics (would work with real GitHub API)
      const stats = await asyncFs.getRepositoryStats();
      console.log('📊 Repository statistics:');
      console.log(`   Total files: ${stats.totalFiles}`);
      console.log(`   Total commits: ${stats.totalCommits}`);
      console.log(`   Last commit: ${stats.lastCommit}`);
    } catch (error) {
      console.log('📊 Repository statistics: (simulated)');
      console.log('   Total files: 8');
      console.log('   Total commits: 24');
      console.log('   Last commit: Update feature flags rollout percentages');
    }

    // Cache management
    console.log('\n🗄️ Cache management:');
    console.log('   Files are automatically cached for performance');
    console.log('   Cache can be cleared when needed for fresh data');
    
    asyncFs.clearCache();
    console.log('   ✅ Cache cleared');

    console.log('\n7️⃣ Use case scenarios...');

    // Scenario 1: Dynamic configuration loading
    console.log('\n🎯 Scenario 1: Dynamic Configuration Loading');
    console.log('   Application checks for updated configuration on startup');
    
    const loadApplicationConfig = async () => {
      try {
        const config = JSON.parse(await asyncFs.readFile('config/production.json'));
        const features = JSON.parse(await asyncFs.readFile('features/flags.json'));
        
        return {
          ...config,
          features: features.flags
        };
      } catch (error) {
        console.log('   ⚠️ Using default configuration due to load error');
        return getDefaultConfig();
      }
    };

    const appConfigLoaded = await loadApplicationConfig();
    console.log(`   ✅ Loaded configuration for ${appConfigLoaded.app.name}`);
    console.log(`   🎛️ Feature flags: ${Object.keys(appConfigLoaded.features).length} flags loaded`);

    // Scenario 2: Content deployment
    console.log('\n📋 Scenario 2: Content Deployment');
    console.log('   Deploy help documentation to multiple environments');
    
    const helpContent = {
      'getting-started.md': '# Getting Started\n\nWelcome to our application...',
      'faq.md': '# Frequently Asked Questions\n\n## How do I reset my password?...',
      'api-guide.md': '# API Guide\n\nOur REST API provides...',
      'troubleshooting.md': '# Troubleshooting\n\n## Common Issues...'
    };

    for (const [filename, content] of Object.entries(helpContent)) {
      await asyncFs.writeFile(`help/${filename}`, content);
    }

    const helpFiles = await asyncFs.readDir('help');
    console.log(`   ✅ Deployed ${helpFiles.length} help documents`);
    console.log(`   📚 Help files: ${helpFiles.join(', ')}`);

    // Scenario 3: User data storage
    console.log('\n👤 Scenario 3: User Preferences Storage');
    console.log('   Store user preferences with automatic backup');
    
    const userPreferences = {
      userId: 'user_12345',
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: false
      },
      dashboard: {
        layout: 'grid',
        widgets: ['analytics', 'recent-activity', 'notifications']
      },
      lastUpdated: new Date().toISOString()
    };

    await asyncFs.writeFile('users/user_12345/preferences.json', JSON.stringify(userPreferences, null, 2));
    console.log('   ✅ User preferences stored with version history');
    console.log('   🔄 Changes automatically backed up to Git repository');

    console.log('\n8️⃣ Best practices demonstration...');
    
    // Error handling
    console.log('\n⚠️ Error Handling:');
    try {
      await asyncFs.readFile('nonexistent/file.json');
    } catch (error) {
      console.log('   ✅ Gracefully handled missing file error');
    }

    // Path normalization
    console.log('\n🛤️ Path Normalization:');
    await asyncFs.writeFile('./normalized/path.json', '{"normalized": true}');
    await asyncFs.writeFile('/another//normalized///path.json', '{"also": "normalized"}');
    
    const normalizedContent1 = await asyncFs.readFile('normalized/path.json');
    const normalizedContent2 = await asyncFs.readFile('another/normalized/path.json');
    console.log('   ✅ Paths automatically normalized for GitHub API');

  } catch (error) {
    console.log(`❌ Demo error (expected with mock token): ${error}`);
    console.log('💡 In a real application, use a valid GitHub personal access token');
  }

  console.log('\n✨ GitHubFileSystem demonstration complete!');
  console.log('\n💡 Key benefits demonstrated:');
  console.log('   • 🔄 Automatic version control for all file changes');
  console.log('   • 🌍 Global CDN distribution via GitHub');
  console.log('   • 👥 Built-in collaboration via GitHub interface');
  console.log('   • 💰 Cost-effective storage (free for public repos)');
  console.log('   • 🔒 Enterprise-grade security via GitHub');
  console.log('   • ⚡ Intelligent caching for performance');
  console.log('   • 🌿 Branch-based environment management');
  console.log('   • 📊 Full audit trail through Git history');
  console.log('   • 🛠️ Drop-in replacement for traditional file systems');
}

function getDefaultConfig() {
  return {
    app: {
      name: 'MyApp',
      version: '2.0.0',
      environment: 'production'
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      ssl: false
    },
    features: {}
  };
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateGitHubFileSystem().catch(console.error);
}
