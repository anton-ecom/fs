import { AnalyticsFileSystem, createAnalyticsFileSystem } from '../src/analytics';
import { MemFileSystem } from '../test/fixtures/memory';

/**
 * Demonstration of AnalyticsFileSystem capabilities
 */
export function demonstrateAnalyticsFileSystem() {
  console.log('📊 AnalyticsFileSystem Demonstration\n');

  // Create filesystem with analytics
  const memFs = new MemFileSystem();
  const { instance: analyticsFs, eventEmitter } = createAnalyticsFileSystem(memFs, { 
    emitOn: 5 // Emit analytics every 5 operations
  });

  // Setup analytics event listener
  let analyticsReceived = 0;
  eventEmitter.subscribe('analytics.stats', {
    update(event) {
      analyticsReceived++;
      console.log(`📈 Analytics Report #${analyticsReceived}:`);
      console.log(`   Operations: ${JSON.stringify(event.data.stats)}`);
      console.log(`   File accesses: ${event.data.fileReads.length} recorded`);
      
      // Show recent file accesses
      const recentAccesses = event.data.fileReads.slice(-3);
      for (const access of recentAccesses) {
        console.log(`   - ${access.access.toUpperCase()}: ${access.file} at ${access.timestamp.split('T')[1].split('.')[0]}`);
      }
      console.log('');
    }
  });

  console.log('1️⃣ Performing mixed file operations...');
  
  // Perform various file operations
  analyticsFs.writeFileSync('./config.json', '{"app": "demo"}');
  analyticsFs.writeFileSync('./data.txt', 'Hello World');
  analyticsFs.readFileSync('./config.json');
  analyticsFs.readFileSync('./data.txt');
  analyticsFs.writeFileSync('./log.txt', 'Operation logged');
  
  console.log('✅ Completed 5 operations - analytics should have been emitted\n');

  console.log('2️⃣ Current statistics after emission:');
  const currentStats = analyticsFs.getStats();
  console.log(`   Read: ${currentStats.stats.read}`);
  console.log(`   Write: ${currentStats.stats.write}`);
  console.log(`   Delete: ${currentStats.stats.delete}`);
  console.log(`   Tracked operations: ${currentStats.fileReads.length}\n`);

  console.log('3️⃣ Performing more operations to show accumulation...');
  analyticsFs.readFileSync('./config.json');
  analyticsFs.readFileSync('./data.txt');
  analyticsFs.deleteFileSync('./log.txt');
  
  const accumulatedStats = analyticsFs.getStats();
  console.log('✅ Current accumulated statistics:');
  console.log(`   Read: ${accumulatedStats.stats.read}`);
  console.log(`   Write: ${accumulatedStats.stats.write}`);
  console.log(`   Delete: ${accumulatedStats.stats.delete}`);
  console.log('   Recent file accesses:');
  
  for (const access of accumulatedStats.fileReads) {
    const time = access.timestamp.split('T')[1].split('.')[0];
    console.log(`   - ${access.access.toUpperCase()}: ${access.file} at ${time}`);
  }
  
  console.log('\n4️⃣ Testing non-tracked operations...');
  const statsBefore = analyticsFs.getStats();
  
  // These operations should NOT be tracked
  analyticsFs.existsSync('./config.json');
  analyticsFs.ensureDirSync('./testdir');
  analyticsFs.readDirSync('./');
  analyticsFs.chmodSync('./config.json', 0o755);
  
  const statsAfter = analyticsFs.getStats();
  console.log('✅ Non-tracked operations completed:');
  console.log(`   Stats unchanged: ${JSON.stringify(statsBefore.stats) === JSON.stringify(statsAfter.stats)}`);
  console.log(`   File access count unchanged: ${statsBefore.fileReads.length === statsAfter.fileReads.length}\n`);

  console.log('5️⃣ Demonstrating usage patterns analysis...');
  
  // Simulate different usage patterns
  const configFile = './app-config.json';
  const cacheFile = './cache.json';
  
  analyticsFs.writeFileSync(configFile, '{"setting": "value"}');
  
  // Simulate high read pattern (caching scenario)
  for (let i = 0; i < 4; i++) {
    analyticsFs.readFileSync(configFile);
  }
  
  // This should trigger another analytics emission (5 more operations)
  
  console.log('6️⃣ Usage pattern insights:');
  const finalStats = analyticsFs.getStats();
  const totalOps = finalStats.stats.read + finalStats.stats.write + finalStats.stats.delete;
  
  if (totalOps > 0) {
    const readRatio = (finalStats.stats.read / totalOps * 100).toFixed(1);
    const writeRatio = (finalStats.stats.write / totalOps * 100).toFixed(1);
    
    console.log('✅ Operation distribution:');
    console.log(`   Read ratio: ${readRatio}%`);
    console.log(`   Write ratio: ${writeRatio}%`);
    
    if (finalStats.stats.read > finalStats.stats.write * 3) {
      console.log('💡 Insight: High read-to-write ratio detected. Consider implementing caching.');
    }
    
    // Show most accessed files
    const fileAccessCount: Record<string, number> = {};
    for (const access of finalStats.fileReads) {
      fileAccessCount[access.file] = (fileAccessCount[access.file] || 0) + 1;
    }
    
    const mostAccessed = Object.entries(fileAccessCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
      
    console.log('🔥 Most accessed files:');
    mostAccessed.forEach(([file, count], index) => {
      console.log(`   ${index + 1}. ${file}: ${count} operations`);
    });
  }
  
  console.log('\n✨ AnalyticsFileSystem demonstration complete!');
  console.log(`📊 Total analytics reports received: ${analyticsReceived}`);
}

// Run the demo
demonstrateAnalyticsFileSystem();
