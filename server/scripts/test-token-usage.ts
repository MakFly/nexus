/**
 * Test script to analyze token usage of listMemories response
 */

import { getDb } from './src/storage/client.js';
import { memories } from './src/storage/schema.js';
import { desc } from 'drizzle-orm';

async function testTokenUsage() {
  const db = getDb();

  // Get 19 memories (as mentioned in the issue)
  const allMemories = await db.query.memories.findMany({
    orderBy: [desc(memories.createdAt)],
    limit: 19,
  });

  console.log('=== MEMORY DATA ANALYSIS ===\n');

  // Calculate total characters
  const jsonString = JSON.stringify(allMemories, null, 2);
  const charCount = jsonString.length;
  const tokenEstimate = Math.ceil(charCount / 4); // Rough estimate: 1 token ≈ 4 chars

  console.log(`Total memories: ${allMemories.length}`);
  console.log(`Total characters: ${charCount.toLocaleString()}`);
  console.log(`Estimated tokens: ${tokenEstimate.toLocaleString()}`);
  console.log(`Average tokens per memory: ${Math.round(tokenEstimate / allMemories.length)}`);
  console.log(`\nAverage content length: ${Math.round(allMemories.reduce((sum, m) => sum + m.content.length, 0) / allMemories.length)} chars`);

  // Analyze individual memory structure
  console.log('\n=== MEMORY STRUCTURE ANALYSIS ===\n');
  const firstMemory = allMemories[0];
  console.log('Keys in each memory:', Object.keys(firstMemory));

  console.log('\n=== PER-MEMORY SIZE BREAKDOWN ===\n');
  allMemories.forEach((memory, idx) => {
    const memoryJson = JSON.stringify(memory);
    const tokens = Math.ceil(memoryJson.length / 4);
    console.log(`Memory ${idx + 1}: "${memory.title.substring(0, 50)}..."`);
    console.log(`  - Content: ${memory.content.length} chars`);
    console.log(`  - Total JSON: ${memoryJson.length} chars (~${tokens} tokens)`);
    console.log(`  - Stack: ${memory.stack || 'none'}`);
    console.log(`  - Difficulty: ${memory.difficulty || 'none'}`);
    console.log(`  - Metadata: ${JSON.stringify(memory.metadata)} (${memory.metadata ? JSON.stringify(memory.metadata).length : 0} chars)`);
  });

  console.log('\n=== FULL RESPONSE SAMPLE ===\n');
  console.log('First 500 chars of full response:');
  console.log(jsonString.substring(0, 500));
  console.log('...');

  // What would the MCP response look like?
  console.log('\n=== MCP RESPONSE STRUCTURE ===\n');
  const mcpResponse = {
    success: true,
    memories: allMemories,
    total: allMemories.length,
  };
  const mcpJson = JSON.stringify(mcpResponse, null, 2);
  const mcpTokens = Math.ceil(mcpJson.length / 4);
  console.log(`MCP wrapper response: ${mcpJson.length} chars (~${mcpTokens} tokens)`);

  console.log('\n=== REDUCED FORMAT PROPOSAL ===\n');
  const reducedMemories = allMemories.map(m => ({
    id: m.id,
    type: m.type,
    title: m.title,
    stack: m.stack,
    difficulty: m.difficulty,
    // No content - just metadata for listing
  }));
  const reducedJson = JSON.stringify({ success: true, memories: reducedMemories, total: reducedMemories.length }, null, 2);
  const reducedTokens = Math.ceil(reducedJson.length / 4);
  console.log(`Reduced format (no content): ${reducedJson.length} chars (~${reducedTokens} tokens)`);
  console.log(`Token reduction: ${Math.round((1 - reducedTokens / mcpTokens) * 100)}%`);

  process.exit(0);
}

testTokenUsage().catch(console.error);
