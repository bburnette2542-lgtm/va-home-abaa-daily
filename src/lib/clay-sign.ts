import { signedPdfPath, workflowStatus } from "./dailies.ts";
import { newReport, type Report } from "./report.ts";

export const CLAY_CERT_NUMBER = "306906";
export const CLAY_DEFAULT_NAME = "Clay";
export const CLAY_TOKEN_BLOB = "signing/clay-token.txt";

export type ClaySignInput = {
  signatureDataUrl: string;
  signatureDate: string;
  signedBy: string;
  signedAt?: string;
};

export function isUnsignedForClay(
  report: Pick<Report, "officeStatus" | "sentAt" | "signedPdfPath">,
) {
  const status = workflowStatus(report);
  return status !== "signed" && status !== "filed";
}

export function sortDailiesForClay<T extends Pick<Report, "date" | "jobSiteReportNo">>(reports: T[]): T[] {
  return [...reports].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return Number(a.jobSiteReportNo) - Number(b.jobSiteReportNo);
  });
}

export function claySignLink(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/sign/${encodeURIComponent(token)}`;
}

export function claySignedPdfFilename(report: Pick<Report, "date" | "jobSiteReportNo">) {
  return `ABAA-VA-Home-${report.date}-R${report.jobSiteReportNo}-signed.pdf`;
}

export function claySignedEmailSubject(report: Pick<Report, "date" | "jobSiteReportNo">) {
  return `Clay signed VA Home daily ${report.date} report ${report.jobSiteReportNo}`;
}

export function claySignedEmailText(
  report: Pick<Report, "date" | "jobSiteReportNo" | "filledBy" | "signedBy" | "signatureDate">,
) {
  const who = report.signedBy?.trim() || CLAY_DEFAULT_NAME;
  return [
    `Clay signed the VA Home daily for ${report.date}, report ${report.jobSiteReportNo}.`,
    `Signed by ${who} on ${report.signatureDate}. Certification # ${CLAY_CERT_NUMBER}.`,
    report.filledBy ? `Filled by ${report.filledBy}.` : "",
    "The signed PDF is attached.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function assertClaySignInput(input: ClaySignInput) {
  if (!input.signatureDataUrl?.startsWith("data:image/")) {
    throw new Error("Draw your signature in the box.");
  }
  if (!input.signatureDate?.trim()) {
    throw new Error("Enter the date.");
  }
  if (!input.signedBy?.trim()) {
    throw new Error("Enter your name.");
  }
}

export function applyClaySignature(
  report: Report,
  input: ClaySignInput,
  pdf?: { path?: string; name?: string },
): Report {
  const signedAt = input.signedAt || new Date().toISOString();
  const signedBy = input.signedBy.trim() || CLAY_DEFAULT_NAME;
  return {
    ...report,
    signatureDataUrl: input.signatureDataUrl,
    signatureDate: input.signatureDate.trim(),
    certNumber: CLAY_CERT_NUMBER,
    clayReady: "Y",
    signedBy,
    signedAt,
    officeStatus: "signed",
    signedPdfPath: pdf?.path || signedPdfPath(report.id),
    signedPdfName: pdf?.name || claySignedPdfFilename(report),
    updatedAt: signedAt,
  };
}

export function formatSignedWhen(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Signed ${date} at ${time}`;
}

/** Tiny 1x1 PNG for tests and local screenshots. Not a real job photo. */
export const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export function claySignFixtureDaily(id = "clay-sign-fixture"): Report {
  const report = newReport();
  report.id = id;
  report.sample = true;
  report.date = "2026-10-09";
  report.jobSiteReportNo = "1";
  report.filledBy = "Arnold";
  report.onSite = ["Arnold", "Clay Butner"];
  report.substrateTemp = "72";
  report.ambientTemp = "78";
  report.surfacePrep = "Clean and dry";
  report.substrateAcceptable = "Y";
  report.materials[0] = { ...report.materials[0], batch: "RS-24081" };
  report.materials[2] = { ...report.materials[2], batch: "SF-1182" };
  report.loc1 = {
    timeStart: "7:15 AM",
    timeEnd: "3:30 PM",
    onGrid: "A",
    betweenFrom: "A",
    betweenTo: "B",
    elevFrom: "102",
    elevTo: "114",
    wall: "E",
  };
  report.fluidClean = true;
  report.transClean = true;
  report.leftWithGc = "Y";
  report.milTests[0] = { reading: "16", location: "A-3 east" };
  report.adhesionTests[0] = { gauge: "185", location: "A-3 east", mode: "MS" };
  report.officeStatus = "waiting_signature";
  report.sentAt = "2026-10-09T18:00:00.000Z";
  report.photos = [
    { id: "p1", kind: "substrate", caption: "East Densglass", dataUrl: TINY_PNG },
  ];
  return report;
}
