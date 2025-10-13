import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  try {
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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistent analysis
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    return {
      emotion: parsed.emotion,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      summary: parsed.summary,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[EmotionAnalyzer] Analysis failed:', error);
    
    // Fallback to neutral if analysis fails
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
  try {
    if (emotionTimeline.length === 0) {
      return "No emotional data recorded for this session.";
    }

    // Summarize emotion distribution
    const emotionCounts = emotionTimeline.reduce((acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || 
           "Your conversation showed thoughtful communication. Keep building on these positive interactions.";
  } catch (error) {
    console.error('[EmotionAnalyzer] Summary generation failed:', error);
    return "Your conversation showed thoughtful communication. Keep building on these positive interactions.";
  }
}
