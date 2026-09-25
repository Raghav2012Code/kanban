import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { motionTransition, reducedMotionTransition } from '../../lib/motion';
import { useMotionTransition } from '../useMotionTransition';

const reducedMotion = vi.hoisted(() => ({ value: false }));

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

beforeEach(() => {
  reducedMotion.value = false;
});

describe('useMotionTransition', () => {
  it('uses the spring transition by default', () => {
    const { result } = renderHook(() => useMotionTransition());
    expect(result.current).toBe(motionTransition);
  });

  it('collapses to a no-duration transition when the user prefers reduced motion', () => {
    reducedMotion.value = true;
    const { result } = renderHook(() => useMotionTransition());
    expect(result.current).toBe(reducedMotionTransition);
  });
});
