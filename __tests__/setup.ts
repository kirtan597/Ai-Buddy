import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Patch next/headers in the CJS require cache so next-auth/next can call it
// without a Next.js request context
const mockHeaders = vi.fn().mockResolvedValue(new Headers());
const mockCookies = vi.fn().mockResolvedValue({ getAll: () => [] });

// Intercept require('next/headers') for CJS modules like next-auth
try {
  const Module = await import('module');
  const originalLoad = (Module as any)._load;
  if (originalLoad) {
    (Module as any)._load = function (request: string, ...args: unknown[]) {
      if (request === 'next/headers') {
        return { headers: mockHeaders, cookies: mockCookies };
      }
      return originalLoad.call(this, request, ...args);
    };
  }
} catch {
  // ignore in environments where Module._load is not available
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

if (!globalThis.fetch) {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
}
