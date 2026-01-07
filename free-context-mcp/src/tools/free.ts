import { z } from 'zod'
import { RalphDatabase } from '../storage/database.js'

export const FreeInputSchema = z.object({
  sessionId: z.string().describe('Session identifier to terminate'),
})

export async function ralphFree(input: z.infer<typeof FreeInputSchema>, db: RalphDatabase) {
  const session = db.getSession(input.sessionId)

  if (!session) {
    throw new Error(`Session ${input.sessionId} not found`)
  }

  db.closeSession(input.sessionId)

  const startTime = new Date(session.start_time).getTime()
  const endTime = new Date().getTime()
  const duration = endTime - startTime

  return {
    message: `Session ${input.sessionId} terminated`,
    sessionId: input.sessionId,
    totalTokens: session.total_tokens,
    duration: duration,
  }
}
