import type { Transition, Variants } from 'motion/react';

export const motionTransition: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.7,
};

export const reducedMotionTransition: Transition = {
  duration: 0,
};

export const columnVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export const formVariants: Variants = {
  hidden: { opacity: 0, height: 0, y: -8 },
  visible: { opacity: 1, height: 'auto', y: 0 },
  exit: { opacity: 0, height: 0, y: -8 },
};
