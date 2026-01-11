/**
 * Context Routes - Nexus API
 * Provides context injection for Claude Code sessions
 */

import { Hono } from 'hono';
import type { Database } from '@nexus/storage';

interface Memory {
  id: number;
  type: string;
  title: string;
  narrative: string;
  tags_json?: string;
  scope: string;
  created_at: number;
  tags?: string[];  // Parsed from tags_json
}

interface SessionInfo {
  cwd: string;
  git_branch: string;
  git_sha: string;
}

type GetDb = () => Promise<Database>;

export function createContextRoutes(getDb: GetDb) {
  const app = new Hono();

  // ============================================================
  // GET /context/inject - Get context for session injection
  // ============================================================
  app.get('/inject', async (c) => {
    const db = await getDb();
    const session_id = c.req.query('session_id');

    if (!session_id) {
      return c.text('', 200); // No context if no session
    }

    try {
      // Try to get session info from hook_observations
      const sessionObs = db.query(`
        SELECT payload FROM hook_observations
        WHERE session_id = ? AND hook_name = 'sessionStart'
        LIMIT 1
      `, session_id) as any[];

      let sessionInfo: SessionInfo | null = null;
      if (sessionObs.length > 0) {
        const payload = JSON.parse(sessionObs[0].payload);
        sessionInfo = {
          cwd: payload.cwd,
          git_branch: payload.git_branch,
          git_sha: payload.git_sha,
        };
      }

      const branch = sessionInfo?.git_branch || 'unknown';

      // Recall memories (stored in observations table) for this branch/repo
      const memories = db.query(`
        SELECT id, type, title, tags_json, scope, created_at
        FROM observations
        WHERE scope = ? OR scope = 'repo'
        ORDER BY created_at DESC
        LIMIT 20
      `, branch) as unknown as Memory[];

      // Parse tags_json for each memory
      const parsedMemories = memories.map(m => ({
        ...m,
        tags: m.tags_json ? JSON.parse(m.tags_json) : [],
      }));

      // Score by relevance
      const scored = parsedMemories.map(m => ({
        ...m,
        score: calculateRelevanceScore(m, sessionInfo, branch),
      }));

      // Filter and sort
      const relevant = scored
        .filter(m => m.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (relevant.length === 0) {
        return c.text('', 200); // No relevant context
      }

      // Format output
      const output = formatContext(relevant, sessionInfo);

      return c.text(output);

    } catch (e) {
      console.error('[Context] Error:', e);
      return c.text('', 200); // Fail silently
    }
  });

  // ============================================================
  // Helper: Calculate Relevance Score
  // ============================================================
  function calculateRelevanceScore(
    memory: Memory,
    _sessionInfo: SessionInfo | null,
    currentBranch: string
  ): number {
    let score = 0;

    // Same branch
    if (memory.scope === currentBranch) {
      score += 0.3;
    }

    // Recent (within 7 days)
    const daysSince = (Date.now() / 1000 - memory.created_at) / 86400;
    if (daysSince < 7) {
      score += 0.2;
    } else if (daysSince < 30) {
      score += 0.1;
    }

    // Type weighting
    if (memory.type === 'decision') {
      score += 0.1;
    }
    if (memory.type === 'bugfix' && daysSince < 30) {
      score += 0.15;
    }

    return Math.min(score, 1.0);
  }

  // ============================================================
  // Helper: Format Context Output
  // ============================================================
  function formatContext(memories: any[], sessionInfo: SessionInfo | null): string {
    const byType: Record<string, any[]> = {
      decision: [],
      bugfix: [],
      discovery: [],
      change: [],
      preference: [],
    };

    // Group by type
    for (const m of memories) {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m);
    }

    let output = '\n';

    if (sessionInfo) {
      output += `### 📍 Branch: ${sessionInfo.git_branch}\n\n`;
    }

    if (byType.decision?.length > 0) {
      output += `#### Recent Decisions\n`;
      for (const m of byType.decision.slice(0, 3)) {
        const daysAgo = Math.floor((Date.now() / 1000 - m.created_at) / 86400);
        output += `- [${m.id}] ${m.title} (${daysAgo}d ago)\n`;
      }
      output += `\n`;
    }

    if (byType.bugfix?.length > 0) {
      output += `#### Known Issues\n`;
      for (const m of byType.bugfix.slice(0, 2)) {
        output += `- [${m.id}] ${m.title}\n`;
      }
      output += `\n`;
    }

    if (byType.discovery?.length > 0) {
      output += `#### Recent Discoveries\n`;
      for (const m of byType.discovery.slice(0, 2)) {
        output += `- [${m.id}] ${m.title}\n`;
      }
      output += `\n`;
    }

    output += `\n*Use /nexus to explore full context*\n`;

    return output;
  }

  return app;
}
