/**
 * Hook: PreToolUse
 * Triggered before each tool execution
 */

async function main(): Promise<void> {
  console.log(JSON.stringify({ result: 'continue' }));
}

main();
