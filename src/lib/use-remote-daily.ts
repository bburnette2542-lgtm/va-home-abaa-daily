import { useEffect, useState } from "react";
import { getOfficeDailyFn } from "./dailies.functions";
import type { Report } from "./report";
import { useAppStore } from "./store";
import { useHydrated } from "./use-hydrated";

export function isOfficeLoginError(err: unknown) {
  return err instanceof Error && err.message === "Office login required";
}

export function useLocalOrOfficeDaily(id: string) {
  const hydrated = useHydrated();
  const local = useAppStore((s) => s.reports.find((r) => r.id === id));
  const [remote, setRemote] = useState<Report | null>(null);
  const [needOffice, setNeedOffice] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || local) return;
    let cancelled = false;
    setLoading(true);
    void getOfficeDailyFn({ data: { id } })
      .then((report) => {
        if (!cancelled) setRemote(report);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isOfficeLoginError(err)) setNeedOffice(true);
        else setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, id, local]);

  return {
    hydrated,
    report: local ?? remote ?? undefined,
    fromLocal: Boolean(local),
    needOffice,
    missing,
    loading: !hydrated || (!local && loading),
  };
}
