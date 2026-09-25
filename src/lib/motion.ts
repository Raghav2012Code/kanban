import type { Transition } from 'motion/react';

export const motionTransition: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.7,
};

export const reducedMotionTransition: Transition = {
  duration: 0,
};
