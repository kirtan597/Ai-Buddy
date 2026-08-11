import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'keep')).toBe('base keep');
  });

  it('handles undefined/null gracefully', () => {
    expect(cn(undefined, null, 'valid')).toBe('valid');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});
