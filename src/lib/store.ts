import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  submit: (id: string) => void;
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
        const report = newReport(get().reports.length);
        set({ reports: [report, ...get().reports] });
        return report.id;
      },
      update: (id, patch) => {
        set({
          reports: get().reports.map((r) => {
            if (r.id !== id) return r;
            const next = typeof patch === "function" ? patch(r) : { ...r, ...patch };
            return { ...next, updatedAt: new Date().toISOString() };
          }),
        });
      },
      remove: (id) => set({ reports: get().reports.filter((r) => r.id !== id) }),
      get: (id) => get().reports.find((r) => r.id === id),
      importOne: (report) => {
        const id = report.id || `imp_${Date.now()}`;
        const next: Report = { ...report, id, updatedAt: new Date().toISOString() };
        set({ reports: [next, ...get().reports.filter((r) => r.id !== id)] });
        return id;
      },
      submit: (id) => {
        set({
          reports: get().reports.map((r) =>
            r.id === id
              ? { ...r, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : r,
          ),
        });
      },
    }),
    {
      name: "va-home-abaa-dailies",
      partialize: (s) => ({ lang: s.lang, reports: s.reports }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function reportStatus(r: Report) {
  const c = completeness(r);
  if (r.submittedAt) return "submitted" as const;
  if (r.signatureDataUrl && r.clayReady === "Y" && r.leftWithGc === "Y") return "signed" as const;
  if (c.ready) return "ready" as const;
  return "draft" as const;
}
