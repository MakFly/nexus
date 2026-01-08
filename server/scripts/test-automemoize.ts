/**
 * Auto-Memoize Test
 *
 * Run this test to verify auto-memoization logic:
 *
 * bun run test-automemoize
 */

import { detectImportantContent, extractTitle } from './src/automations/auto-save.js';

// Simulate tool responses
const testResponses = [
  {
    name: 'Code with explanation',
    toolName: 'mgrep',
    content: `Found 3 matches for "useMemo" in src/components/

App.tsx:15: function useMemoDeps(deps) {
  return useMemo(() => processDeps(deps), [deps]);
}

Hook.ts:42: const memoized = useMemo(() => {
  return data.filter(d => d.active);
}, [data]);`,
  },
  {
    name: 'Solution pattern',
    toolName: 'search',
    content: `Solution: To fix the "Too many re-renders" error in React:

1. Wrap the expensive computation in useMemo
2. Add the dependency array to useEffect
3. Use useCallback for event handlers passed as props

Example:
const value = useMemo(() => expensiveCalc(a, b), [a, b]);`,
  },
  {
    name: 'Simple response (should skip)',
    toolName: 'list_contexts',
    content: `OK`,
  },
  {
    name: 'Definition pattern',
    toolName: 'mgrep_files',
    content: `Definition: React.memo is a higher-order component that memoizes
functional components to prevent unnecessary re-renders when props haven't changed.

Usage:
export default React.memo(MyComponent);

For comparison, use the second argument:
export default React.memo(MyComponent, (prev, next) => prev.id === next.id);`,
  },
  {
    name: 'Decision pattern',
    toolName: 'search',
    content: `Decision: We will use Zustand for state management instead of Redux
because it's simpler, has less boilerplate, and better TypeScript support.`,
  },
  {
    name: 'API pattern',
    toolName: 'search',
    content: `API: POST /api/memories

Creates a new memory in the specified context.

Request body:
{
  "contextId": "string",
  "type": "note|snippet|task",
  "title": "string",
  "content": "string"
}`,
  },
];

function runTest() {
  console.log('🧪 Testing Auto-Memoize Detection Logic\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Analyzing test responses...\n');

  let saveCount = 0;
  let skipCount = 0;

  for (let i = 0; i < testResponses.length; i++) {
    const test = testResponses[i];
    const testNum = i + 1;

    console.log(`\n📞 Test ${testNum}: ${test.name}`);
    console.log('─'.repeat(60));

    // Show preview
    const preview = test.content.substring(0, 80) + (test.content.length > 80 ? '...' : '');
    console.log(`Content: "${preview}"`);

    // Run detection
    const detection = detectImportantContent(test.content);
    const title = extractTitle(test.content, detection);

    console.log(`   Pattern: ${detection.pattern?.name || 'none'}`);
    console.log(`   Type: ${detection.type}`);
    console.log(`   Confidence: ${(detection.confidence * 100).toFixed(0)}%`);
    console.log(`   Title: "${title}"`);

    // Determine if would be saved
    const wouldSave = detection.detected && detection.confidence >= 0.7;

    if (wouldSave) {
      console.log(`   ✅ Would be AUTO-SAVED`);
      saveCount++;
    } else {
      console.log(`   ⏭️  Would be SKIPPED (low confidence)`);
      skipCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Would save: ${saveCount}`);
  console.log(`   ⏭️  Would skip: ${skipCount}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 How to test with real server:');
  console.log('   1. Start the server: bun run both');
  console.log('   2. Connect from Claude Code Desktop');
  console.log('   3. Run some MCP tools (mgrep, search, etc.)');
  console.log('   4. Check saved memories:');
  console.log('      bun run db:studio');
  console.log('   OR');
  console.log('      sqlite3 free-context.db "SELECT title, type, created_at FROM memories ORDER BY created_at DESC LIMIT 10;"');
}

// Run the test
runTest();
