import { useEffect, useState } from "react";
import { useAppStore } from "./store";

export function useHydrated() {
  const flag = useAppStore((s) => s.hydrated);
  const [ready, setReady] = useState(() => useAppStore.persist.hasHydrated());
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return useAppStore.persist.onFinishHydration(() => setReady(true));
  }, []);
  return flag || ready;
}
