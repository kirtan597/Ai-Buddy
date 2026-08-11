import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('generateImage()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('OPENROUTER_API_KEY_IMAGE', 'test-key');
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
  });

  it('returns error when API key is missing', async () => {
    vi.stubEnv('OPENROUTER_API_KEY_IMAGE', '');
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a cat');
    expect(result.error).toMatch(/not configured/i);
  });

  it('extracts image_url from multimodal content parts', async () => {
    const mockData = {
      choices: [{
        message: {
          content: [{ type: 'image_url', image_url: { url: 'https://example.com/img.png' } }],
        },
      }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(mockData)));
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a cat');
    expect(result.url).toBe('https://example.com/img.png');
  });

  it('extracts base64 inline image from content parts', async () => {
    const mockData = {
      choices: [{
        message: {
          content: [{ type: 'image', data: 'abc123', mime_type: 'image/png' }],
        },
      }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(mockData)));
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a dog');
    expect(result.url).toBe('data:image/png;base64,abc123');
  });

  it('extracts URL from plain string content', async () => {
    const mockData = {
      choices: [{
        message: { content: 'Here is your image: https://cdn.example.com/gen.jpg' },
      }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(mockData)));
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a bird');
    expect(result.url).toBe('https://cdn.example.com/gen.jpg');
  });

  it('returns error on non-ok API response', async () => {
    const errBody = { error: { message: 'Quota exceeded' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(errBody, false, 429)));
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a tree');
    expect(result.error).toMatch(/429/);
  });

  it('returns error when no message in response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse({ choices: [] })));
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a house');
    expect(result.error).toBeTruthy();
  });

  it('handles fetch exceptions gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    const { generateImage } = await import('@/lib/media-generation');
    const result = await generateImage('a car');
    expect(result.error).toBe('Network failure');
  });
});

describe('generateVideo()', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('OPENROUTER_API_KEY_VIDEO', 'test-video-key');
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
  });

  it('returns error when video API key is missing', async () => {
    vi.stubEnv('OPENROUTER_API_KEY_VIDEO', '');
    const { generateVideo } = await import('@/lib/media-generation');
    const result = await generateVideo('a sunset');
    expect(result.error).toMatch(/not configured/i);
  });

  it('extracts video URL from string content', async () => {
    const mockData = {
      choices: [{ message: { content: 'https://cdn.example.com/video.mp4' } }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(mockData)));
    const { generateVideo } = await import('@/lib/media-generation');
    const result = await generateVideo('a sunset');
    expect(result.url).toBe('https://cdn.example.com/video.mp4');
  });

  it('handles fetch exceptions gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timeout')));
    const { generateVideo } = await import('@/lib/media-generation');
    const result = await generateVideo('a wave');
    expect(result.error).toBe('Timeout');
  });
});
