/**
 * Ralph Status API
 * Returns system status and statistics
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'

const DB_PATH = join(homedir(), '.ralph', 'ralph.db')

export default eventHandler(() => {
  try {
    const dbPath = DB_PATH

    if (!require('fs').existsSync(dbPath)) {
      return {
        status: 'not_initialized',
        message: 'Ralph database not found',
        db_path: dbPath,
      }
    }

    const db = new Database(dbPath, { readonly: true })

    // Get counts
    const sessions = db
      .prepare('SELECT COUNT(*) as count FROM sessions')
      .get() as any
    const observations = db
      .prepare('SELECT COUNT(*) as count FROM observations')
      .get() as any
    const insights = db
      .prepare('SELECT COUNT(*) as count FROM compressed_insights')
      .get() as any
    const checkpoints = db
      .prepare('SELECT COUNT(*) as count FROM checkpoints')
      .get() as any

    // Get recent activity
    const recent = db
      .prepare(
        `
      SELECT project_path, COUNT(*) as count
      FROM observations
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY project_path
    `,
      )
      .all()

    db.close()

    return {
      status: 'active',
      db_path: dbPath,
      statistics: {
        sessions: sessions.count,
        observations: observations.count,
        insights: insights.count,
        checkpoints: checkpoints.count,
      },
      recent_activity: recent,
    }
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message,
    }
  }
})
