/**
 * Hook: SessionEnd
 * Triggered when Claude Code session ends
 */

const NEXUS_API = process.env.NEXUS_API || 'http://localhost:3001';

async function main(): Promise<void> {
  const sessionId = process.env.NEXUS_SESSION_ID || `unknown-${Date.now()}`;
  const cwd = process.cwd();
  const project = cwd.split('/').pop() || 'unknown';

  try {
    fetch(`${NEXUS_API}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        hook_name: 'sessionEnd',
        payload: {
          project,
          cwd,
          timestamp: Date.now(),
        }
      })
    }).catch(() => {});

    console.log(JSON.stringify({ result: 'continue' }));
  } catch {
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
