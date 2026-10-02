import type { PersistStorage, StorageValue } from "zustand/middleware";
import { DAILIES_STORAGE_KEY, parsePersistedDailies, wouldWipeSavedDailies } from "./dailies.ts";
import type { Lang } from "./report.ts";
import type { Report } from "./report.ts";

export type PersistedDailies = {
  lang: Lang;
  reports: Report[];
};

let persistBlocked = false;

function readRaw(name: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

export function readPersistedDailies(raw: string | null) {
  if (raw == null) return null;
  return parsePersistedDailies(raw);
}

export function dailiesPersistStorage(): PersistStorage<PersistedDailies> {
  return {
    getItem: (name) => {
      const raw = readRaw(name);
      if (raw == null) {
        persistBlocked = false;
        return null;
      }
      try {
        const parsed = JSON.parse(raw) as StorageValue<PersistedDailies>;
        const normalized = parsePersistedDailies(parsed);
        if (!normalized) {
          persistBlocked = true;
          console.error("[dailies] saved data could not be read; leaving localStorage as-is");
          return null;
        }
        persistBlocked = false;
        return {
          ...parsed,
          state: {
            ...(parsed.state ?? {}),
            lang: normalized.lang,
            reports: normalized.reports,
          },
        };
      } catch {
        persistBlocked = true;
        console.error("[dailies] saved data could not be read; leaving localStorage as-is");
        return null;
      }
    },
    setItem: (name, value) => {
      if (persistBlocked && name === DAILIES_STORAGE_KEY) return;
      if (typeof localStorage === "undefined") return;
      const text = JSON.stringify(value);
      const existing = readRaw(name);
      if (name === DAILIES_STORAGE_KEY && wouldWipeSavedDailies(existing, text)) {
        console.error("[dailies] refusing to overwrite saved dailies with an empty list");
        return;
      }
      localStorage.setItem(name, text);
    },
    removeItem: (name) => {
      if (name === DAILIES_STORAGE_KEY) return;
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(name);
    },
  };
}

export function resetPersistGuardForTests() {
  persistBlocked = false;
}
