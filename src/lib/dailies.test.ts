import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILIES_STORAGE_KEY,
  assertCanReplaceDaily,
  assertSubmitWaiversAllowed,
  assignReportNumbersByDate,
  blobPathInDateRange,
  dailyBlobPath,
  filterBlobPathsByDateRange,
  isSent,
  officeEmailText,
  officeReceiptNoteKey,
  officeSummaryRow,
  parseDailyBlobPath,
  parsePersistedDailies,
  reportHasWaivers,
  runCrewSubmit,
  sendReportsInOrder,
  sentStatus,
  submitDailyToOffice,
  wouldWipeSavedDailies,
} from "./dailies.ts";
import { dailiesPersistStorage, resetPersistGuardForTests } from "./dailies-persist.ts";
import { officeCookieValid, officeCookieValue, passcodeMatches } from "./office-pass.ts";
import { t } from "./i18n.ts";
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
  it("saves first as unsent, emails, then marks waiting_signature", async () => {
    const calls: string[] = [];
    const saved: Report[] = [];
    const sent = await submitDailyToOffice(OLD_DAILY_A, {
      save: async (report) => {
        calls.push("save");
        saved.push(report);
      },
      email: async () => {
        calls.push("email");
      },
    });
    assert.deepEqual(calls, ["save", "email", "save"]);
    assert.equal(saved[0]?.officeStatus, "draft");
    assert.equal(saved[0]?.sentAt, "");
    assert.equal(saved[1]?.officeStatus, "waiting_signature");
    assert.ok(saved[1]?.sentAt);
    assert.equal(sent.officeStatus, "waiting_signature");
    assert.equal(sentStatus(sent), "sent");
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

  it("keeps the server copy unsent if email fails after a successful save", async () => {
    const saved: Report[] = [];
    await assert.rejects(
      () =>
        submitDailyToOffice(OLD_DAILY_A, {
          save: async (report) => {
            saved.push(report);
          },
          email: async () => {
            throw new Error("mail down");
          },
        }),
      /mail down/,
    );
    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.officeStatus, "draft");
    assert.equal(saved[0]?.sentAt, "");
    assert.equal(sentStatus(saved[0]!), "not_sent");
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

function fillRequiredNonTestFields(report: Report) {
  report.filledBy = "Arnold";
  report.onSite = ["Arnold"];
  report.substrateTemp = "72";
  report.ambientTemp = "78";
  report.surfacePrep = "Clean and dry";
  report.substrateAcceptable = "Y";
  report.materials[0] = { ...report.materials[0], batch: "RS-1" };
  report.materials[2] = { ...report.materials[2], batch: "SF-1" };
  report.loc1 = { ...report.loc1, timeStart: "7:00 AM", timeEnd: "3:00 PM", wall: "E" };
  report.fluidClean = true;
  report.transClean = true;
  report.leftWithGc = "Y";
  return report;
}

const TEST_GAP_IDS = /^(mils|adh|thickness|equip|tester|discs|whyNot|milTests|adhesion)/i;

describe("optional testing", () => {
  it("does not treat empty wet mils or adhesion as missing and needs no waiver", () => {
    const report = newReport();
    const gaps = reportGaps(report);
    assert.equal(gaps.some((g) => TEST_GAP_IDS.test(g.id)), false);
    assert.equal(testWarnings(report).length, 0);
    assert.equal(completeness(report).blocking.some((g) => TEST_GAP_IDS.test(g.id)), false);
    assert.equal(report.thicknessAt1, false);
    assert.equal(report.adhesionAt1, false);
    assert.equal(report.testingEquipOnSite, "");
  });

  it("lets a daily submit with no tests, no test waiver, and no missing-test flag", () => {
    const report = fillRequiredNonTestFields(newReport());
    const complete = completeness(report);
    assert.equal(complete.ready, true);
    assert.equal(complete.pct, 100);
    assert.equal(complete.blocking.length, 0);
    assert.equal(canSubmit(report), true);
    assert.equal(report.waivers && Object.keys(report.waivers).length, 0);
    const email = officeEmailText(report, "https://example.com/print/x");
    assert.match(email, /Every required field is filled or Arnold waived it/);
    assert.equal(/wet mil|adhesion|still blank/i.test(email), false);
  });

  it("flags an entered wet mil or adhesion reading only when it is out of spec", () => {
    const report = fillRequiredNonTestFields(newReport());
    report.projectWetMils = "15";
    report.milTests[0] = { reading: "8", location: "A-3" };
    report.adhesionTests[0] = { gauge: "10", location: "A-3", mode: "MS" };
    const warnings = testWarnings(report);
    assert.ok(warnings.some((w) => w.id === "milLow-0"));
    assert.ok(warnings.some((w) => w.id === "adhLow-0"));
    assert.equal(warnings.every((w) => w.blocking === false), true);
    assert.equal(canSubmit(report), true);
    assert.equal(completeness(report).pct, 100);
    report.milTests[0] = { reading: "16", location: "A-3" };
    report.adhesionTests[0] = { gauge: "185", location: "A-3", mode: "MS" };
    assert.equal(testWarnings(report).length, 0);
    assert.equal(canSubmit(report), true);
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

  it("rejects a waived payload unless Arnold is unlocked, and lets a no-waiver daily through", async () => {
    const waived = fillRequiredNonTestFields(newReport());
    waived.leftWithGc = "";
    waived.waivers = { gc: { reason: "Gilbane already has Friday copy", at: "2026-09-02T12:00:00.000Z" } };
    assert.equal(reportHasWaivers(waived), true);
    assert.throws(() => assertSubmitWaiversAllowed(waived, false), /Arnold PIN required/);
    assert.doesNotThrow(() => assertSubmitWaiversAllowed(waived, true));

    const plain = fillRequiredNonTestFields(newReport());
    assert.equal(reportHasWaivers(plain), false);
    assert.doesNotThrow(() => assertSubmitWaiversAllowed(plain, false));

    await assert.rejects(
      () =>
        runCrewSubmit(waived, {
          arnoldUnlocked: false,
          save: async () => undefined,
          email: async () => undefined,
        }),
      /Arnold PIN required/,
    );
    const sent = await runCrewSubmit(plain, {
      arnoldUnlocked: false,
      save: async () => undefined,
      email: async () => undefined,
    });
    assert.equal(sent.officeStatus, "waiting_signature");
  });
});

describe("submit overwrite guard", () => {
  it("lets the same unsent daily overwrite, and blocks a different or signed daily", async () => {
    const incoming = fillRequiredNonTestFields(newReport());
    incoming.id = "test-ignore-2099";
    assert.doesNotThrow(() => assertCanReplaceDaily(null, incoming));
    assert.doesNotThrow(() =>
      assertCanReplaceDaily({ ...incoming, officeStatus: "draft", sentAt: "" }, incoming),
    );
    assert.doesNotThrow(() =>
      assertCanReplaceDaily({ ...incoming, officeStatus: "waiting_signature", sentAt: "2026-09-02T12:00:00.000Z" }, incoming),
    );
    assert.throws(
      () => assertCanReplaceDaily({ ...incoming, id: "other-daily" }, incoming),
      /different daily/,
    );
    assert.throws(
      () => assertCanReplaceDaily({ ...incoming, officeStatus: "signed", signedPdfPath: "signed/x.pdf" }, incoming),
      /signed or filed/,
    );
    assert.throws(
      () => assertCanReplaceDaily({ ...incoming, officeStatus: "filed" }, incoming),
      /signed or filed/,
    );

    await assert.rejects(
      () =>
        runCrewSubmit(incoming, {
          arnoldUnlocked: false,
          existingById: { ...incoming, officeStatus: "signed", signedPdfPath: "signed/x.pdf" },
          save: async () => undefined,
          email: async () => undefined,
        }),
      /signed or filed/,
    );
    await assert.rejects(
      () =>
        runCrewSubmit(incoming, {
          arnoldUnlocked: false,
          existingAtPath: { ...incoming, id: "someone-else" },
          save: async () => undefined,
          email: async () => undefined,
        }),
      /different daily/,
    );
  });
});

describe("office receipt banner", () => {
  it("uses emailed copy only after sentAt or waiting_signature or later", () => {
    assert.equal(officeReceiptNoteKey({ sentAt: "", officeStatus: "draft" }), "receiptNoteUnsent");
    assert.equal(officeReceiptNoteKey(OLD_DAILY_A), "receiptNoteUnsent");
    assert.equal(
      officeReceiptNoteKey({ sentAt: "2026-08-31T18:41:00.000Z", officeStatus: "waiting_signature" }),
      "receiptNote",
    );
    assert.equal(officeReceiptNoteKey({ officeStatus: "signed", signedPdfPath: "signed/x.pdf" }), "receiptNote");
    assert.equal(officeReceiptNoteKey({ officeStatus: "filed" }), "receiptNote");
    assert.equal(t("en", "receiptNoteUnsent"), "Saved on the server. Not emailed yet.");
    assert.equal(
      t("en", "receiptNote"),
      "Saved on the server and emailed to bernie@jamesriverexteriors.com.",
    );
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
