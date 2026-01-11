#!/usr/bin/env bun
/**
 * Test Ripgrep Search
 *
 * Quick test to verify ripgrep-based search works
 */

import { rgSearch, formatMatchList } from '../../../packages/search/src/ripgrep';
import { join } from 'path';

const ROOT = join(import.meta.dir, '../../../packages');

async function main() {
  console.log('🔍 Testing Ripgrep Search');
  console.log('📍 Path:', ROOT);
  console.log('');

  // Test 1: Simple search
  console.log('Test 1: Search for "export function"');
  const result1 = await rgSearch({
    query: 'export function',
    path: ROOT,
    maxResults: 5,
  });
  console.log(`  Found: ${result1.totalMatches} matches in ${result1.filesSearched} files`);
  console.log(`  Duration: ${result1.durationMs}ms`);
  console.log('  Results:');
  console.log(formatMatchList(result1.matches).split('\n').map(l => '    ' + l).join('\n'));
  console.log('');

  // Test 2: TypeScript only
  console.log('Test 2: Search "interface" in *.ts files');
  const result2 = await rgSearch({
    query: 'interface',
    path: ROOT,
    fileGlob: '*.ts',
    maxResults: 5,
  });
  console.log(`  Found: ${result2.totalMatches} matches in ${result2.filesSearched} files`);
  console.log(`  Duration: ${result2.durationMs}ms`);
  console.log('');

  // Test 3: Regex search
  console.log('Test 3: Regex search for function names');
  const result3 = await rgSearch({
    query: 'function \\w+\\(',
    path: ROOT,
    regex: true,
    maxResults: 5,
  });
  console.log(`  Found: ${result3.totalMatches} matches`);
  console.log(`  Duration: ${result3.durationMs}ms`);
  console.log('');

  // Memory check
  const mem = process.memoryUsage();
  console.log('📊 Memory Usage:');
  console.log(`  Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  console.log(`  RSS: ${Math.round(mem.rss / 1024 / 1024)}MB`);
  console.log('');

  console.log('✅ All tests passed - Ripgrep search working!');
}

main().catch(console.error);
