import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Inline the rate limiter logic so we can test it in isolation ──────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_AUTHENTICATED = 30;
const RATE_LIMIT_MAX_GUEST = 3;

function createRateLimiter() {
  const map = new Map<string, { count: number; resetAt: number }>();

  function check(key: string, isAuthenticated: boolean) {
    const now = Date.now();
    const limit = isAuthenticated ? RATE_LIMIT_MAX_AUTHENTICATED : RATE_LIMIT_MAX_GUEST;
    let entry = map.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      map.set(key, entry);
    }
    entry.count++;
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { check, map };
}

describe('Rate Limiter', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  it('allows requests within guest limit (3/min)', () => {
    for (let i = 0; i < 3; i++) {
      expect(limiter.check('ip:1.2.3.4', false).allowed).toBe(true);
    }
  });

  it('blocks guest after 3 requests', () => {
    for (let i = 0; i < 3; i++) limiter.check('ip:1.2.3.4', false);
    expect(limiter.check('ip:1.2.3.4', false).allowed).toBe(false);
  });

  it('allows authenticated users up to 30 requests', () => {
    for (let i = 0; i < 30; i++) {
      expect(limiter.check('user:test@example.com', true).allowed).toBe(true);
    }
  });

  it('blocks authenticated user after 30 requests', () => {
    for (let i = 0; i < 30; i++) limiter.check('user:test@example.com', true);
    expect(limiter.check('user:test@example.com', true).allowed).toBe(false);
  });

  it('returns correct remaining count', () => {
    limiter.check('ip:x', false); // 1st
    const result = limiter.check('ip:x', false); // 2nd
    expect(result.remaining).toBe(1); // 1 left before limit
  });

  it('resets counter after window expires', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) limiter.check('ip:reset', false);
    expect(limiter.check('ip:reset', false).allowed).toBe(false);

    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);
    expect(limiter.check('ip:reset', false).allowed).toBe(true);
    vi.useRealTimers();
  });

  it('isolates keys — different IPs have independent limits', () => {
    for (let i = 0; i < 3; i++) limiter.check('ip:a', false);
    expect(limiter.check('ip:a', false).allowed).toBe(false);
    expect(limiter.check('ip:b', false).allowed).toBe(true);
  });

  it('returns resetIn > 0 when blocked', () => {
    for (let i = 0; i < 4; i++) limiter.check('ip:z', false);
    const { resetIn } = limiter.check('ip:z', false);
    expect(resetIn).toBeGreaterThan(0);
  });
});
