import { z } from 'zod'
import { RalphDatabase } from '../storage/database.js'

export const SearchInputSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().optional().default(10).describe('Maximum results to return'),
})

export async function ralphSearch(input: z.infer<typeof SearchInputSchema>, db: RalphDatabase) {
  const results = db.searchMemories(input.query, input.limit)

  return {
    query: input.query,
    results,
    count: results.length,
  }
}
