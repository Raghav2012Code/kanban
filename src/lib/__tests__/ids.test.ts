import { describe, expect, it } from 'vitest';
import { makeId, tailNumber } from '../ids';

describe('tailNumber', () => {
  it('compacts an id to four uppercase characters', () => {
    expect(tailNumber('card-1')).toBe('ARD1');
    expect(tailNumber('column-backlog')).toBe('KLOG');
    expect(tailNumber('a')).toBe('000A');
  });

  it('produces a stable four character tail for generated ids', () => {
    expect(tailNumber(makeId('card'))).toHaveLength(4);
  });
});
