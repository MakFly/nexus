/**
 * Hook: PostToolUse
 * Triggered after each tool execution
 */

const NEXUS_API = process.env.NEXUS_API || 'http://localhost:3001';

interface ToolInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

async function main(): Promise<void> {
  const sessionId = process.env.NEXUS_SESSION_ID || `unknown-${Date.now()}`;

  // Read tool info from stdin (Claude Code provides this)
  let toolInfo: ToolInput | null = null;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf8');
    if (input) {
      toolInfo = JSON.parse(input);
    }
  } catch {
    // Ignore parse errors
  }

  if (toolInfo?.tool_name) {
    try {
      fetch(`${NEXUS_API}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          hook_name: 'postTool',
          payload: {
            tool_name: toolInfo.tool_name,
            tool_input: toolInfo.tool_input,
            timestamp: Date.now(),
          }
        })
      }).catch(() => {});
    } catch {
      // Fire and forget
    }
  }

  console.log(JSON.stringify({ result: 'continue' }));
}

main();
