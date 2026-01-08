/**
 * mgrep MCP tool
 * Ultra-fast file content search optimized for minimal token usage
 * Uses ripgrep (rg) when available, falls back to grep
 */

import { z } from 'zod/v4';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { config } from '../config.js';

// Zod schema for mgrep
export const MgrepSchema = z.object({
  pattern: z.string().min(1).describe('Regex pattern to search for'),
  path: z.string().optional().describe('Directory to search in (default: current working directory)'),
  glob: z.string().optional().describe('File pattern to filter (e.g., "*.ts", "*.tsx")'),
  ignoreCase: z.boolean().optional().default(false).describe('Case-insensitive search'),
  contextLines: z.number().optional().default(2).describe('Number of context lines (0-5, default: 2)'),
  maxResults: z.number().optional().default(50).describe('Maximum number of matches (default: 50)'),
  outputMode: z.enum(['concise', 'context', 'files-with-matches']).optional().default('concise').describe('Output format'),
});

/**
 * Ultra-fast file search using ripgrep or grep
 * Optimized to reduce token consumption with concise output
 */
export async function mgrep(args: unknown): Promise<CallToolResult> {
  try {
    const input = MgrepSchema.parse(args);

    if (config.debug) {
      console.error('[DEBUG] mgrep input:', input);
    }

    const {
      pattern,
      path = '.',
      glob,
      ignoreCase,
      contextLines,
      maxResults,
      outputMode,
    } = input;

    // Build command arguments
    const args_ = [];

    // Try ripgrep first (faster, better output)
    const useRipgrep = await commandExists('rg');

    if (useRipgrep) {
      // Ripgrep arguments
      if (ignoreCase) args_.push('-i');
      if (glob) args_.push('-g', glob);
      args_.push('-C', contextLines.toString());
      args_.push('--max-count', maxResults.toString());
      args_.push('--no-heading');  // Compact output
      args_.push('--line-number'); // Always show line numbers
      args_.push('--color', 'never'); // No ANSI codes
      args_.push(pattern, path);
    } else {
      // Fall back to grep
      if (ignoreCase) args_.push('-i');
      args_.push('-n'); // Line numbers
      args_.push('-R'); // Recursive
      if (contextLines > 0) {
        args_.push('-C', contextLines.toString());
      }
      if (glob) {
        args_.push('--include=' + glob);
      }
      args_.push(pattern, path);
    }

    const command = useRipgrep ? 'rg' : 'grep';
    const cmdStr = `${command} ${args_.join(' ')}`;

    if (config.debug) {
      console.error('[DEBUG] mgrep command:', cmdStr);
    }

    // Execute search
    const proc = Bun.spawn({
      cmd: [command, ...args_],
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0 && stderr && !stderr.includes('No matches found')) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: stderr.trim(),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Parse and format results
    const results = parseGrepOutput(output, outputMode, maxResults);

    if (config.debug) {
      console.error('[DEBUG] mgrep results count:', results.matches.length);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            command: useRipgrep ? 'rg' : 'grep',
            pattern,
            path,
            ...results,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Parse grep/ripgrep output into structured results
 */
interface ParsedResults {
  matches: Array<{
    file: string;
    line: number;
    content: string;
    contextBefore?: string[];
    contextAfter?: string[];
  }>;
  totalMatches: number;
  filesAffected: number;
  summary: string;
}

function parseGrepOutput(
  output: string,
  mode: 'concise' | 'context' | 'files-with-matches',
  maxResults: number
): ParsedResults {
  const lines = output.trim().split('\n').filter(l => l);
  const matches: ParsedResults['matches'] = [];
  const filesSet = new Set<string>();

  if (lines.length === 0) {
    return {
      matches: [],
      totalMatches: 0,
      filesAffected: 0,
      summary: 'No matches found',
    };
  }

  if (mode === 'files-with-matches') {
    // Just return unique file paths
    const files = [...new Set(lines)];
    return {
      matches: files.map(file => ({ file, line: 0, content: '' })),
      totalMatches: lines.length,
      filesAffected: files.length,
      summary: `${files.length} file(s) with matches`,
    };
  }

  // Parse grep output with context
  let currentFile = '';
  let currentMatch: ParsedResults['matches'][0] | null = null;
  let contextBefore: string[] = [];
  let contextAfter: string[] = [];
  let inAfterContext = false;

  for (const line of lines) {
    if (matches.length >= maxResults) break;

    // Check for file separator (grep format: "file:line:content" or "--")
    if (line === '--') {
      if (currentMatch) {
        matches.push(currentMatch);
        currentMatch = null;
        contextBefore = [];
        contextAfter = [];
      }
      inAfterContext = false;
      continue;
    }

    // Parse line: "filename:line:content" or "filename-content" (for context)
    const fileMatch = line.match(/^([^-]+?)-(\d+)-(.*)$/) || line.match(/^([^:]+):(\d+):(.*)$/);

    if (fileMatch) {
      const [, file, lineNum, content] = fileMatch;

      if (file !== currentFile) {
        currentFile = file;
        filesSet.add(file);
      }

      const lineNumInt = parseInt(lineNum, 10);

      // Check if this is a match line (has line number) or context
      if (line.includes(':')) {
        // This is the actual match line
        if (currentMatch) {
          matches.push(currentMatch);
        }
        currentMatch = {
          file,
          line: lineNumInt,
          content,
          ...(contextBefore.length > 0 && { contextBefore: [...contextBefore] }),
        };
        contextBefore = [];
        inAfterContext = true;
      } else {
        // Context line
        if (inAfterContext && currentMatch) {
          contextAfter.push(content);
        } else {
          contextBefore.push(content);
        }
      }
    }
  }

  // Don't forget the last match
  if (currentMatch && matches.length < maxResults) {
    matches.push({
      ...currentMatch,
      ...(contextAfter.length > 0 && { contextAfter }),
    });
  }

  // Build summary
  const summary = matches.length >= maxResults
    ? `${matches.length}+ matches across ${filesSet.size} file(s) (truncated)`
    : `${matches.length} match${matches.length !== 1 ? 'es' : ''} across ${filesSet.size} file${filesSet.size !== 1 ? 's' : ''}`;

  return {
    matches,
    totalMatches: lines.length,
    filesAffected: filesSet.size,
    summary,
  };
}

/**
 * Check if a command exists on the system
 */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn({
      cmd: ['which', cmd],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * List files matching a pattern (helper for file discovery)
 */
export const MgrepFilesSchema = z.object({
  pattern: z.string().optional().default('*').describe('Glob pattern (default: *)'),
  path: z.string().optional().describe('Directory to search (default: current)'),
  maxResults: z.number().optional().default(100).describe('Maximum files to return'),
});

export async function mgrepFiles(args: unknown): Promise<CallToolResult> {
  try {
    const input = MgrepFilesSchema.parse(args);
    const { pattern, path = '.', maxResults } = input;

    // Use find with maxdepth for speed
    const proc = Bun.spawn({
      cmd: ['find', path, '-maxdepth', '3', '-type', 'f', '-name', pattern, '-printf', '%P\n'],
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const files = output.trim().split('\n').filter(f => f).slice(0, maxResults);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            files,
            total: files.length,
            path,
            pattern,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
