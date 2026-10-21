import type { Transition } from 'motion/react';

/**
 * One calm transition for the whole board: a short tween on the house ease-out.
 * The light system reads as precision, not play, so nothing springs and nothing
 * bounces — a panel arrives in under 200ms and stops.
 */
export const motionTransition: Transition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1],
};

export const reducedMotionTransition: Transition = {
  duration: 0,
};
