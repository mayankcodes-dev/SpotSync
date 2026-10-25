// ── All mocks BEFORE imports ─────────────────────────────────────────────────
process.env.GEMINI_API_KEY = 'test-gemini-api-key';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});
const mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

jest.mock('@google/generative-ai', () => ({
  // The factory is called fresh on each require, but the mock fns persist
  get GoogleGenerativeAI() { return mockGoogleGenerativeAI; },
}));

import { moderateImage } from '../../services/geminiModeration';

// Helper: build the Gemini response shape
const geminiResponse = (text: string) => ({
  response: { text: () => text },
});

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  // Reset call history but KEEP mock implementations
  mockGenerateContent.mockReset();
  mockGetGenerativeModel.mockReset().mockReturnValue({ generateContent: mockGenerateContent });
  mockGoogleGenerativeAI.mockReset().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));

  // Fresh fetch mock that succeeds
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    headers: { get: () => 'image/jpeg' },
  }) as any;
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Gemini Moderation Service', () => {
  it('should return isSafe=true for a valid camping image', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse('{ "isSafe": true, "reason": "Beautiful mountain landscape relevant to camping." }')
    );

    const result = await moderateImage('https://example.com/campground.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toContain('mountain');
  });

  it('should return isSafe=false for an unsafe/irrelevant image', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse('{ "isSafe": false, "reason": "Image contains inappropriate content." }')
    );

    const result = await moderateImage('https://example.com/bad.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('inappropriate');
  });

  it('should fail open (return isSafe=true) when Gemini API throws an error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API timeout'));

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toContain('unavailable');
  });

  it('should fail open when response contains no JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse('I cannot analyze this image.')
    );

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toContain('parse');
  });

  it('should fail open when fetch fails to download the image', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    const result = await moderateImage('https://example.com/broken.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toMatch(/fetch|moderation/i);
  });
});
