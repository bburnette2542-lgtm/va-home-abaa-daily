import { create } from "zustand";
import { persist } from "zustand/middleware";
import { assignReportNumbersByDate, DAILIES_STORAGE_KEY, isSent, parsePersistedDailies, workflowStatus } from "./dailies";
import { dailiesPersistStorage } from "./dailies-persist";
import { completeness, newReport, type Lang, type Report } from "./report";

interface AppState {
  lang: Lang;
  reports: Report[];
  hydrated: boolean;
  setLang: (lang: Lang) => void;
  setHydrated: () => void;
  create: () => string;
  update: (id: string, patch: Partial<Report> | ((r: Report) => Report)) => void;
  remove: (id: string) => void;
  get: (id: string) => Report | undefined;
  importOne: (report: Report) => string;
  markSent: (id: string) => void;
  markNotSent: (id: string) => void;
}

function keepReports(reports: Report[]) {
  return assignReportNumbersByDate(reports);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      lang: "en",
      reports: [],
      hydrated: false,
      setLang: (lang) => set({ lang }),
      setHydrated: () => set({ hydrated: true }),
      create: () => {
        const report = newReport(0);
        set({ reports: keepReports([report, ...get().reports]) });
        return report.id;
      },
      update: (id, patch) => {
        set({
          reports: keepReports(
            get().reports.map((r) => {
              if (r.id !== id) return r;
              const next = typeof patch === "function" ? patch(r) : { ...r, ...patch };
              return { ...next, id: r.id, date: next.date || r.date, updatedAt: new Date().toISOString() };
            }),
          ),
        });
      },
      remove: (id) => set({ reports: keepReports(get().reports.filter((r) => r.id !== id)) }),
      get: (id) => get().reports.find((r) => r.id === id),
      importOne: (report) => {
        const id = report.id || `imp_${Date.now()}`;
        const date = report.date;
        const next: Report = {
          ...report,
          id,
          date,
          sentAt: typeof report.sentAt === "string" ? report.sentAt : "",
          updatedAt: new Date().toISOString(),
        };
        set({ reports: keepReports([next, ...get().reports.filter((r) => r.id !== id)]) });
        return id;
      },
      markSent: (id) => {
        const now = new Date().toISOString();
        set({
          reports: keepReports(
            get().reports.map((r) =>
              r.id === id
                ? {
                    ...r,
                    sentAt: now,
                    submittedAt: now,
                    updatedAt: now,
                    officeStatus: "waiting_signature",
                  }
                : r,
            ),
          ),
        });
      },
      markNotSent: (id) => {
        set({
          reports: keepReports(
            get().reports.map((r) =>
              r.id === id
                ? { ...r, sentAt: "", officeStatus: "draft", updatedAt: new Date().toISOString() }
                : r,
            ),
          ),
        });
      },
    }),
    {
      name: DAILIES_STORAGE_KEY,
      storage: dailiesPersistStorage(),
      partialize: (s) => ({ lang: s.lang, reports: s.reports }),
      merge: (persisted, current) => {
        const next = parsePersistedDailies(persisted);
        if (!next) return current;
        return { ...current, lang: next.lang, reports: next.reports };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function reportStatus(r: Report) {
  const flow = workflowStatus(r);
  if (flow !== "draft") return "submitted" as const;
  const c = completeness(r);
  if (isSent(r)) return "submitted" as const;
  if (r.signatureDataUrl && r.clayReady === "Y" && r.leftWithGc === "Y") return "signed" as const;
  if (c.ready) return "ready" as const;
  return "draft" as const;
}
