/**
 * Automation Module Index
 *
 * Exports all automation functions for easy importing
 */

// Auto-context
export {
  extractKeywords,
  calculateKeywordSimilarity,
  analyzeAndSuggestContext,
  createAutoContext,
  getActiveContext,
  getRecentContexts,
  setActiveContext,
  clearActiveContext,
  processPromptWithContext,
} from './auto-context.js';

export type { AutoContextConfig } from './auto-context.js';

// Auto-save
export {
  detectImportantContent,
  extractTitle,
  autoSaveContent,
  processConversationForAutoSave,
} from './auto-save.js';

export type { AutoSaveConfig } from './auto-save.js';

// Smart search
export {
  smartSearch,
  getSearchSuggestions,
  getSearchAnalytics,
} from './smart-search.js';

export type { SmartSearchConfig } from './smart-search.js';

// Auto-relationships
export {
  findSimilarMemories,
  createRelationship,
  autoCreateRelationships,
  getRelationshipGraph,
  suggestRelationshipsBatch,
} from './auto-relations.js';

export type { AutoRelationshipsConfig } from './auto-relations.js';
