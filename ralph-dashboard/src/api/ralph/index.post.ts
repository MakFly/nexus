/**
 * Ralph V3 API - Query SQLite database directly
 *
 * This API route provides access to the Ralph SQLite database
 * without needing a separate backend server.
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'

const DB_PATH = join(homedir(), '.ralph', 'ralph.db')

export default eventHandler(async (event) => {
  const body = (await readBody(event)) || {}
  const { action, query, limit = 20 } = body

  try {
    // Ensure DB exists
    const dbPath = DB_PATH
    if (!require('fs').existsSync(dbPath)) {
      return {
        success: false,
        error: 'Database not found. Please initialize Ralph first.',
        data: [],
      }
    }

    const db = new Database(dbPath, { readonly: true })

    let result = []

    switch (action) {
      case 'search_observations':
        // FTS5 search over observations
        result = db
          .prepare(
            `
          SELECT o.* FROM observations o
          JOIN observations_fts f ON o.id = f.rowid
          WHERE observations_fts MATCH ?
          ORDER BY rank
          LIMIT ?
        `,
          )
          .all(query, limit)
        break

      case 'get_timeline':
        // Get observations for a session
        const { session_id } = body
        result = db
          .prepare(
            `
          SELECT * FROM observations
          WHERE session_id = ?
          ORDER BY timestamp ASC
          LIMIT ?
        `,
          )
          .all(session_id, limit)
        break

      case 'get_insights':
        // Get compressed insights
        result = db
          .prepare(
            `
          SELECT * FROM compressed_insights
          WHERE project_path = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `,
          )
          .all(query, limit)
        break

      case 'search_insights':
        // FTS5 search over insights
        result = db
          .prepare(
            `
          SELECT i.* FROM compressed_insights i
          JOIN insights_fts f ON i.id = f.rowid
          WHERE insights_fts MATCH ?
          ORDER BY rank
          LIMIT ?
        `,
          )
          .all(query, limit)
        break

      case 'get_stats':
        // Get project statistics
        result = db
          .prepare(
            `
          SELECT
            project_path,
            COUNT(DISTINCT session_id) as session_count,
            COUNT(*) as observation_count,
            SUM(tokens_estimate) as total_tokens,
            MAX(timestamp) as last_activity
          FROM observations
          GROUP BY project_path
        `,
          )
          .all()
        break

      case 'get_recent':
        // Get recent observations (for dashboard)
        result = db
          .prepare(
            `
          SELECT * FROM observations
          ORDER BY timestamp DESC
          LIMIT ?
        `,
          )
          .all(limit)
        break

      case 'get_all':
        // Get all observations with optional filters
        const { project_path, category, type } = body

        let sql = 'SELECT * FROM observations WHERE 1=1'
        const params: any[] = []

        if (project_path) {
          sql += ' AND project_path = ?'
          params.push(project_path)
        }
        if (category) {
          sql += ' AND category = ?'
          params.push(category)
        }
        if (type) {
          sql += ' AND type = ?'
          params.push(type)
        }

        sql += ' ORDER BY timestamp DESC LIMIT ?'
        params.push(limit)

        result = db.prepare(sql).all(...params)
        break

      default:
        db.close()
        return {
          success: false,
          error: `Unknown action: ${action}`,
          data: [],
        }
    }

    db.close()

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      data: [],
    }
  }
})
