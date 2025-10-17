import OpenAI from "openai";
import { aiCache, isDevMode, getMaxTokens, logTokenUsage, mockEmotionAnalysis, mockSessionSummary, createCacheKey } from "./aiHelper";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface EmotionResult {
  emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive';
  confidence: number; // 0-100
  summary: string;
  timestamp: number;
}

/**
 * Analyze emotional tone from transcript using GPT-3.5-turbo
 */
export async function analyzeEmotion(
  transcript: string,
  context?: string
): Promise<EmotionResult> {
  // Dev mode protection - return mock response to avoid token usage
  if (isDevMode()) {
    return mockEmotionAnalysis(transcript);
  }

  // Check cache first
  const cacheKey = createCacheKey('emotion', context ? `${context}:${transcript}` : transcript);
  const cached = aiCache.get<EmotionResult>(cacheKey);
  
  if (cached) {
    logTokenUsage('analyzeEmotion', 150, true);
    return { ...cached, timestamp: Date.now() }; // Update timestamp
  }

  try {
    const maxTokens = getMaxTokens(150);
    
    const systemPrompt = `You are an empathetic AI assistant analyzing emotional tone in co-parenting conversations.

Analyze the emotional tone of the transcript and classify it into ONE of these categories:
- calm: Peaceful, measured, understanding tone
- cooperative: Collaborative, solution-oriented, positive
- neutral: Factual, informational, no strong emotion
- frustrated: Impatient, annoyed, slightly negative
- tense: Strained, uncomfortable, conflict present
- defensive: Protective, reactive, guarded

Provide:
1. The emotion category
2. Confidence level (0-100)
3. A brief 1-sentence summary explaining why

Respond ONLY in this JSON format:
{"emotion": "category", "confidence": number, "summary": "explanation"}`;

    const userPrompt = context 
      ? `Context: ${context}\n\nTranscript: "${transcript}"`
      : `Transcript: "${transcript}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Updated to gpt-4o-mini via Replit AI integration
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);

    const result = {
      emotion: parsed.emotion,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      summary: parsed.summary,
      timestamp: Date.now(),
    };

    // Cache the result (without timestamp for better cache hits)
    aiCache.set(cacheKey, { ...result, timestamp: 0 });
    logTokenUsage('analyzeEmotion', maxTokens, false);

    return result;
  } catch (error) {
    console.error('[EmotionAnalyzer] Analysis failed:', error);
    
    return {
      emotion: 'neutral',
      confidence: 0,
      summary: 'Unable to analyze emotion',
      timestamp: Date.now(),
    };
  }
}

/**
 * Generate end-of-session emotional summary
 */
export async function generateSessionSummary(
  emotionTimeline: EmotionResult[]
): Promise<string> {
  if (emotionTimeline.length === 0) {
    return "No emotional data recorded for this session.";
  }

  // Dev mode protection - return mock summary
  if (isDevMode()) {
    return mockSessionSummary(emotionTimeline.length);
  }

  try {
    // Summarize emotion distribution for caching key
    const emotionCounts = emotionTimeline.reduce((acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create cache key from emotion distribution
    const cacheKey = createCacheKey('summary', JSON.stringify(emotionCounts));
    const cached = aiCache.get<string>(cacheKey);
    
    if (cached) {
      logTokenUsage('generateSessionSummary', 200, true);
      return cached;
    }

    const maxTokens = getMaxTokens(200);

    const timelineText = emotionTimeline
      .map((e) => `${e.emotion} (${e.confidence}%): ${e.summary}`)
      .join('\n');

    const systemPrompt = `You are an empathetic AI assistant providing supportive feedback for co-parenting communication.

Based on the emotional timeline of a conversation, provide:
1. A warm, encouraging summary (2-3 sentences)
2. Highlight positive moments
3. Gently acknowledge challenges if present
4. End with constructive encouragement

Keep tone supportive, non-judgmental, and focused on progress.`;

    const userPrompt = `Emotional Timeline:\n${timelineText}\n\nDistribution: ${JSON.stringify(emotionCounts)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Updated to gpt-4o-mini via Replit AI integration
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const summary = response.choices[0]?.message?.content?.trim() || 
           "Your conversation showed thoughtful communication. Keep building on these positive interactions.";
    
    // Cache the summary
    aiCache.set(cacheKey, summary);
    logTokenUsage('generateSessionSummary', maxTokens, false);

    return summary;
  } catch (error) {
    console.error('[EmotionAnalyzer] Summary generation failed:', error);
    return "Your conversation showed thoughtful communication. Keep building on these positive interactions.";
  }
}
