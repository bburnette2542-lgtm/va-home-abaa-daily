import {
  canSubmit,
  isWaived,
  reportGaps,
  testWarnings,
  waivedCount,
  type Lang,
  type OfficeStatus,
  type Report,
} from "./report.ts";

export const DAILIES_STORAGE_KEY = "va-home-abaa-dailies";

export const OFFICE_EMAIL = "bernie@jamesriverexteriors.com";
export const OFFICE_FROM = "VA Home Daily <dailies@mg.jamesriverexteriors.com>";

export type SentStatus = "not_sent" | "sent";

export function workflowStatus(report: Pick<Report, "officeStatus" | "sentAt" | "signedPdfPath">): OfficeStatus {
  if (report.officeStatus === "filed") return "filed";
  if (report.officeStatus === "signed" || report.signedPdfPath) return "signed";
  if (report.officeStatus === "waiting_signature" || report.sentAt) {
    return "waiting_signature";
  }
  return "draft";
}

export function isSent(report: Pick<Report, "sentAt" | "officeStatus" | "signedPdfPath">) {
  return workflowStatus(report) !== "draft";
}

export function sentStatus(report: Pick<Report, "sentAt" | "officeStatus" | "signedPdfPath">): SentStatus {
  return isSent(report) ? "sent" : "not_sent";
}

export function officeReceiptNoteKey(
  report: Pick<Report, "sentAt" | "officeStatus" | "signedPdfPath">,
): "receiptNote" | "receiptNoteUnsent" {
  return isSent(report) ? "receiptNote" : "receiptNoteUnsent";
}

export function statusLabel(status: OfficeStatus) {
  if (status === "filed") return "Filed";
  if (status === "signed") return "Signed";
  if (status === "waiting_signature") return "Approved — waiting for Clay";
  return "Draft";
}

export function dailyBlobPath(report: Pick<Report, "date" | "jobSiteReportNo" | "id">) {
  const date = sanitizePathPart(report.date || "undated");
  const no = sanitizePathPart(report.jobSiteReportNo || "0");
  const id = sanitizePathPart(report.id || "unknown");
  return `dailies/${date}_R${no}_${id}.json`;
}

export function signedPdfPath(id: string) {
  return `signed/${sanitizePathPart(id)}.pdf`;
}

export function sanitizePathPart(value: string) {
  return String(value).replace(/[^A-Za-z0-9.-]/g, "_");
}

export type DailyBlobKey = {
  pathname: string;
  date: string;
  reportNo: string;
  id: string;
};

export function parseDailyBlobPath(pathname: string): DailyBlobKey | null {
  const name = pathname.replace(/^\/+/, "");
  const match = name.match(/^dailies\/(\d{4}-\d{2}-\d{2})_R([^_]+)_(.+)\.json$/);
  if (!match) return null;
  return { pathname: name, date: match[1], reportNo: match[2], id: match[3] };
}

export function blobPathInDateRange(pathname: string, from?: string, to?: string) {
  const parsed = parseDailyBlobPath(pathname);
  if (!parsed) return false;
  if (from && parsed.date < from) return false;
  if (to && parsed.date > to) return false;
  return true;
}

export function filterBlobPathsByDateRange(pathnames: string[], from?: string, to?: string) {
  return pathnames.filter((path) => blobPathInDateRange(path, from, to));
}

export function assignReportNumbersByDate<T extends Pick<Report, "id" | "date" | "jobSiteReportNo" | "createdAt" | "priorReportNo">>(
  reports: T[],
): T[] {
  const sorted = [...reports].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ac = a.createdAt || "";
    const bc = b.createdAt || "";
    if (ac !== bc) return ac < bc ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  const nextNo = new Map<string, string>();
  sorted.forEach((r, i) => nextNo.set(r.id, String(i + 1)));
  return reports.map((r) => {
    const no = nextNo.get(r.id) || r.jobSiteReportNo;
    if (String(r.jobSiteReportNo) === no) return r;
    const prior =
      r.priorReportNo ||
      (r.jobSiteReportNo && r.jobSiteReportNo !== "0" ? String(r.jobSiteReportNo) : "");
    return { ...r, jobSiteReportNo: no, priorReportNo: prior };
  });
}

function asStatus(value: unknown): OfficeStatus | undefined {
  if (value === "draft" || value === "waiting_signature" || value === "signed" || value === "filed") return value;
  if (value === "approved") return "waiting_signature";
  return undefined;
}

export function normalizeReport(raw: unknown): Report | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Report & { sentAt?: string; id?: string; date?: string };
  if (typeof r.id !== "string" || !r.id) return null;
  const date = typeof r.date === "string" ? r.date : "";
  const sentAt = typeof r.sentAt === "string" ? r.sentAt : "";
  const officeStatus = asStatus(r.officeStatus) ?? (sentAt ? "waiting_signature" : "draft");
  return {
    ...r,
    id: r.id,
    date,
    sentAt,
    officeStatus,
    priorReportNo: typeof r.priorReportNo === "string" ? r.priorReportNo : "",
    waivers: r.waivers && typeof r.waivers === "object" ? r.waivers : {},
    signedPdfPath: typeof r.signedPdfPath === "string" ? r.signedPdfPath : "",
    signedPdfName: typeof r.signedPdfName === "string" ? r.signedPdfName : "",
    signedAt: typeof r.signedAt === "string" ? r.signedAt : "",
  };
}

function unwrapPersisted(persisted: unknown): { lang?: unknown; reports?: unknown } | null {
  if (!persisted || typeof persisted !== "object") return null;
  const o = persisted as { state?: unknown; lang?: unknown; reports?: unknown };
  if (o.state && typeof o.state === "object") {
    return o.state as { lang?: unknown; reports?: unknown };
  }
  return o;
}

export function parsePersistedDailies(raw: unknown): { lang: Lang; reports: Report[] } | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const state = unwrapPersisted(value);
  if (!state || !Array.isArray(state.reports)) return null;
  const reports: Report[] = [];
  for (const item of state.reports) {
    const next = normalizeReport(item);
    if (next) reports.push(next);
  }
  if (state.reports.length > 0 && reports.length === 0) return null;
  return {
    lang: state.lang === "es" ? "es" : "en",
    reports: assignReportNumbersByDate(reports),
  };
}

export function wouldWipeSavedDailies(existingRaw: string | null, incomingRaw: string) {
  if (!existingRaw) return false;
  const existing = parsePersistedDailies(existingRaw);
  const incoming = parsePersistedDailies(incomingRaw);
  if (!existing || existing.reports.length === 0) return false;
  if (!incoming || incoming.reports.length === 0) return true;
  return false;
}

export function officeEmailText(report: Report, printUrl: string) {
  const who = report.filledBy?.trim() || "someone on the crew";
  const date = report.date || "an unknown date";
  const no = report.jobSiteReportNo || "?";
  const sample = report.sample ? " This one is a sample for practice." : "";
  const prior = report.priorReportNo ? ` The old report number was ${report.priorReportNo}.` : "";
  return [
    `The VA Home daily for ${date}, report ${no}, was filled by ${who}.${sample}${prior}`,
    blankFieldsSentence(report),
    waivedSentence(report),
    warningSentence(report),
    `The official form is here: ${printUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function officeEmailSubject(report: Report) {
  return `VA Home daily ${report.date} report ${report.jobSiteReportNo}`;
}

function blankFieldsSentence(report: Report) {
  const names = reportGaps(report)
    .filter((g) => g.blocking && !isWaived(report, g.id))
    .map((g) => g.en.toLowerCase());
  if (names.length === 0) return "Every required field is filled or Arnold waived it.";
  if (names.length === 1) return `This field is still blank: ${names[0]}.`;
  if (names.length === 2) return `These fields are still blank: ${names[0]} and ${names[1]}.`;
  const head = names.slice(0, -1).join(", ");
  return `These fields are still blank: ${head}, and ${names[names.length - 1]}.`;
}

function waivedSentence(report: Report) {
  const items = Object.entries(report.waivers ?? {})
    .filter(([, w]) => w?.reason?.trim())
    .map(([id, w]) => {
      const gap = reportGaps(report).find((g) => g.id === id);
      const name = gap?.en.toLowerCase() || id;
      return `${name} (${w.reason.trim()})`;
    });
  if (!items.length) return "";
  if (items.length === 1) return `Arnold waived ${items[0]}.`;
  return `Arnold waived: ${items.join("; ")}.`;
}

function warningSentence(report: Report) {
  const warnings = testWarnings(report);
  if (!warnings.length) return "";
  return warnings.map((w) => w.en).join(" ");
}

export function reportHasWaivers(report: Pick<Report, "waivers">) {
  return waivedCount(report) > 0;
}

export function assertSubmitWaiversAllowed(
  report: Pick<Report, "waivers">,
  arnoldUnlocked: boolean,
) {
  if (reportHasWaivers(report) && !arnoldUnlocked) {
    throw new Error("Arnold PIN required to waive a field.");
  }
}

export function asUnsentServerDaily(report: Report): Report {
  return {
    ...report,
    sentAt: "",
    officeStatus: "draft",
  };
}

export function asSentServerDaily(report: Report, sentAt = new Date().toISOString()): Report {
  return {
    ...report,
    sentAt,
    submittedAt: sentAt,
    officeStatus: "waiting_signature",
    updatedAt: sentAt,
  };
}

export function assertCanReplaceDaily(existing: Report | null | undefined, incoming: Pick<Report, "id">) {
  if (!existing) return;
  if (existing.id !== incoming.id) {
    throw new Error("This save would overwrite a different daily.");
  }
  const status = workflowStatus(existing);
  if (status === "signed" || status === "filed") {
    throw new Error("This daily is already signed or filed.");
  }
}

export async function runCrewSubmit(
  report: Report,
  deps: {
    arnoldUnlocked: boolean;
    existingById?: Report | null;
    existingAtPath?: Report | null;
    save: (report: Report) => Promise<void>;
    email: (report: Report) => Promise<void>;
  },
) {
  if (!canSubmit(report)) {
    throw new Error("Required fields are still blank. Arnold can waive a field if it does not apply.");
  }
  assertSubmitWaiversAllowed(report, deps.arnoldUnlocked);
  assertCanReplaceDaily(deps.existingById, report);
  if (deps.existingAtPath && deps.existingAtPath.id !== report.id) {
    throw new Error("This save would overwrite a different daily.");
  }
  return submitDailyToOffice(report, { save: deps.save, email: deps.email });
}

export async function submitDailyToOffice(
  report: Report,
  deps: {
    save: (report: Report) => Promise<void>;
    email: (report: Report) => Promise<void>;
  },
) {
  const unsent = asUnsentServerDaily(report);
  await deps.save(unsent);
  await deps.email(unsent);
  const sent = asSentServerDaily(unsent);
  await deps.save(sent);
  return sent;
}

export async function sendReportsInOrder(
  reports: Report[],
  submit: (report: Report) => Promise<void>,
) {
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const report of reports) {
    try {
      await submit(report);
      results.push({ id: report.id, ok: true });
    } catch (err) {
      results.push({
        id: report.id,
        ok: false,
        error: err instanceof Error ? err.message : "Could not send",
      });
    }
  }
  return results;
}

export type DailySummary = {
  id: string;
  date: string;
  jobSiteReportNo: string;
  priorReportNo: string;
  filledBy: string;
  photoCount: number;
  sample: boolean;
  updatedAt: string;
  pathname: string;
  status: OfficeStatus;
  waivedCount: number;
  signed: boolean;
};

export function summarizeDaily(report: Report, pathname: string): DailySummary {
  const status = workflowStatus(report);
  return {
    id: report.id,
    date: report.date,
    jobSiteReportNo: report.jobSiteReportNo,
    priorReportNo: report.priorReportNo || "",
    filledBy: report.filledBy || "",
    photoCount: report.photos?.length ?? 0,
    sample: Boolean(report.sample),
    updatedAt: report.updatedAt || report.submittedAt || "",
    pathname,
    status,
    waivedCount: waivedCount(report),
    signed: status === "signed" || status === "filed" || Boolean(report.signedPdfPath),
  };
}

export type OfficeSummaryRow = {
  date: string;
  reportNo: string;
  status: OfficeStatus;
  filledBy: string;
  waivedFieldsCount: number;
  signed: boolean;
};

export function officeSummaryRow(report: Report): OfficeSummaryRow {
  const status = workflowStatus(report);
  return {
    date: report.date,
    reportNo: report.jobSiteReportNo,
    status,
    filledBy: report.filledBy || "",
    waivedFieldsCount: waivedCount(report),
    signed: Boolean(report.signedPdfPath) || status === "signed" || status === "filed",
  };
}
