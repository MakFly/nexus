import { z } from 'zod'

// Session management
export const SessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  totalTokens: z.number(),
  maxTokens: z.number(),
  status: z.enum(['active', 'completed', 'failed']),
})

export type Session = z.infer<typeof SessionSchema>

// Memory storage
export const MemorySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  category: z.enum(['decision', 'context', 'code', 'error', 'solution']),
  content: z.string(),
  timestamp: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
})

export type Memory = z.infer<typeof MemorySchema>

// Checkpoints
export const CheckpointSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  timestamp: z.string(),
  contextSummary: z.string(),
  tokenCount: z.number(),
  metadata: z.record(z.any()).optional(),
})

export type Checkpoint = z.infer<typeof CheckpointSchema>

// Metrics
export const MetricSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  metricType: z.enum(['compression', 'folding', 'spawn', 'search']),
  value: z.number(),
  metadata: z.record(z.any()).optional(),
})

export type Metric = z.infer<typeof MetricSchema>
