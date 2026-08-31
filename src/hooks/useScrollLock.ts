import { useEffect } from "react";

let activeLockCount = 0;
let previousBodyOverflow = "";

/**
 * Locks background body scroll when a modal or overlay is active.
 * Restores original scroll behavior on unmount or when unlocked.
 * Safely handles nested modals using a shared lock counter.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (activeLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeLockCount++;

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [locked]);
}
