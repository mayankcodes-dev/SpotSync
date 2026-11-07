import { Type } from '@google/genai';

export interface ModerationResult {
  isSafe: boolean;
  reason: string;
}

// gemini-3.5-flash-lite: fast lite model (~1.6s), returns clean JSON, high free-tier quota
const MODERATION_MODEL = process.env.GEMINI_MODERATION_MODEL || 'gemini-3.5-flash-lite';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;    // 8s to download image from Cloudinary
const GEMINI_TIMEOUT_MS = 20_000;  // 20s for Gemini API call
const TOTAL_TIMEOUT_MS = 27_000;   // 27s hard cap — well under Cloudflare's 60s limit
const RETRY_DELAY_MS = 3_000;      // 3s wait before retrying on 429 rate limit
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Keep Type import to avoid unused-import errors (used for schema typing reference)
void Type;

const GEMINI_REST_URL = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const prompt =
  'You are a strict content moderation classifier for a family-friendly camping and travel platform. ' +
  'Analyze this image for BOTH safety and relevance. ' +
  'SAFETY: reject any nudity, sexual content, graphic violence, or hate symbols. ' +
  'RELEVANCE: accept only camping, campgrounds, nature, outdoors, hiking, landscapes, wildlife, or travel photos. ' +
  'People in an outdoor/nature photo are fine. ' +
  'You MUST respond with ONLY a raw JSON object — no explanation, no preamble, no markdown, no code fences. ' +
  'Output exactly one of these two objects and nothing else:\n' +
  '{"isSafe":true,"reason":"brief reason"}\n' +
  '{"isSafe":false,"reason":"brief reason"}';

function failedModeration(reason: string, error?: unknown): ModerationResult {
  if (error) {
    console.error('Gemini moderation failed:', error instanceof Error ? error.message : JSON.stringify(error));
  }
  return { isSafe: false, reason };
}

/** Sleep for ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the Gemini REST API directly (bypasses SDK which ignores responseMimeType on some models).
 * Returns raw response text or throws on error.
 */
async function callGemini(imageBuffer: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 150,
    },
  });

  try {
    const res = await fetch(GEMINI_REST_URL(MODERATION_MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    const data = await res.json() as any;

    // Surface API errors as thrown exceptions so the caller can handle 429, 503, etc.
    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download an uploaded Cloudinary image and classify it with Gemini Vision.
 * Hard-capped at TOTAL_TIMEOUT_MS so we never trigger a Cloudflare 504.
 * ALL failures (timeout, quota, 503, parse error) are FAIL-CLOSED — the
 * upload is blocked. On 429 rate-limit we retry once after RETRY_DELAY_MS.
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  // Hard total deadline — if _moderateImage takes too long, block the upload.
  const hardDeadline: Promise<ModerationResult> = new Promise((resolve) =>
    setTimeout(
      () => resolve(failedModeration(
        'Image moderation is taking too long. Please try again in a moment.',
      )),
      TOTAL_TIMEOUT_MS,
    ),
  );
  return Promise.race([_moderateImage(imageUrl), hardDeadline]);
}

async function _moderateImage(imageUrl: string): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return failedModeration('Image moderation is not configured. Please contact the administrator.');
  }

  // ── 1. Download image ──────────────────────────────────────────────────────
  const fetchController = new AbortController();
  const fetchTimer = setTimeout(() => fetchController.abort(), FETCH_TIMEOUT_MS);
  let imageBuffer: Buffer;
  let mimeType: string;

  try {
    const imageResponse = await fetch(imageUrl, { signal: fetchController.signal });
    clearTimeout(fetchTimer);
    if (!imageResponse.ok) {
      return failedModeration('Image could not be downloaded for moderation. Please try again.');
    }
    mimeType = (imageResponse.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return failedModeration('Unsupported image format. Please upload a JPG, PNG, or WebP image.');
    }
    const contentLength = Number(imageResponse.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return failedModeration('The uploaded image is too large to moderate (max 10 MB).');
    }
    imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_BYTES) {
      return failedModeration('The uploaded image is empty or too large to moderate.');
    }
  } catch (fetchErr) {
    clearTimeout(fetchTimer);
    return failedModeration(
      'Image download failed during moderation. Please try again.',
      fetchErr,
    );
  }

  // ── 2. Call Gemini — with ONE retry on 429 rate-limit ─────────────────────
  let rawText: string;
  try {
    rawText = await callGemini(imageBuffer, mimeType, apiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
    if (is429) {
      // Rate-limited — wait and try exactly once more. Still fail-closed if retry fails.
      console.warn('[Moderation] 429 rate-limit hit, retrying in', RETRY_DELAY_MS, 'ms...');
      await sleep(RETRY_DELAY_MS);
      try {
        rawText = await callGemini(imageBuffer, mimeType, apiKey);
      } catch (retryErr) {
        return failedModeration(
          'Image moderation is currently rate-limited. Please wait a minute and try again.',
          retryErr,
        );
      }
    } else {
      // 503, timeout, abort, network error — all fail-closed
      return failedModeration(
        'Image moderation is temporarily unavailable. Please try again in a few minutes.',
        err,
      );
    }
  }

  // ── 3. Parse and return result ─────────────────────────────────────────────
  if (!rawText) {
    return failedModeration('Image moderation returned no decision. Please try again.');
  }

  /** Try to parse a ModerationResult from a raw string. Returns null on failure. */
  function tryParse(text: string): ModerationResult | null {
    try {
      const parsed = JSON.parse(text) as { isSafe?: unknown; reason?: unknown };
      if (typeof parsed.isSafe !== 'boolean' || typeof parsed.reason !== 'string') return null;
      const reason = parsed.reason.trim().slice(0, 300) || 'No reason provided.';
      return { isSafe: parsed.isSafe, reason };
    } catch {
      return null;
    }
  }

  // First try: direct parse
  const direct = tryParse(rawText);
  if (direct) return direct;

  // Second try: extract the LARGEST complete {...} JSON block from prose responses.
  // Use greedy match so we capture the full object, not just the first fragment.
  // e.g. Gemini says: "Here is the analysis: {\"isSafe\": true, \"reason\": \"...\"}"
  const match = rawText.match(/\{[\s\S]*\}/);
  if (match) {
    const extracted = tryParse(match[0]);
    if (extracted) {
      console.warn('[Moderation] Extracted JSON from prose response — model ignored JSON schema constraint.');
      return extracted;
    }
  }

  // Third try: keyword inference on plain-text responses.
  // IMPORTANT: only run this on text that looks like actual prose, NOT on
  // truncated/partial JSON fragments (e.g. '{"isSafe":' would falsely look "safe").
  // Guard: skip keyword inference when the response starts with '{' (it's a broken JSON).
  const trimmed = rawText.trim();
  const looksLikeBrokenJson = trimmed.startsWith('{') || trimmed.startsWith('[');

  if (!looksLikeBrokenJson) {
    const lower = trimmed.toLowerCase();
    const isUnsafe =
      lower.includes('nudity') ||
      lower.includes('nude') ||
      lower.includes('explicit') ||
      lower.includes('sexual') ||
      lower.includes('unsafe') ||
      lower.includes('not safe') ||
      lower.includes('not appropriate') ||
      lower.includes('not relevant') ||
      lower.includes('violence') ||
      lower.includes('hate');
    const inferredSafe =
      !isUnsafe &&
      (lower.includes('safe') || lower.includes('relevant') || lower.includes('camping') || lower.includes('nature'));

    if (inferredSafe) {
      console.warn('[Moderation] Keyword-inferred SAFE from prose response:', trimmed.slice(0, 120));
      return { isSafe: true, reason: 'Image appears safe (inferred from moderation response).' };
    }
    if (isUnsafe) {
      console.warn('[Moderation] Keyword-inferred UNSAFE from prose response:', trimmed.slice(0, 120));
      return { isSafe: false, reason: 'Image appears unsafe (inferred from moderation response).' };
    }
  }

  // All parsing failed — fail-closed
  console.error('[Moderation] Could not parse Gemini response:', rawText.slice(0, 200));
  return failedModeration('Image moderation response could not be read. Please upload a relevant camping or nature photo.');
}
