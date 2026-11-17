import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language: one easing curve and a few variants, so every screen moves the same way.
 * Durations stay short (< 400ms): the app is a tool, animation should guide the eye, not make people wait.
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const spring: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };
export const softSpring: Transition = { type: "spring", stiffness: 240, damping: 26 };

/** Page-level enter / exit, used by the main window when switching tabs. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.16, ease: "easeIn" } },
};

/** Parent of a staggered list. */
export const staggerContainer = (stagger = 0.05, delay = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Child of a staggered list. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

/** Items entering / leaving a list (AnimatePresence + layout). */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};
