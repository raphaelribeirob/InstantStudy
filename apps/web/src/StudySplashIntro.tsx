import { useEffect, useState } from "react";
import "./study-splash.css";

type StudySplashIntroProps = {
  onComplete: () => void;
};

/**
 * The app's one-shot launch mark. The CSS morph is deliberately self-contained:
 * it doesn't move, remount, or modify the persistent Orb/learning state.
 */
export function StudySplashIntro({ onComplete }: StudySplashIntroProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reducedMotion ? 80 : 1600;
    const exitMs = reducedMotion ? 0 : 230;
    const exitTimer = window.setTimeout(() => setLeaving(true), holdMs);
    const finishTimer = window.setTimeout(onComplete, holdMs + exitMs);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`study-splash${leaving ? " study-splash--leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="InstantStudy opening animation"
    >
      <div className="study-splash__pill" role="img" aria-label="InstantStudy becomes IStudy">
        <div className="study-splash__word study-splash__word--full" aria-hidden="true">
          <span className="study-splash__regular">Instant</span><span className="study-splash__medium">Study</span><sup>™</sup>
        </div>
        <div className="study-splash__word study-splash__word--short" aria-hidden="true">
          <span className="study-splash__regular">I</span><span className="study-splash__medium">Study</span><sup>™</sup>
        </div>
      </div>
      <button
        className="study-splash__skip"
        type="button"
        onClick={onComplete}
        aria-label="Skip opening animation"
      >
        Skip
      </button>
    </div>
  );
}
