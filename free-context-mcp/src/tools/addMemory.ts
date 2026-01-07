import { z } from 'zod'
import { RalphDatabase } from '../storage/database.js'

export const AddMemoryInputSchema = z.object({
  sessionId: z.string().describe('Session identifier'),
  category: z.enum(['decision', 'context', 'code', 'error', 'solution']).describe('Memory category'),
  content: z.string().describe('Memory content'),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
})

export async function ralphAddMemory(input: z.infer<typeof AddMemoryInputSchema>, db: RalphDatabase) {
  const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const memory = {
    id: memoryId,
    sessionId: input.sessionId,
    category: input.category,
    content: input.content,
    timestamp: new Date().toISOString(),
    metadata: input.metadata,
  }

  db.createMemory(memory)

  return {
    memoryId,
    message: `Memory stored in category ${input.category}`,
    timestamp: memory.timestamp,
  }
}
