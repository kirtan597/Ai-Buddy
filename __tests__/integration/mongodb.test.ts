import { describe, it, expect, vi } from 'vitest';

/**
 * dbConnect() tests — URI validation and error handling.
 * Caching tests are skipped here because mongoose (CJS) cannot be mocked
 * via vi.doMock in vmForks ESM mode; use integration/e2e tests for those.
 */

describe('dbConnect()', () => {
  it('throws when MONGODB_URI is not set', async () => {
    vi.resetModules();
    vi.doMock('mongoose', () => ({ default: { connect: vi.fn() } }));
    const saved = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URI;
    (global as any)._mongooseCache = { conn: null, promise: null };
    const { default: dbConnect } = await import('@/lib/mongodb');
    await expect(dbConnect()).rejects.toThrow(/MONGODB_URI/);
    if (saved) process.env.MONGODB_URI = saved;
  });

  it('throws with helpful message mentioning .env.local', async () => {
    vi.resetModules();
    vi.doMock('mongoose', () => ({ default: { connect: vi.fn() } }));
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URI;
    (global as any)._mongooseCache = { conn: null, promise: null };
    const { default: dbConnect } = await import('@/lib/mongodb');
    await expect(dbConnect()).rejects.toThrow(/.env.local/);
  });
});
