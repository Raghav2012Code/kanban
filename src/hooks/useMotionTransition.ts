import { useReducedMotion } from 'motion/react';
import { motionTransition, reducedMotionTransition } from '../lib/motion';
import type { Transition } from 'motion/react';

export function useMotionTransition(): Transition {
  return useReducedMotion() ? reducedMotionTransition : motionTransition;
}
