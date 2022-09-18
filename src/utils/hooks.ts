import { useCallback, useState } from "react";
import { Deferred } from "./Deferred";

export function useStartResume(callback: (wait: Promise<void>) => void) {
  const [triggerResumeDeferred, setTriggerResumeDeferred] = useState<Deferred<void>>();
  const isRunning = !!triggerResumeDeferred;

  const triggerResume = useCallback(() => {
    if (!triggerResumeDeferred) {
      return;
    }
    triggerResumeDeferred.resolve();
    setTriggerResumeDeferred(undefined);
  }, [triggerResumeDeferred]);

  const start = useCallback(() => {
    if (triggerResumeDeferred) {
      return;
    }
    const myTriggerResumeDeferred = new Deferred<void>();
    setTriggerResumeDeferred(myTriggerResumeDeferred);
    callback(myTriggerResumeDeferred.promise);
  }, [triggerResumeDeferred, callback]);

  return [isRunning, start, triggerResume] as const;
}
