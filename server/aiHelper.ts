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

// Enhanced mock responses database for realistic development testing
const MOCK_TONE_RESPONSES = [
  // Calm responses
  { pattern: /thank you|appreciate|grateful/i, tone: "calm", summary: "Appreciative and kind", emoji: "😊", rewording: null },
  { pattern: /sounds good|that works|perfect/i, tone: "calm", summary: "Agreement and acceptance", emoji: "😊", rewording: null },
  { pattern: /i understand|makes sense|i see/i, tone: "calm", summary: "Understanding and empathy", emoji: "😊", rewording: null },
  { pattern: /how about|what if we|maybe we could/i, tone: "calm", summary: "Thoughtful suggestion", emoji: "😊", rewording: null },
  
  // Cooperative responses
  { pattern: /let's work together|we can|together we/i, tone: "cooperative", summary: "Team-oriented approach", emoji: "🤝", rewording: null },
  { pattern: /happy to|glad to|i'd be willing/i, tone: "cooperative", summary: "Collaborative spirit", emoji: "🤝", rewording: null },
  { pattern: /great idea|good point|i agree/i, tone: "cooperative", summary: "Positive affirmation", emoji: "🤝", rewording: null },
  { pattern: /for (the kids|our child)|best for/i, tone: "cooperative", summary: "Child-focused priority", emoji: "🤝", rewording: null },
  
  // Neutral responses
  { pattern: /when|what time|schedule/i, tone: "neutral", summary: "Logistical inquiry", emoji: "😐", rewording: null },
  { pattern: /pickup|drop.?off|exchange/i, tone: "neutral", summary: "Coordination details", emoji: "😐", rewording: null },
  { pattern: /received|got it|noted/i, tone: "neutral", summary: "Simple acknowledgment", emoji: "😐", rewording: null },
  { pattern: /reminder|don't forget|please remember/i, tone: "neutral", summary: "Practical reminder", emoji: "😐", rewording: null },
  
  // Frustrated responses
  { pattern: /again\?|seriously\?|really\?!|how many times/i, tone: "frustrated", summary: "Showing impatience", emoji: "😤", rewording: "I notice this keeps coming up. Can we discuss a solution that works for both of us?" },
  { pattern: /always late|never on time|constantly/i, tone: "frustrated", summary: "Expressing annoyance", emoji: "😤", rewording: "I've noticed some timing challenges. Could we review our schedule to make transitions smoother?" },
  { pattern: /you said|you promised|you told me/i, tone: "frustrated", summary: "Pointing out inconsistency", emoji: "😤", rewording: "I remember we discussed this differently. Can we clarify our agreement?" },
  { pattern: /this is ridiculous|unbelievable|fed up/i, tone: "frustrated", summary: "High frustration level", emoji: "😤", rewording: "I'm feeling frustrated about this situation. Can we find a time to talk it through calmly?" },
  
  // Defensive responses
  { pattern: /not my fault|i didn't|you're the one/i, tone: "defensive", summary: "Deflecting responsibility", emoji: "🛡️", rewording: "Let's focus on finding a solution together rather than assigning blame." },
  { pattern: /you never|you always|typical/i, tone: "defensive", summary: "Generalizing accusations", emoji: "🛡️", rewording: "I'm concerned about this issue. Can we discuss specific examples so we can address it?" },
  { pattern: /that's not true|wrong|you're lying/i, tone: "defensive", summary: "Contradicting strongly", emoji: "🛡️", rewording: "I have a different recollection. Let's review what we agreed to together." },
  { pattern: /whatever|fine|if you say so/i, tone: "defensive", summary: "Dismissive resignation", emoji: "🛡️", rewording: "I want to make sure we're both comfortable with this decision. Can we discuss it further?" },
  
  // Hostile responses
  { pattern: /fuck|shit|damn you|asshole|bitch/i, tone: "hostile", summary: "Vulgar and aggressive", emoji: "🚨", rewording: "I'm feeling very upset right now. I need some time before we can discuss this productively." },
  { pattern: /hate you|can't stand|sick of you/i, tone: "hostile", summary: "Personal attacks", emoji: "🚨", rewording: "I'm struggling with this situation. Perhaps we could take a break and revisit this when we're calmer." },
  { pattern: /shut up|leave me alone|go to hell/i, tone: "hostile", summary: "Aggressive dismissal", emoji: "🚨", rewording: "I need some space right now. Can we continue this conversation another time?" },
  { pattern: /you're such a|pathetic|worthless|terrible parent/i, tone: "hostile", summary: "Insulting and demeaning", emoji: "🚨", rewording: "I'm very upset about this situation. Let's pause and discuss this when emotions aren't running so high." },
];

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
  
  // Try to match against enhanced response database
  for (const response of MOCK_TONE_RESPONSES) {
    if (response.pattern.test(content)) {
      return {
        tone: response.tone,
        summary: response.summary,
        emoji: response.emoji,
        rewordingSuggestion: response.rewording
      };
    }
  }
  
  // Fallback to heuristic-based detection
  const lowerContent = content.toLowerCase();
  const hasExclamation = content.includes('!');
  const hasQuestion = content.includes('?');
  const hasNegativeWords = /no|not|never|won't|can't|don't|stop/i.test(content);
  const hasPositiveWords = /yes|great|good|thanks|please|appreciate/i.test(content);
  const hasVulgarWords = /fuck|shit|damn|hell|ass|crap/i.test(content);
  const hasMultipleExclamations = (content.match(/!/g) || []).length >= 2;
  
  let tone = "neutral";
  let summary = "Matter-of-fact communication";
  let emoji = "😐";
  let rewordingSuggestion = null;
  
  if (hasVulgarWords || hasMultipleExclamations) {
    tone = "hostile";
    summary = "Aggressive language detected";
    emoji = "🚨";
    rewordingSuggestion = "This message contains strong language. Consider taking a moment to rephrase in a calmer way.";
  } else if (hasPositiveWords && !hasNegativeWords) {
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

// Enhanced mock emotion responses for call monitoring
const MOCK_EMOTION_RESPONSES = [
  { pattern: /thank|appreciate|grateful|wonderful/i, emotion: 'calm', confidence: 85, summary: 'Expressing gratitude and positivity' },
  { pattern: /together|we can|team|cooperate/i, emotion: 'cooperative', confidence: 88, summary: 'Collaborative problem-solving approach' },
  { pattern: /understand|see what you mean|that makes sense/i, emotion: 'calm', confidence: 82, summary: 'Showing understanding and empathy' },
  { pattern: /okay|fine|alright|sure/i, emotion: 'neutral', confidence: 75, summary: 'Neutral acknowledgment' },
  { pattern: /schedule|time|when|where/i, emotion: 'neutral', confidence: 78, summary: 'Discussing logistics calmly' },
  { pattern: /frustrated|annoyed|tired of|sick of/i, emotion: 'frustrated', confidence: 80, summary: 'Expressing frustration openly' },
  { pattern: /again\?|seriously\?|really\?|how many times/i, emotion: 'frustrated', confidence: 77, summary: 'Impatient questioning tone' },
  { pattern: /not my fault|i didn't|you did|your fault/i, emotion: 'defensive', confidence: 81, summary: 'Defensive blame-shifting detected' },
  { pattern: /always|never|typical|same thing/i, emotion: 'defensive', confidence: 79, summary: 'Using absolute language defensively' },
  { pattern: /you're wrong|that's not true|you're lying/i, emotion: 'tense', confidence: 83, summary: 'Contradicting with tension' },
  { pattern: /calm down|relax|chill|settle down/i, emotion: 'tense', confidence: 76, summary: 'Telling someone to calm down (escalating)' },
];

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
  
  // Try to match against enhanced response database
  for (const response of MOCK_EMOTION_RESPONSES) {
    if (response.pattern.test(transcript)) {
      return {
        emotion: response.emotion as any,
        confidence: response.confidence,
        summary: response.summary,
        timestamp: Date.now()
      };
    }
  }
  
  // Fallback to heuristic-based detection
  const lowerTranscript = transcript.toLowerCase();
  const hasStressWords = /stressed|tired|upset|frustrated|angry|annoyed/i.test(transcript);
  const hasCalmWords = /okay|fine|good|understand|agree|peaceful|happy/i.test(transcript);
  const hasCooperativeWords = /together|we|our|let's|team/i.test(transcript);
  const hasDefensiveWords = /not my|you always|you never|your fault/i.test(transcript);
  
  let emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive' = 'neutral';
  let confidence = 75;
  let summary = 'Neutral conversational tone detected';
  
  if (hasDefensiveWords) {
    emotion = 'defensive';
    confidence = 78;
    summary = 'Defensive language patterns detected';
  } else if (hasCooperativeWords && !hasStressWords) {
    emotion = 'cooperative';
    confidence = 82;
    summary = 'Collaborative and solution-focused';
  } else if (hasCalmWords && !hasStressWords) {
    emotion = 'calm';
    confidence = 80;
    summary = 'Calm and measured tone detected';
  } else if (hasStressWords) {
    emotion = 'frustrated';
    confidence = 76;
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
