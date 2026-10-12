import type { ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { studyEntry, studyExit, studyMotion, studyTransition } from "./motionTokens";

/** A single configuration across marketing, the gated app and all tools. */
export function StudyMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: studyMotion.standard, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionConfig>
  );
}

/** Navigation does not remount the persistent Siri orb, billing gate or parent state. */
export function StudyViewTransition({
  view, children,
}: { view: string; children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.div
        key={view}
        className="study-motion-view"
        initial={studyEntry(reduced)}
        animate={{ opacity: 1, y: 0 }}
        exit={studyExit(reduced)}
        transition={studyTransition(reduced)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** For low-frequency UI panels, never a payment-authorisation decision. */
export function StudyMotionPanel({
  id, children,
}: { id: string; children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={id}
        className="study-motion-panel"
        initial={studyEntry(reduced, 7)}
        animate={{ opacity: 1, y: 0 }}
        exit={studyExit(reduced)}
        transition={studyTransition(reduced, "fast")}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function StudyReveal({
  children, delay = 0, className,
}: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      className={className}
      initial={studyEntry(reduced, 9)}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -6% 0px" }}
      transition={{ ...studyTransition(reduced, "reveal"), delay: reduced ? 0 : Math.min(0.18, Math.max(0, delay)) }}
    >
      {children}
    </motion.div>
  );
}
