import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeId, tailNumber } from '../ids';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tailNumber', () => {
  it('compacts an id to four uppercase characters', () => {
    expect(tailNumber('card-1')).toBe('ARD1');
    expect(tailNumber('column-backlog')).toBe('KLOG');
    expect(tailNumber('a')).toBe('000A');
  });

  it('produces a stable four character tail for generated ids', () => {
    expect(tailNumber(makeId('card'))).toHaveLength(4);
  });

  it('falls back to random bytes when randomUUID is unavailable, as on plain HTTP', () => {
    let seed = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array): Uint8Array => {
        for (let index = 0; index < array.length; index += 1) array[index] = (seed + index) % 256;
        seed += 1;
        return array;
      },
    });
    const first = makeId('card');
    const second = makeId('card');
    expect(first).toMatch(/^card-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first).not.toBe(second);
    expect(tailNumber(first)).toHaveLength(4);
  });
});
