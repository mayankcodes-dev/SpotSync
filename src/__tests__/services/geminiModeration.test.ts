// ── All mocks BEFORE imports ─────────────────────────────────────────────────
process.env.GEMINI_API_KEY = 'test-gemini-api-key';

const mockGenerateContent = jest.fn();
const mockGoogleGenAI = jest.fn().mockImplementation(() => ({
  models: { generateContent: mockGenerateContent },
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAI,
  Type: { OBJECT: 'OBJECT', BOOLEAN: 'BOOLEAN', STRING: 'STRING' },
}));

import { moderateImage } from '../../services/geminiModeration';

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  mockGenerateContent.mockReset();
  mockGoogleGenAI.mockReset().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  }));

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    headers: { get: (name: string) => name === 'content-type' ? 'image/jpeg' : null },
  }) as any;
});

describe('Gemini Moderation Service', () => {
  it('returns safe for a valid camping image', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '{ "isSafe": true, "reason": "Beautiful mountain landscape relevant to camping." }',
    });

    const result = await moderateImage('https://example.com/campground.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toContain('mountain');
  });

  it('returns unsafe for an unsafe or irrelevant image', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '{ "isSafe": false, "reason": "Image contains inappropriate content." }',
    });

    const result = await moderateImage('https://example.com/bad.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('inappropriate');
  });

  it('fails closed when Gemini API throws an error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API timeout'));

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('temporarily unavailable');
  });

  it('fails closed when the response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'I cannot analyze this image.' });

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('temporarily unavailable');
  });

  it('fails closed when the image cannot be downloaded', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    const result = await moderateImage('https://example.com/broken.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('downloaded');
  });

  it('rejects malformed boolean values instead of trusting a truthy string', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '{ "isSafe": "false", "reason": "Looks unsafe." }',
    });

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('invalid decision');
  });
});
