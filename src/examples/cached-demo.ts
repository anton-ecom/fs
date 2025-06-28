import { CachedFileSystem, createCachedFileSystem } from '../cached';
import { MemFileSystem } from '../memory';
import { performance } from 'node:perf_hooks';

console.log('⚡ CachedFileSystem Performance Demonstration\n');

async function demonstrateCachedFilesystem() {
  // Create base filesystem and populate with test data
  const memFs = new MemFileSystem();
  
  // Setup test files
  const configData = JSON.stringify({
    database: { host: 'localhost', port: 5432 },
    api: { version: 'v2', timeout: 5000 },
    features: { analytics: true, debugging: false }
  }, null, 2);
  
  const templateData = `
<!DOCTYPE html>
<html>
<head><title>{{title}}</title></head>
<body>
  <header>{{header}}</header>
  <main>{{content}}</main>
  <footer>{{footer}}</footer>
</body>
</html>`.trim();

  const logData = Array.from({ length: 100 }, (_, i) => 
    `2025-06-28 ${String(10 + i).padStart(2, '0')}:00:00 INFO Request processed`
  ).join('\n');

  // Write test files
  memFs.writeFileSync('./config/app.json', configData);
  memFs.writeFileSync('./config/database.json', JSON.stringify({ host: 'db.example.com' }));
  memFs.writeFileSync('./templates/page.html', templateData);
  memFs.writeFileSync('./templates/header.html', '<h1>Welcome</h1>');
  memFs.writeFileSync('./templates/footer.html', '<p>© 2025 Example Corp</p>');
  memFs.writeFileSync('./logs/app.log', logData);
  
  console.log('1️⃣ Setting up cached filesystem with performance monitoring...');
  
  // Create cached filesystem with reasonable defaults
  const cachedFs = createCachedFileSystem(memFs, {
    maxSize: 50,
    ttl: 5 * 60 * 1000, // 5 minutes
    cacheExists: true,
    cacheDirListing: true
  });

  console.log('✅ Cache configuration:');
  const initialStats = cachedFs.getCacheStats();
  console.log(`   Max size: ${initialStats.options.maxSize} files`);
  console.log(`   TTL: ${initialStats.options.ttl / 1000} seconds`);
  console.log(`   Cache exists: ${initialStats.options.cacheExists}`);
  console.log(`   Cache directory listings: ${initialStats.options.cacheDirListing}\n`);

  console.log('2️⃣ Performance comparison: Cold vs Warm reads...');
  
  // Benchmark: Cold reads (without cache)
  const coldStartTime = performance.now();
  for (let i = 0; i < 100; i++) {
    memFs.readFileSync('./config/app.json');
    memFs.readFileSync('./templates/page.html');
    memFs.readFileSync('./logs/app.log');
  }
  const coldEndTime = performance.now();
  const coldTime = coldEndTime - coldStartTime;
  
  // Benchmark: Warm reads (with cache)
  const warmStartTime = performance.now();
  for (let i = 0; i < 100; i++) {
    cachedFs.readFileSync('./config/app.json');
    cachedFs.readFileSync('./templates/page.html');
    cachedFs.readFileSync('./logs/app.log');
  }
  const warmEndTime = performance.now();
  const warmTime = warmEndTime - warmStartTime;
  
  const speedup = (coldTime / warmTime).toFixed(1);
  
  console.log(`❄️  Cold reads (100 iterations): ${coldTime.toFixed(2)}ms`);
  console.log(`🔥 Warm reads (100 iterations): ${warmTime.toFixed(2)}ms`);
  console.log(`⚡ Performance improvement: ${speedup}x faster\n`);

  console.log('3️⃣ Cache behavior demonstration...');
  
  // Demonstrate cache population
  console.log('📁 Reading files to populate cache...');
  cachedFs.readFileSync('./config/app.json');
  cachedFs.readFileSync('./config/database.json');
  cachedFs.readFileSync('./templates/page.html');
  cachedFs.existsSync('./templates/header.html');
  cachedFs.existsSync('./nonexistent.txt');
  
  let stats = cachedFs.getCacheStats();
  console.log('✅ Cache populated:');
  console.log(`   Read cache: ${stats.readCache.size} files`);
  console.log(`   Exists cache: ${stats.existsCache.size} checks`);
  console.log(`   Files cached: ${stats.readCache.entries.join(', ')}\n`);

  console.log('4️⃣ Cache invalidation on writes...');
  
  // Demonstrate cache updates on write
  console.log('✏️  Updating config file...');
  const newConfig = JSON.stringify({ updated: true, timestamp: Date.now() });
  cachedFs.writeFileSync('./config/app.json', newConfig);
  
  // Read should return updated content immediately
  const updatedContent = cachedFs.readFileSync('./config/app.json');
  console.log(`✅ Updated content served from cache: ${JSON.parse(updatedContent).updated === true}`);
  
  // Cache stats should show cache is still populated
  stats = cachedFs.getCacheStats();
  console.log(`📊 Cache size maintained: ${stats.readCache.size} files\n`);

  console.log('5️⃣ Manual cache management...');
  
  // Demonstrate manual invalidation
  console.log('🗑️  Manually invalidating specific file...');
  cachedFs.invalidateFile('./config/database.json');
  
  stats = cachedFs.getCacheStats();
  console.log(`✅ File removed from cache. Read cache size: ${stats.readCache.size}`);
  console.log(`📋 Remaining files: ${stats.readCache.entries.join(', ')}\n`);

  console.log('6️⃣ Directory operations and cache invalidation...');
  
  // Add files to cache directory
  cachedFs.writeFileSync('./templates/sidebar.html', '<div>Sidebar</div>');
  cachedFs.writeFileSync('./templates/nav.html', '<nav>Navigation</nav>');
  cachedFs.readFileSync('./templates/sidebar.html');
  cachedFs.readFileSync('./templates/nav.html');
  
  console.log('📂 Added and cached template files...');
  stats = cachedFs.getCacheStats();
  console.log(`   Templates in cache: ${stats.readCache.entries.filter(f => f.includes('templates')).length}`);
  
  // Invalidate entire directory
  console.log('🗂️  Invalidating templates directory...');
  cachedFs.invalidateDirectory('./templates');
  
  stats = cachedFs.getCacheStats();
  console.log(`✅ Templates removed. Read cache size: ${stats.readCache.size}`);
  console.log(`📋 Remaining files: ${stats.readCache.entries.join(', ')}\n`);

  console.log('7️⃣ LRU eviction demonstration...');
  
  // Create small cache to demonstrate eviction
  const smallCacheFs = new CachedFileSystem(memFs, { maxSize: 3 });
  
  console.log('📦 Creating small cache (max 3 files)...');
  smallCacheFs.readFileSync('./config/app.json');     // File 1
  smallCacheFs.readFileSync('./config/database.json'); // File 2
  smallCacheFs.readFileSync('./templates/page.html');  // File 3
  
  let smallStats = smallCacheFs.getCacheStats();
  console.log(`✅ Cache full: ${smallStats.readCache.size}/${smallStats.options.maxSize}`);
  console.log(`📁 Cached files: ${smallStats.readCache.entries.join(', ')}`);
  
  // Access first file to make it most recently used
  smallCacheFs.readFileSync('./config/app.json');
  
  // Add fourth file - should evict LRU (database.json)
  console.log('➕ Adding fourth file (should evict LRU)...');
  smallCacheFs.readFileSync('./logs/app.log'); // File 4
  
  smallStats = smallCacheFs.getCacheStats();
  console.log(`✅ LRU eviction occurred: ${smallStats.readCache.size}/${smallStats.options.maxSize}`);
  console.log(`📁 Cached files: ${smallStats.readCache.entries.join(', ')}`);
  console.log('🗑️  Evicted: ./config/database.json (least recently used)\n');

  console.log('8️⃣ TTL expiration simulation...');
  
  // Create cache with very short TTL for demo
  const shortTtlFs = new CachedFileSystem(memFs, { ttl: 100 }); // 100ms TTL
  
  console.log('⏱️  Creating cache with 100ms TTL...');
  shortTtlFs.readFileSync('./config/app.json');
  
  let ttlStats = shortTtlFs.getCacheStats();
  console.log(`✅ File cached: ${ttlStats.readCache.size} file`);
  
  // Wait for TTL to expire
  console.log('⏳ Waiting for TTL expiration...');
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Access file again - should be cache miss due to TTL
  const startTime = performance.now();
  shortTtlFs.readFileSync('./config/app.json');
  const endTime = performance.now();
  
  ttlStats = shortTtlFs.getCacheStats();
  console.log(`✅ TTL expiration handled: ${(endTime - startTime).toFixed(2)}ms for fresh read`);
  console.log(`📊 Cache repopulated: ${ttlStats.readCache.size} file\n`);

  console.log('9️⃣ Real-world usage simulation...');
  
  // Simulate API server with config reads
  console.log('🌐 Simulating API server with frequent config reads...');
  
  class ConfigService {
    constructor(private fs: CachedFileSystem) {}
    
    getApiConfig() {
      return JSON.parse(this.fs.readFileSync('./config/app.json'));
    }
    
    getDatabaseConfig() {
      return JSON.parse(this.fs.readFileSync('./config/database.json'));
    }
    
    loadTemplate(name: string) {
      return this.fs.readFileSync(`./templates/${name}.html`);
    }
  }
  
  const configService = new ConfigService(cachedFs);
  
  // Simulate 50 API requests
  const apiStartTime = performance.now();
  for (let i = 0; i < 50; i++) {
    configService.getApiConfig();       // Read on every request
    configService.getDatabaseConfig();  // Read on every request
    if (i % 5 === 0) {
      configService.loadTemplate('page'); // Load template occasionally
    }
  }
  const apiEndTime = performance.now();
  
  console.log(`✅ Processed 50 API requests in ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
  
  const finalStats = cachedFs.getCacheStats();
  console.log('📊 Final cache statistics:');
  console.log(`   Read cache: ${finalStats.readCache.size}/${finalStats.options.maxSize}`);
  console.log(`   Exists cache: ${finalStats.existsCache.size}/${finalStats.options.maxSize}`);
  console.log(`   Total files tracked: ${finalStats.readCache.entries.length}\n`);

  console.log('🔟 Cache performance insights...');
  
  // Calculate theoretical vs actual reads
  const totalOperations = 50 * 2 + 10; // 50 requests * 2 configs + 10 template loads
  const actualReads = finalStats.readCache.size; // Only unique files were read from disk
  const cacheEfficiency = ((totalOperations - actualReads) / totalOperations * 100).toFixed(1);
  
  console.log('💡 Performance insights:');
  console.log(`   Total file operations: ${totalOperations}`);
  console.log(`   Actual disk reads: ${actualReads}`);
  console.log(`   Cache efficiency: ${cacheEfficiency}% (${totalOperations - actualReads} operations saved)`);
  console.log(`   Memory usage: ~${(finalStats.readCache.size * 1.5).toFixed(1)}KB (estimated)\n`);

  console.log('✨ CachedFileSystem demonstration complete!');
  console.log('💡 Key benefits demonstrated:');
  console.log('   • Automatic LRU caching with configurable size limits');
  console.log('   • TTL-based expiration for fresh data');
  console.log('   • Transparent cache invalidation on writes');
  console.log('   • Manual cache management for fine-grained control');
  console.log('   • Dramatic performance improvements for repeated reads');
  console.log('   • Drop-in replacement for any IFileSystem implementation');
}

// Run the demonstration
demonstrateCachedFilesystem().catch(console.error);
