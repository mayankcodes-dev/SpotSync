// Mock groq-sdk BEFORE any imports that might load it
const mockCreate = jest.fn();

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Mock env var so the service doesn't throw on import
process.env.GROQ_API_KEY = 'test-key-for-unit-tests';

import { moderateImage } from '../../services/groqModeration';

describe('Groq Moderation Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return isSafe=true for a valid campground image', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '{ "isSafe": true, "reason": "Beautiful mountain landscape relevant to camping." }',
          },
        },
      ],
    });

    const result = await moderateImage('https://example.com/campground.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toContain('mountain');
  });

  it('should return isSafe=false for an unsafe/irrelevant image', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '{ "isSafe": false, "reason": "Image contains inappropriate content." }',
          },
        },
      ],
    });

    const result = await moderateImage('https://example.com/bad.jpg');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('inappropriate');
  });

  it('should fail open (return isSafe=true) when Groq API throws an error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API timeout'));

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(true);
    expect(result.reason).toContain('unavailable');
  });

  it('should fail open when response contains no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'I cannot analyze this image.',
          },
        },
      ],
    });

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(true);
  });

  it('should handle empty choices array gracefully', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });

    const result = await moderateImage('https://example.com/test.jpg');
    expect(result.isSafe).toBe(true);
  });
});
