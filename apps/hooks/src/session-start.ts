/**
 * Hook: SessionStart
 * Triggered when a Claude Code session begins
 */

const NEXUS_API = process.env.NEXUS_API || 'http://localhost:3001';

// Generate unique session ID
const SESSION_ID = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function main(): Promise<void> {
  const cwd = process.cwd();
  const project = cwd.split('/').pop() || 'unknown';

  try {
    // Capture observation with correct format
    fetch(`${NEXUS_API}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        hook_name: 'sessionStart',
        payload: {
          project,
          cwd,
          timestamp: Date.now(),
          env: {
            user: process.env.USER,
            shell: process.env.SHELL,
          }
        }
      })
    }).catch(() => {});

    // Pass session_id to other hooks via env
    console.log(JSON.stringify({
      result: 'continue',
      env: { NEXUS_SESSION_ID: SESSION_ID }
    }));
  } catch {
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
