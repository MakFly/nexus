#!/usr/bin/env bun
/**
 * Dry-Run Script - Test indexation without risk
 *
 * Usage: bun scripts/dry-run.ts [path]
 */

import { dryRun, printDryRunReport } from '@nexus/indexer';
import { join } from 'path';

// Target path (default: packages/)
const targetPath = process.argv[2] || join(import.meta.dir, '../../../packages');

console.log('🔍 DRY-RUN MODE - No writes, just analysis');
console.log('📍 Target:', targetPath);
console.log('');

const result = dryRun({
  rootPath: targetPath,
  maxFileSize: 100 * 1024,  // 100KB
  maxFiles: 500,
  maxDepth: 15,
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
  ],
});

printDryRunReport(result);

// Safety check
if (result.totalFiles > 200) {
  console.log('⚠️  WARNING: More than 200 files - consider reducing scope');
}

if (result.estimatedChunks > 1000) {
  console.log('⚠️  WARNING: More than 1000 chunks estimated - may be slow');
}

if (result.peakMemoryMB > 50) {
  console.log('⚠️  WARNING: Peak memory > 50MB during scan');
}

// Recommendation
console.log('\n📋 RECOMMENDATION:');
if (result.totalFiles <= 100 && result.estimatedChunks <= 500) {
  console.log('✅ Safe to proceed with indexation');
} else if (result.totalFiles <= 300) {
  console.log('⚠️  Proceed with caution - use small batches');
} else {
  console.log('❌ Too many files - reduce scope or use incremental indexing');
}
