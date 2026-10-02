import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILIES_STORAGE_KEY,
  assignReportNumbersByDate,
  blobPathInDateRange,
  dailyBlobPath,
  filterBlobPathsByDateRange,
  isSent,
  officeEmailText,
  officeSummaryRow,
  parseDailyBlobPath,
  parsePersistedDailies,
  sendReportsInOrder,
  sentStatus,
  submitDailyToOffice,
  wouldWipeSavedDailies,
} from "./dailies.ts";
import { dailiesPersistStorage, resetPersistGuardForTests } from "./dailies-persist.ts";
import { officeCookieValid, officeCookieValue, passcodeMatches } from "./office-pass.ts";
import { canSubmit, completeness, newReport, reportGaps, testWarnings, type Report } from "./report.ts";

const OLD_DAILY_A = {
  id: "arnold-east-2026-08-31",
  createdAt: "2026-08-31T11:02:00.000Z",
  updatedAt: "2026-08-31T18:40:00.000Z",
  sample: false,
  crewNumber: "1",
  crewOf: "1",
  jobSiteReportNo: "1",
  date: "2026-08-31",
  filledBy: "Arnold",
  onSite: ["Arnold", "Clay Butner"],
  projectName: "Virginia Home",
  contractor: "James River Exteriors",
  license: "306906",
  substrateType: "Densglass - Glassroc",
  substrateTemp: "72",
  ambientTemp: "78",
  surfacePrep: "Clean and dry",
  comments: "East elevation A to B",
  photos: [
    {
      id: "photo-east-1",
      kind: "substrate",
      caption: "East Densglass",
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    },
  ],
  submittedAt: "2026-08-31T18:41:00.000Z",
} as unknown as Report;

const OLD_DAILY_B = {
  id: "arnold-north-2026-09-02",
  createdAt: "2026-09-02T10:15:00.000Z",
  updatedAt: "2026-09-02T16:05:00.000Z",
  sample: false,
  crewNumber: "1",
  crewOf: "1",
  jobSiteReportNo: "2",
  date: "2026-09-02",
  filledBy: "Arnold",
  onSite: ["Arnold"],
  projectName: "Virginia Home",
  contractor: "James River Exteriors",
  license: "306906",
  substrateTemp: "68",
  photos: [
    {
      id: "photo-north-1",
      kind: "mils",
      caption: "16 wet mils",
      dataUrl: "data:image/png;base64,old-north-photo",
    },
    {
      id: "photo-north-2",
      kind: "adhesion",
      caption: "185 psi",
      dataUrl: "data:image/png;base64,old-north-adh",
    },
  ],
  submittedAt: "",
} as unknown as Report;

/** Exact zustand persist shape from the live app before this change. No sentAt. */
const OLD_LOCALSTORAGE_PAYLOAD = JSON.stringify({
  state: {
    lang: "en",
    reports: [OLD_DAILY_A, OLD_DAILY_B],
  },
  version: 0,
});

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
  });
  return store;
}

describe("blob key naming", () => {
  it("uses dailies/YYYY-MM-DD_R#_id.json", () => {
    assert.equal(
      dailyBlobPath({ date: "2026-08-31", jobSiteReportNo: "1", id: "arnold-east-2026-08-31" }),
      "dailies/2026-08-31_R1_arnold-east-2026-08-31.json",
    );
  });

  it("sanitizes odd report numbers and parses them back", () => {
    const path = dailyBlobPath({ date: "2026-09-02", jobSiteReportNo: "2/b", id: "id_abc_def" });
    assert.equal(path, "dailies/2026-09-02_R2_b_id_abc_def.json");
    const parsed = parseDailyBlobPath(path);
    assert.deepEqual(parsed, {
      pathname: path,
      date: "2026-09-02",
      reportNo: "2",
      id: "b_id_abc_def",
    });
  });
});

describe("date-range filter", () => {
  const paths = [
    "dailies/2026-08-30_R1_a.json",
    "dailies/2026-08-31_R1_b.json",
    "dailies/2026-09-02_R2_c.json",
    "other/2026-08-31.json",
  ];

  it("keeps inclusive from/to and drops names that are not dailies", () => {
    assert.deepEqual(filterBlobPathsByDateRange(paths, "2026-08-31", "2026-09-02"), [
      "dailies/2026-08-31_R1_b.json",
      "dailies/2026-09-02_R2_c.json",
    ]);
    assert.equal(blobPathInDateRange("dailies/2026-08-30_R1_a.json", "2026-08-31", "2026-09-02"), false);
  });

  it("returns all daily files when from and to are empty", () => {
    assert.deepEqual(filterBlobPathsByDateRange(paths, "", ""), [
      "dailies/2026-08-30_R1_a.json",
      "dailies/2026-08-31_R1_b.json",
      "dailies/2026-09-02_R2_c.json",
    ]);
  });
});

describe("office passcode", () => {
  it("accepts the matching passcode and rejects everything else", () => {
    assert.equal(passcodeMatches("job-site-office", "job-site-office"), true);
    assert.equal(passcodeMatches("nope", "job-site-office"), false);
    assert.equal(passcodeMatches("", "job-site-office"), false);
    assert.equal(passcodeMatches("job-site-office", ""), false);
  });

  it("only accepts the cookie derived from the passcode", () => {
    const cookie = officeCookieValue("job-site-office");
    assert.equal(officeCookieValid(cookie, "job-site-office"), true);
    assert.equal(officeCookieValid("forged", "job-site-office"), false);
    assert.equal(officeCookieValid(cookie, "other"), false);
    assert.equal(officeCookieValid(undefined, "job-site-office"), false);
  });
});

describe("submit ordering", () => {
  it("saves first, then emails", async () => {
    const calls: string[] = [];
    await submitDailyToOffice(OLD_DAILY_A, {
      save: async () => {
        calls.push("save");
      },
      email: async () => {
        calls.push("email");
      },
    });
    assert.deepEqual(calls, ["save", "email"]);
  });

  it("does not email if save fails, and leaves status not sent", async () => {
    const calls: string[] = [];
    await assert.rejects(
      () =>
        submitDailyToOffice(OLD_DAILY_A, {
          save: async () => {
            calls.push("save");
            throw new Error("blob down");
          },
          email: async () => {
            calls.push("email");
          },
        }),
      /blob down/,
    );
    assert.deepEqual(calls, ["save"]);
    assert.equal(sentStatus(OLD_DAILY_A), "not_sent");
    assert.equal(isSent(OLD_DAILY_A), false);
  });

  it("leaves status not sent if email fails after a successful save", async () => {
    await assert.rejects(
      () =>
        submitDailyToOffice(OLD_DAILY_A, {
          save: async () => undefined,
          email: async () => {
            throw new Error("mail down");
          },
        }),
      /mail down/,
    );
    assert.equal(sentStatus({ ...OLD_DAILY_A }), "not_sent");
  });

  it("keeps sending later dailies after one failure", async () => {
    const results = await sendReportsInOrder([OLD_DAILY_A, OLD_DAILY_B], async (report) => {
      if (report.id === OLD_DAILY_A.id) throw new Error("offline");
    });
    assert.deepEqual(results, [
      { id: OLD_DAILY_A.id, ok: false, error: "offline" },
      { id: OLD_DAILY_B.id, ok: true },
    ]);
  });
});

describe("old localStorage dailies survive", () => {
  it("keeps the live persist key", () => {
    assert.equal(DAILIES_STORAGE_KEY, "va-home-abaa-dailies");
  });

  it("loads a sample old-format payload and keeps every daily intact", () => {
    const parsed = parsePersistedDailies(OLD_LOCALSTORAGE_PAYLOAD);
    assert.ok(parsed);
    assert.equal(parsed.reports.length, 2);

    const a = parsed.reports.find((r) => r.id === OLD_DAILY_A.id);
    const b = parsed.reports.find((r) => r.id === OLD_DAILY_B.id);
    assert.ok(a);
    assert.ok(b);

    for (const [original, loaded] of [
      [OLD_DAILY_A, a],
      [OLD_DAILY_B, b],
    ] as const) {
      for (const key of Object.keys(original) as (keyof Report)[]) {
        assert.deepEqual(loaded[key], original[key], `field ${String(key)} must survive`);
      }
    }

    assert.equal(a.photos[0]?.dataUrl, OLD_DAILY_A.photos[0]?.dataUrl);
    assert.equal(b.photos.length, 2);
    assert.equal(a.filledBy, "Arnold");
    assert.equal(a.submittedAt, "2026-08-31T18:41:00.000Z");
    assert.equal(sentStatus(a), "not_sent");
    assert.equal(sentStatus(b), "not_sent");
    assert.equal(a.sentAt, "");
    assert.equal(b.sentAt, "");
  });

  it("refuses to overwrite saved dailies with an empty list", () => {
    const empty = JSON.stringify({ state: { lang: "en", reports: [] }, version: 0 });
    assert.equal(wouldWipeSavedDailies(OLD_LOCALSTORAGE_PAYLOAD, empty), true);
    assert.equal(wouldWipeSavedDailies(OLD_LOCALSTORAGE_PAYLOAD, OLD_LOCALSTORAGE_PAYLOAD), false);
    assert.equal(wouldWipeSavedDailies(null, empty), false);
  });

  it("never clears the persist key and will not write an empty list over Arnold's dailies", () => {
    const mem = installMemoryStorage();
    resetPersistGuardForTests();
    mem.set(DAILIES_STORAGE_KEY, OLD_LOCALSTORAGE_PAYLOAD);
    const storage = dailiesPersistStorage();
    storage.removeItem(DAILIES_STORAGE_KEY);
    assert.equal(mem.get(DAILIES_STORAGE_KEY), OLD_LOCALSTORAGE_PAYLOAD);

    storage.setItem(DAILIES_STORAGE_KEY, {
      state: { lang: "en", reports: [] },
      version: 0,
    });
    const stillThere = parsePersistedDailies(mem.get(DAILIES_STORAGE_KEY) ?? null);
    assert.ok(stillThere);
    assert.equal(stillThere.reports.length, 2);
    assert.equal(stillThere.reports[0]?.id, OLD_DAILY_A.id);
    assert.equal(stillThere.reports[1]?.id, OLD_DAILY_B.id);
  });
});

describe("office email copy", () => {
  it("uses short human sentences and a print link, not a checklist", () => {
    const text = officeEmailText(OLD_DAILY_A, "https://va-home-abaa-daily.vercel.app/print/arnold-east-2026-08-31");
    assert.match(text, /filled by Arnold/);
    assert.match(text, /report 1/);
    assert.match(text, /2026-08-31/);
    assert.match(text, /https:\/\/va-home-abaa-daily.vercel.app\/print\/arnold-east-2026-08-31/);
    assert.doesNotMatch(text, /TODO|payload|endpoint|checkbox/i);
    assert.doesNotMatch(text, /gilbane@|clay@/i);
  });
});

describe("report numbers follow work date", () => {
  it("renumbers by date and keeps the old number as a note, without changing dates", () => {
    const a = { ...OLD_DAILY_A, jobSiteReportNo: "9" };
    const b = { ...OLD_DAILY_B, jobSiteReportNo: "1" };
    const early = {
      ...OLD_DAILY_A,
      id: "arnold-829",
      date: "2026-08-29",
      jobSiteReportNo: "4",
    };
    const next = assignReportNumbersByDate([a, b, early]);
    const byId = Object.fromEntries(next.map((r) => [r.id, r]));
    assert.equal(byId[early.id]?.date, "2026-08-29");
    assert.equal(byId[a.id]?.date, "2026-08-31");
    assert.equal(byId[b.id]?.date, "2026-09-02");
    assert.equal(byId[early.id]?.jobSiteReportNo, "1");
    assert.equal(byId[a.id]?.jobSiteReportNo, "2");
    assert.equal(byId[b.id]?.jobSiteReportNo, "3");
    assert.equal(byId[early.id]?.priorReportNo, "4");
    assert.equal(byId[a.id]?.priorReportNo, "9");
    assert.equal(byId[b.id]?.priorReportNo, "1");
  });

  it("keeps each daily date label exactly when loading old storage", () => {
    const parsed = parsePersistedDailies(OLD_LOCALSTORAGE_PAYLOAD);
    assert.equal(parsed?.reports.find((r) => r.id === OLD_DAILY_A.id)?.date, "2026-08-31");
    assert.equal(parsed?.reports.find((r) => r.id === OLD_DAILY_B.id)?.date, "2026-09-02");
  });
});

describe("optional testing", () => {
  it("does not treat empty wet mils or adhesion as missing and needs no waiver", () => {
    const report = newReport();
    const gaps = reportGaps(report);
    assert.equal(gaps.some((g) => g.id === "mils" || g.id === "adh"), false);
    assert.equal(testWarnings(report).length, 0);
    assert.equal(
      completeness(report).blocking.some((g) => g.id === "mils" || g.id === "adh"),
      false,
    );
  });

  it("flags an entered wet mil or adhesion reading only when it is out of spec", () => {
    const report = newReport();
    report.projectWetMils = "15";
    report.milTests[0] = { reading: "8", location: "A-3" };
    report.adhesionTests[0] = { gauge: "10", location: "A-3", mode: "MS" };
    const warnings = testWarnings(report);
    assert.ok(warnings.some((w) => w.id === "milLow-0"));
    assert.ok(warnings.some((w) => w.id === "adhLow-0"));
    assert.equal(warnings.every((w) => w.blocking === false), true);
    report.milTests[0] = { reading: "16", location: "A-3" };
    report.adhesionTests[0] = { gauge: "185", location: "A-3", mode: "MS" };
    assert.equal(testWarnings(report).length, 0);
  });
});

describe("Arnold waive and submit", () => {
  it("lets a daily submit when required fields are filled or waived, not when they are blank", () => {
    const report = newReport();
    assert.equal(canSubmit(report), false);
    report.waivers = Object.fromEntries(
      completeness(report).blocking.map((g) => [g.id, { reason: "not this visit", at: "2026-09-02T12:00:00.000Z" }]),
    );
    assert.equal(canSubmit(report), true);
    assert.ok((report.waivers?.mils || report.waivers?.adh) == null);
  });
});

describe("office summary row", () => {
  it("returns date, report #, status, filled by, waived count, and signed", () => {
    const row = officeSummaryRow({
      ...OLD_DAILY_A,
      officeStatus: "signed",
      sentAt: "2026-08-31T18:41:00.000Z",
      signedPdfPath: "signed/arnold-east-2026-08-31.pdf",
      waivers: { onSite: { reason: "Clay only", at: "2026-08-31T12:00:00.000Z" } },
    });
    assert.deepEqual(row, {
      date: "2026-08-31",
      reportNo: "1",
      status: "signed",
      filledBy: "Arnold",
      waivedFieldsCount: 1,
      signed: true,
    });
  });
});
