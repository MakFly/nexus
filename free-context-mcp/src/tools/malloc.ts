import { z } from 'zod'
import { RalphDatabase } from '../storage/database.js'

export const MallocInputSchema = z.object({
  projectId: z.string().describe('Project identifier'),
  maxTokens: z.number().optional().default(200000).describe('Maximum token limit'),
})

export async function ralphMalloc(input: z.infer<typeof MallocInputSchema>, db: RalphDatabase) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const session = {
    id: sessionId,
    projectId: input.projectId,
    startTime: new Date().toISOString(),
    maxTokens: input.maxTokens,
  }

  db.createSession(session)

  return {
    sessionId,
    message: `Session ${sessionId} created for project ${input.projectId}`,
    maxTokens: input.maxTokens,
    startTime: session.startTime,
  }
}
