import { useCallback, useState } from "react";

export type LeaveIntent = "close" | "back";

export function useUnsavedChanges(dirty: boolean) {
  const [intent, setIntent] = useState<LeaveIntent | null>(null);

  const request = useCallback(
    (next: LeaveIntent) => {
      if (!dirty) return true;
      setIntent(next);
      return false;
    },
    [dirty],
  );

  const dismiss = useCallback(() => setIntent(null), []);

  const confirm = useCallback(() => {
    const current = intent;
    setIntent(null);
    return current;
  }, [intent]);

  return { intent, request, dismiss, confirm };
}

export function isDraftDirty<T>(current: T, initial: T) {
  return JSON.stringify(current) !== JSON.stringify(initial);
}
