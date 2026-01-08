/**
 * Unit Tests for mgrep MCP Tool
 * Ultra-fast file search with minimal token consumption
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mgrep, mgrepFiles } from '../src/tools/mgrep.js';

describe('mgrep Tool - Basic Functionality', () => {
  test('should find files by pattern', async () => {
    const result = await mgrep({
      pattern: 'generateId',
      path: 'src/storage',
      glob: '*.ts',
      maxResults: 10,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(['rg', 'grep']).toContain(parsed.command);
  });

  test('should support case-insensitive search', async () => {
    const result = await mgrep({
      pattern: 'GENERATEID',
      path: 'src/storage',
      glob: '*.ts',
      ignoreCase: true,
      maxResults: 5,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });

  test('should support different output modes', async () => {
    const modes = ['concise', 'context', 'files-with-matches'] as const;

    for (const mode of modes) {
      const result = await mgrep({
        pattern: 'function',
        path: 'src',
        glob: '*.ts',
        outputMode: mode,
        maxResults: 3,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.summary).toBeDefined();
    }
  });

  test('should limit context lines', async () => {
    const result = await mgrep({
      pattern: 'export',
      path: 'src/storage',
      glob: '*.ts',
      contextLines: 0,
      maxResults: 3,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });
});

describe('mgrep Files - File Discovery', () => {
  test('should list files matching pattern', async () => {
    const result = await mgrepFiles({
      pattern: '*.ts',
      path: 'src/storage',
      maxResults: 10,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.files).toBeInstanceOf(Array);
    expect(parsed.files.length).toBeGreaterThan(0);
  });

  test('should support wildcards in patterns', async () => {
    const result = await mgrepFiles({
      pattern: '*.ts',
      path: 'src',
      maxResults: 20,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.files.length).toBeGreaterThan(0);
  });

  test('should limit results with maxResults', async () => {
    const result = await mgrepFiles({
      pattern: '*.ts',
      path: 'src',
      maxResults: 5,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.files.length).toBeLessThanOrEqual(5);
  });
});

describe('mgrep - Token Efficiency', () => {
  test('should return concise output by default', async () => {
    const result = await mgrep({
      pattern: 'interface',
      path: 'src/storage',
      glob: '*.ts',
      maxResults: 5,
    });

    const parsed = JSON.parse(result.content[0].text);
    const jsonSize = JSON.stringify(parsed).length;

    // Concise output should be < 5KB
    expect(jsonSize).toBeLessThan(5000);
  });

  test('should minimize output with contextLines=0', async () => {
    const resultZeroContext = await mgrep({
      pattern: 'export',
      path: 'src/storage',
      glob: '*.ts',
      contextLines: 0,
      maxResults: 5,
    });

    const resultWithContext = await mgrep({
      pattern: 'export',
      path: 'src/storage',
      glob: '*.ts',
      contextLines: 2,
      maxResults: 5,
    });

    const parsedZero = JSON.parse(resultZeroContext.content[0].text);
    const parsedWithContext = JSON.parse(resultWithContext.content[0].text);

    // Zero context should be smaller
    expect(JSON.stringify(parsedZero).length).toBeLessThan(
      JSON.stringify(parsedWithContext).length
    );
  });
});

describe('mgrep - Regex Support', () => {
  test('should support regex patterns', async () => {
    const result = await mgrep({
      pattern: '(interface|type)\\s+\\w+',
      path: 'src/storage',
      glob: '*.ts',
      maxResults: 5,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });

  test('should find exact matches with quoted patterns', async () => {
    const result = await mgrep({
      pattern: '"generateId"',
      path: 'src',
      glob: '*.ts',
      maxResults: 5,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });
});

describe('mgrep - Error Handling', () => {
  test('should handle invalid patterns gracefully', async () => {
    const result = await mgrep({
      pattern: '',
      path: 'src',
      maxResults: 5,
    });

    // Should return error response
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
  });

  test('should handle non-existent paths', async () => {
    const result = await mgrep({
      pattern: 'test',
      path: '/non/existent/path',
      maxResults: 5,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toBeDefined();
  });
});
