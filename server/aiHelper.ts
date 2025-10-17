import NodeCache from "node-cache";

/**
 * AI Helper - Centralized utilities for dev mode protection and cost optimization
 */

// Cache for AI responses (default 5 min TTL)
const cacheTTL = parseInt(process.env.CACHE_TTL || "300", 10);
export const aiCache = new NodeCache({ 
  stdTTL: cacheTTL, 
  checkperiod: 120,
  useClones: false // Performance optimization
});

/**
 * Check if we're in development mode and should use mock responses
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.ALLOW_DEV_AI;
}

/**
 * Get max completion tokens with safety cap
 */
export function getMaxTokens(defaultTokens: number = 128): number {
  const maxTokens = parseInt(process.env.MAX_COMPLETION_TOKENS || String(defaultTokens), 10);
  const safeMax = 512; // Safety cap to prevent runaway costs
  
  if (maxTokens > safeMax) {
    console.warn(`[Token Budget] Requested ${maxTokens} tokens, capping at ${safeMax}`);
  }
  
  return Math.min(maxTokens, safeMax);
}

/**
 * Log token usage for cost tracking
 */
export function logTokenUsage(endpoint: string, estimatedTokens: number, cached: boolean = false): void {
  if (process.env.LOG_TOKEN_USAGE === "true") {
    const status = cached ? "CACHED" : "API_CALL";
    console.log(`[Token Usage] ${endpoint} - ${status} - ~${estimatedTokens} tokens`);
  }
}

/**
 * Generate mock tone analysis response for dev mode
 */
export function mockToneAnalysis(content: string): {
  tone: string;
  summary: string;
  emoji: string;
  rewordingSuggestion: string | null;
} {
  console.log("[Mock Mode] Returning simulated tone analysis");
  
  // Basic heuristic for more realistic mocks
  const lowerContent = content.toLowerCase();
  const hasExclamation = content.includes('!');
  const hasQuestion = content.includes('?');
  const hasNegativeWords = /no|not|never|won't|can't|don't|stop/i.test(content);
  const hasPositiveWords = /yes|great|good|thanks|please|appreciate/i.test(content);
  
  let tone = "neutral";
  let summary = "Matter-of-fact communication";
  let emoji = "😐";
  let rewordingSuggestion = null;
  
  if (hasPositiveWords && !hasNegativeWords) {
    tone = "cooperative";
    summary = "Collaborative and positive";
    emoji = "🤝";
  } else if (hasNegativeWords && hasExclamation) {
    tone = "frustrated";
    summary = "Shows some frustration";
    emoji = "😤";
    rewordingSuggestion = "Try rephrasing with more neutral language to keep the conversation constructive.";
  } else if (hasQuestion) {
    tone = "neutral";
    summary = "Seeking information";
    emoji = "😐";
  } else if (hasExclamation && !hasNegativeWords) {
    tone = "calm";
    summary = "Enthusiastic but peaceful";
    emoji = "😊";
  }
  
  return { tone, summary, emoji, rewordingSuggestion };
}

/**
 * Generate mock emotion analysis for call monitoring
 */
export function mockEmotionAnalysis(transcript: string): {
  emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive';
  confidence: number;
  summary: string;
  timestamp: number;
} {
  console.log("[Mock Mode] Returning simulated emotion analysis");
  
  // Basic heuristic for realistic emotion detection
  const lowerTranscript = transcript.toLowerCase();
  const hasStressWords = /stressed|tired|upset|frustrated|angry/i.test(transcript);
  const hasCalmWords = /okay|fine|good|understand|agree/i.test(transcript);
  
  let emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive' = 'neutral';
  let confidence = 75;
  let summary = 'Neutral conversational tone detected';
  
  if (hasCalmWords) {
    emotion = 'calm';
    confidence = 80;
    summary = 'Calm and measured tone detected';
  } else if (hasStressWords) {
    emotion = 'frustrated';
    confidence = 70;
    summary = 'Some frustration detected in speech';
  }
  
  return {
    emotion,
    confidence,
    summary,
    timestamp: Date.now()
  };
}

/**
 * Generate mock session summary
 */
export function mockSessionSummary(emotionCount: number): string {
  console.log("[Mock Mode] Returning simulated session summary");
  
  return `Your conversation showed thoughtful communication throughout. ${
    emotionCount > 5 
      ? "You maintained good emotional awareness across the discussion." 
      : "Keep building on these positive interactions."
  } Remember, every conversation is an opportunity to strengthen your co-parenting relationship.`;
}

/**
 * Create cache key from content
 */
export function createCacheKey(prefix: string, content: string): string {
  // Normalize content for better cache hits
  const normalized = content.trim().toLowerCase();
  return `${prefix}:${normalized}`;
}
