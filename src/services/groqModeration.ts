import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ModerationResult {
  isSafe: boolean;
  reason: string;
}

/**
 * Moderate an image URL using Groq llama-3.2-11b-vision-preview.
 * Returns { isSafe: boolean, reason: string }
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a content moderation AI. Analyze the following image and determine:
1. Is it safe for a family-friendly camping/travel platform? (no nudity, violence, offensive content)
2. Is it relevant to camping, nature, outdoors, or travel? (campgrounds, landscapes, nature, tents, hikes, etc.)

Respond ONLY with valid JSON in this exact format:
{
  "isSafe": true or false,
  "reason": "brief one-sentence explanation"
}

If the image is safe AND relevant to camping/nature/travel, set isSafe to true.
If the image is unsafe OR irrelevant (e.g., random selfies, food close-ups, etc.), set isSafe to false.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Groq moderation: No JSON found in response:', content);
      // Default to safe if we can't parse (fail open)
      return { isSafe: true, reason: 'Could not parse moderation response' };
    }

    const result = JSON.parse(jsonMatch[0]) as ModerationResult;
    return result;
  } catch (err) {
    console.error('Groq moderation error:', err);
    // Fail open — don't block upload on API error
    return { isSafe: true, reason: 'Moderation service unavailable' };
  }
}
