import { del, get, list, put } from "@vercel/blob";
import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import {
  assertCanReplaceDaily,
  assignReportNumbersByDate,
  dailyBlobPath,
  filterBlobPathsByDateRange,
  OFFICE_EMAIL,
  OFFICE_FROM,
  officeEmailSubject,
  officeEmailText,
  officeSummaryRow,
  parseDailyBlobPath,
  signedPdfPath,
  summarizeDaily,
  type DailySummary,
  type OfficeSummaryRow,
} from "./dailies";
import {
  ARNOLD_COOKIE,
  arnoldCookieValid,
  arnoldCookieValue,
  OFFICE_COOKIE,
  officeCookieValid,
  officeCookieValue,
  passcodeMatches,
} from "./office-pass";
import type { Report } from "./report";

export const OFFICE_LOGIN_ERROR = "Office login required";

function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("Server storage is not set up yet.");
  return token;
}

function mailgunKey() {
  const key = process.env.MAILGUN_API_KEY?.trim();
  if (!key) throw new Error("Email is not set up yet.");
  return key;
}

function mailgunDomain() {
  return process.env.MAILGUN_DOMAIN?.trim() || "mg.jamesriverexteriors.com";
}

function officePasscode() {
  return process.env.OFFICE_PASSCODE?.trim() || "";
}

function arnoldPin() {
  return process.env.ARNOLD_PIN?.trim() || "";
}

export function publicSiteOrigin() {
  try {
    const req = getRequest();
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // no request context
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "https://va-home-abaa-daily.vercel.app";
}

export function printPageUrl(id: string) {
  return `${publicSiteOrigin()}/print/${id}`;
}

export async function saveDailyBlob(report: Report) {
  const pathname = dailyBlobPath(report);
  await put(pathname, JSON.stringify(report), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: blobToken(),
  });
  return pathname;
}

export async function saveSubmittedDaily(report: Report) {
  const existingById = await loadDailyById(report.id);
  assertCanReplaceDaily(existingById, report);
  const pathname = dailyBlobPath(report);
  const existingAtPath = await readDailyJson(pathname);
  if (existingAtPath && existingAtPath.id !== report.id) {
    throw new Error("This save would overwrite a different daily.");
  }
  return saveDailyBlob(report);
}

async function listAllDailyPathnames() {
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix: "dailies/",
      cursor,
      limit: 1000,
      token: blobToken(),
    });
    for (const blob of page.blobs) {
      if (parseDailyBlobPath(blob.pathname)) pathnames.push(blob.pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return pathnames;
}

export async function loadDailyJsonAtPath(pathname: string): Promise<Report | null> {
  return readDailyJson(pathname);
}

async function readDailyJson(pathname: string): Promise<Report | null> {
  const result = await get(pathname, {
    access: "private",
    token: blobToken(),
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const body = await new Response(result.stream).text();
  if (!body) return null;
  try {
    return JSON.parse(body) as Report;
  } catch {
    return null;
  }
}

export async function loadAllDailies(): Promise<Report[]> {
  const reports: Report[] = [];
  for (const pathname of await listAllDailyPathnames()) {
    const report = await readDailyJson(pathname);
    if (report?.id) reports.push(report);
  }
  return reports;
}

export async function listDailySummaries(from?: string, to?: string, status?: string): Promise<DailySummary[]> {
  const pathnames = filterBlobPathsByDateRange(await listAllDailyPathnames(), from, to);
  const summaries: DailySummary[] = [];
  for (const pathname of pathnames) {
    const report = await readDailyJson(pathname);
    if (!report?.id) continue;
    const row = summarizeDaily(report, pathname);
    if (status && row.status !== status) continue;
    summaries.push(row);
  }
  summaries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return Number(a.jobSiteReportNo) - Number(b.jobSiteReportNo);
  });
  return summaries;
}

export async function findDailyPathname(id: string): Promise<string | null> {
  const needle = `_${sanitizeId(id)}.json`;
  const pathnames = await listAllDailyPathnames();
  return pathnames.find((path) => path.endsWith(needle)) ?? null;
}

export async function loadDailyById(id: string): Promise<Report | null> {
  const match = await findDailyPathname(id);
  if (!match) return null;
  return readDailyJson(match);
}

export async function voidDaily(id: string) {
  requireOffice();
  const pathname = await findDailyPathname(id);
  if (!pathname) throw new Error("Daily not found on the server.");
  const report = await readDailyJson(pathname);
  await del(pathname, { token: blobToken() });
  if (report?.signedPdfPath) {
    await del(report.signedPdfPath, { token: blobToken() }).catch(() => undefined);
  }
}

function sanitizeId(id: string) {
  return String(id).replace(/[^A-Za-z0-9.-]/g, "_");
}

export async function loadDailiesInRange(from?: string, to?: string): Promise<Report[]> {
  const pathnames = filterBlobPathsByDateRange(await listAllDailyPathnames(), from, to);
  const reports: Report[] = [];
  for (const pathname of pathnames) {
    const report = await readDailyJson(pathname);
    if (report?.id) reports.push(report);
  }
  reports.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return Number(a.jobSiteReportNo) - Number(b.jobSiteReportNo);
  });
  return reports;
}

export async function importDailyKeepingDate(incoming: Report) {
  const date = incoming.date;
  if (!date) throw new Error("This file has no work date.");
  const all = await loadAllDailies();
  const next = assignReportNumbersByDate([
    ...all.filter((r) => r.id !== incoming.id),
    { ...incoming, date },
  ]);
  for (const report of next) {
    const prev = all.find((r) => r.id === report.id);
    if (report.id === incoming.id || prev?.jobSiteReportNo !== report.jobSiteReportNo) {
      await saveDailyBlob(report);
    }
  }
  return next.find((r) => r.id === incoming.id) ?? { ...incoming, date };
}

export async function emailDailyToBernie(report: Report) {
  const domain = mailgunDomain();
  const key = mailgunKey();
  const printUrl = printPageUrl(report.id);
  const form = new FormData();
  form.append("from", OFFICE_FROM);
  form.append("to", OFFICE_EMAIL);
  form.append("subject", officeEmailSubject(report));
  form.append("text", officeEmailText(report, printUrl));
  const filename = `ABAA-VA-Home-${report.date}-R${report.jobSiteReportNo}.json`;
  form.append("attachment", new Blob([JSON.stringify(report)], { type: "application/json" }), filename);

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}`,
    },
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail ? `Could not email Bernie. ${detail}` : "Could not email Bernie.");
  }
}

function cookieOpts() {
  return {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function isOfficeLoggedIn() {
  const passcode = officePasscode();
  if (!passcode) return false;
  return officeCookieValid(getCookie(OFFICE_COOKIE), passcode);
}

export function officeAuthorizedFromRequest(request?: Request) {
  if (isOfficeLoggedIn()) return true;
  const header = request?.headers.get("x-office-passcode")?.trim() || "";
  const expected = officePasscode();
  return Boolean(expected && passcodeMatches(header, expected));
}

export function requireOffice() {
  if (!isOfficeLoggedIn()) {
    throw new Error(OFFICE_LOGIN_ERROR);
  }
}

export function loginOffice(passcode: string) {
  const expected = officePasscode();
  if (!expected) throw new Error("Office passcode is not set up yet.");
  if (!passcodeMatches(passcode, expected)) return false;
  setCookie(OFFICE_COOKIE, officeCookieValue(expected), cookieOpts());
  return true;
}

export function isArnoldUnlocked() {
  const pin = arnoldPin();
  if (!pin) return false;
  return arnoldCookieValid(getCookie(ARNOLD_COOKIE), pin);
}

export function unlockArnold(pin: string) {
  const expected = arnoldPin();
  if (!expected) throw new Error("Arnold PIN is not set up yet.");
  if (!passcodeMatches(pin, expected)) return false;
  setCookie(ARNOLD_COOKIE, arnoldCookieValue(expected), cookieOpts());
  return true;
}

export function requireArnold() {
  if (!isArnoldUnlocked()) {
    throw new Error("Arnold PIN required to waive a field.");
  }
}

export async function attachSignedPdf(id: string, filename: string, bytes: Uint8Array) {
  requireOffice();
  const report = await loadDailyById(id);
  if (!report) throw new Error("Daily not found on the server.");
  const pathname = signedPdfPath(id);
  await put(pathname, Buffer.from(bytes), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/pdf",
    token: blobToken(),
  });
  const now = new Date().toISOString();
  const next: Report = {
    ...report,
    signedPdfPath: pathname,
    signedPdfName: filename || "signed.pdf",
    signedAt: now,
    officeStatus: "signed",
    updatedAt: now,
  };
  await saveDailyBlob(next);
  return next;
}

export async function markDailyFiled(id: string) {
  requireOffice();
  const report = await loadDailyById(id);
  if (!report) throw new Error("Daily not found on the server.");
  const next: Report = {
    ...report,
    officeStatus: "filed",
    updatedAt: new Date().toISOString(),
  };
  await saveDailyBlob(next);
  return next;
}

export async function readSignedPdf(id: string) {
  const pathname = signedPdfPath(id);
  const result = await get(pathname, {
    access: "private",
    token: blobToken(),
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return { stream: result.stream, contentType: result.blob.contentType || "application/pdf" };
}

export async function officeSummary(from?: string, to?: string): Promise<OfficeSummaryRow[]> {
  const reports = await loadDailiesInRange(from, to);
  return reports.map(officeSummaryRow);
}
