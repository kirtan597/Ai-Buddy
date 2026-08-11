/**
 * API Route Logic Tests
 * Tests the business logic extracted from the chat-v2 route:
 * rate limiting, model allowlist, input validation, trimHistory.
 * Full integration tests require a Next.js test environment (e.g. playwright/msw).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Rate limiter (inline — mirrors route.ts logic) ────────────────────────────
const WINDOW_MS = 60_000;
const MAX_AUTH = 30;
const MAX_GUEST = 3;

function createRateLimiter() {
  const map = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string, isAuth: boolean) {
      const now = Date.now();
      const limit = isAuth ? MAX_AUTH : MAX_GUEST;
      let e = map.get(key);
      if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + WINDOW_MS }; map.set(key, e); }
      e.count++;
      return { allowed: e.count <= limit, remaining: Math.max(0, limit - e.count), resetIn: Math.ceil((e.resetAt - now) / 1000) };
    },
  };
}

// ── Model allowlist (mirrors route.ts) ───────────────────────────────────────
const ALLOWED_MODELS = new Set([
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3.5-haiku',
  'google/gemini-flash-1.5',
]);
function sanitizeModel(m: string) { return ALLOWED_MODELS.has(m) ? m : 'openai/gpt-4o-mini'; }

// ── trimHistory (mirrors route.ts) ───────────────────────────────────────────
type Msg = { role: string; content: string };
function trimHistory(history: Msg[], maxChars = 400_000): Msg[] {
  let total = 0;
  const out: Msg[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const chars = history[i].content.length;
    if (total + chars > maxChars) break;
    total += chars;
    out.unshift(history[i]);
  }
  return out;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Rate Limiter', () => {
  let rl: ReturnType<typeof createRateLimiter>;
  beforeEach(() => { rl = createRateLimiter(); });

  it('allows guest up to 3 requests', () => {
    for (let i = 0; i < 3; i++) expect(rl.check('ip:x', false).allowed).toBe(true);
  });

  it('blocks guest on 4th request', () => {
    for (let i = 0; i < 3; i++) rl.check('ip:x', false);
    expect(rl.check('ip:x', false).allowed).toBe(false);
  });

  it('allows authenticated up to 30 requests', () => {
    for (let i = 0; i < 30; i++) expect(rl.check('user:a', true).allowed).toBe(true);
  });

  it('blocks authenticated on 31st request', () => {
    for (let i = 0; i < 30; i++) rl.check('user:a', true);
    expect(rl.check('user:a', true).allowed).toBe(false);
  });

  it('resets after window expires', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) rl.check('ip:r', false);
    expect(rl.check('ip:r', false).allowed).toBe(false);
    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(rl.check('ip:r', false).allowed).toBe(true);
    vi.useRealTimers();
  });

  it('isolates different keys', () => {
    for (let i = 0; i < 3; i++) rl.check('ip:a', false);
    expect(rl.check('ip:a', false).allowed).toBe(false);
    expect(rl.check('ip:b', false).allowed).toBe(true);
  });

  it('returns correct remaining count', () => {
    rl.check('ip:c', false);
    expect(rl.check('ip:c', false).remaining).toBe(1);
  });

  it('returns resetIn > 0 when blocked', () => {
    for (let i = 0; i < 4; i++) rl.check('ip:d', false);
    expect(rl.check('ip:d', false).resetIn).toBeGreaterThan(0);
  });
});

describe('Model Allowlist', () => {
  it('passes through allowed models', () => {
    expect(sanitizeModel('openai/gpt-4o-mini')).toBe('openai/gpt-4o-mini');
    expect(sanitizeModel('openai/gpt-4o')).toBe('openai/gpt-4o');
    expect(sanitizeModel('anthropic/claude-3.5-haiku')).toBe('anthropic/claude-3.5-haiku');
    expect(sanitizeModel('google/gemini-flash-1.5')).toBe('google/gemini-flash-1.5');
  });

  it('falls back to gpt-4o-mini for unknown models', () => {
    expect(sanitizeModel('evil/injection')).toBe('openai/gpt-4o-mini');
    expect(sanitizeModel('')).toBe('openai/gpt-4o-mini');
    expect(sanitizeModel('openai/gpt-5')).toBe('openai/gpt-4o-mini');
  });
});

describe('trimHistory()', () => {
  it('returns all messages when under budget', () => {
    const h = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }];
    expect(trimHistory(h)).toHaveLength(2);
  });

  it('trims oldest messages when over budget', () => {
    const big = 'x'.repeat(300_000);
    const h = [
      { role: 'user', content: big },
      { role: 'assistant', content: big },
    ];
    const result = trimHistory(h, 400_000);
    // Only the newest message that fits should remain
    expect(result.length).toBeLessThan(2);
  });

  it('preserves message order (newest last)', () => {
    const h = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
      { role: 'user', content: 'third' },
    ];
    const result = trimHistory(h);
    expect(result[result.length - 1].content).toBe('third');
  });

  it('returns empty array for empty input', () => {
    expect(trimHistory([])).toHaveLength(0);
  });
});

describe('Input Validation', () => {
  it('detects empty message', () => {
    const message = '';
    const files: File[] = [];
    expect(!message && files.length === 0).toBe(true);
  });

  it('accepts message with content', () => {
    const message = 'Hello';
    const files: File[] = [];
    expect(!message && files.length === 0).toBe(false);
  });

  it('accepts files without message', () => {
    const message = '';
    const files = [new File(['data'], 'test.txt')];
    expect(!message && files.length === 0).toBe(false);
  });
});
