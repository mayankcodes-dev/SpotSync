import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ModerationResult {
  isSafe: boolean;
  reason: string;
}

/**
 * Moderate an image URL using Google Gemini 1.5 Flash vision model.
 * Downloads the image and sends it inline to Gemini for content analysis.
 * Returns { isSafe: boolean, reason: string }
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    // Create client inside function so tests can mock cleanly per-call
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Fetch the image and convert to base64 (Gemini requires inline data, not URLs)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('Gemini moderation: Failed to fetch image:', imageUrl);
      return { isSafe: true, reason: 'Could not fetch image for moderation' };
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = (imageResponse.headers.get('content-type') || 'image/jpeg') as string;

    const prompt = `You are a content moderation AI for a family-friendly camping and travel platform.
Analyze this image and determine:
1. Is it safe? (no nudity, violence, offensive content, hate symbols)
2. Is it relevant to camping, nature, outdoors, or travel? (campgrounds, landscapes, nature, tents, hiking, etc.)

Respond ONLY with valid JSON in this exact format:
{
  "isSafe": true or false,
  "reason": "brief one-sentence explanation"
}

Set isSafe to true ONLY if the image is both safe AND relevant to camping/nature/travel.
Set isSafe to false if it is unsafe OR irrelevant (random selfies, food, text screenshots, etc.).`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ]);

    const content = result.response.text();

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Gemini moderation: No JSON found in response:', content);
      // Default to safe if we can't parse (fail open)
      return { isSafe: true, reason: 'Could not parse moderation response' };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ModerationResult;
    return parsed;
  } catch (err) {
    console.error('Gemini moderation error:', err);
    // Fail open — don't block upload on API error
    return { isSafe: true, reason: 'Moderation service unavailable' };
  }
}
