/**
 * Hook: Stop
 * Triggered when Claude generates [stop] or timeout
 */

async function main(): Promise<void> {
  console.log(JSON.stringify({ result: 'continue' }));
}

main();
