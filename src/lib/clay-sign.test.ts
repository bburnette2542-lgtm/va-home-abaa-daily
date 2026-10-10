import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  applyClaySignature,
  assertClaySignInput,
  clayFormDate,
  claySignFixtureDaily,
  claySignLink,
  claySignedEmailSubject,
  claySignedPdfFilename,
  CLAY_CERT_NUMBER,
  CLAY_FULL_NAME,
  CLAY_UNSIGNED_HINT,
  formatSignedWhen,
  isClaySignedDaily,
  isUnsignedForClay,
  sortDailiesForClay,
  TINY_PNG,
} from "./clay-sign.ts";
import { newReport } from "./report.ts";
import { buildOfficialSignedPdf } from "./signed-pdf.ts";
import { todayISO } from "./utils.ts";

describe("unsigned list for Clay", () => {
  it("keeps drafts and waiting dailies, drops signed and filed", () => {
    assert.equal(isUnsignedForClay({ officeStatus: "draft", sentAt: "" }), true);
    assert.equal(isUnsignedForClay({ officeStatus: "waiting_signature", sentAt: "2026-10-09T12:00:00.000Z" }), true);
    assert.equal(isUnsignedForClay({ officeStatus: "signed", signedPdfPath: "signed/x.pdf" }), false);
    assert.equal(isUnsignedForClay({ officeStatus: "filed", signedPdfPath: "signed/x.pdf" }), false);
  });

  it("sorts by work date then report number", () => {
    const rows = sortDailiesForClay([
      { date: "2026-10-10", jobSiteReportNo: "2" },
      { date: "2026-10-09", jobSiteReportNo: "4" },
      { date: "2026-10-09", jobSiteReportNo: "1" },
    ]);
    assert.deepEqual(
      rows.map((r) => `${r.date}#${r.jobSiteReportNo}`),
      ["2026-10-09#1", "2026-10-09#4", "2026-10-10#2"],
    );
  });
});

describe("apply Clay signature", () => {
  it("writes signature fields and leaves crew answers alone", () => {
    const report = claySignFixtureDaily();
    const before = structuredClone(report);
    const signed = applyClaySignature(
      report,
      {
        signatureDataUrl: TINY_PNG,
        signatureDate: "2026-10-10",
        signedBy: "Clay",
        signedAt: "2026-10-10T16:12:00.000Z",
      },
      { path: "signed/clay-sign-fixture.pdf", name: "signed.pdf" },
    );

    assert.equal(report.milTests[0]?.reading, before.milTests[0]?.reading);
    assert.equal(report.materials[0]?.batch, before.materials[0]?.batch);
    assert.equal(report.substrateAcceptable, "Y");
    assert.equal(report.officeStatus, "waiting_signature");
    assert.deepEqual(signed.milTests, before.milTests);
    assert.deepEqual(signed.adhesionTests, before.adhesionTests);
    assert.deepEqual(signed.materials, before.materials);
    assert.deepEqual(signed.loc1, before.loc1);
    assert.equal(signed.fluidClean, before.fluidClean);
    assert.equal(signed.leftWithGc, before.leftWithGc);
    assert.equal(signed.signatureDate, "2026-10-10");
    assert.equal(signed.signedBy, "Clay");
    assert.equal(signed.certNumber, CLAY_CERT_NUMBER);
    assert.equal(signed.officeStatus, "signed");
    assert.equal(signed.signedPdfPath, "signed/clay-sign-fixture.pdf");
  });

  it("requires a drawn signature, a name, and a date", () => {
    assert.throws(() => assertClaySignInput({ signatureDataUrl: "", signatureDate: "2026-10-10", signedBy: "Clay" }), /signature/);
    assert.throws(() => assertClaySignInput({ signatureDataUrl: TINY_PNG, signatureDate: "", signedBy: "Clay" }), /date/);
    assert.throws(() => assertClaySignInput({ signatureDataUrl: TINY_PNG, signatureDate: "2026-10-10", signedBy: "  " }), /name/);
    assert.doesNotThrow(() =>
      assertClaySignInput({ signatureDataUrl: TINY_PNG, signatureDate: "2026-10-10", signedBy: "Clay" }),
    );
  });
});

describe("Clay link and email copy", () => {
  it("builds a /sign token URL and a short signed-mail subject", () => {
    assert.equal(
      claySignLink("https://va-home-abaa-daily.vercel.app", "abc123"),
      "https://va-home-abaa-daily.vercel.app/sign/abc123",
    );
    const report = { date: "2026-10-09", jobSiteReportNo: "1" };
    assert.equal(claySignedPdfFilename(report), "ABAA-VA-Home-2026-10-09-R1-signed.pdf");
    assert.equal(claySignedEmailSubject(report), "Clay signed VA Home daily 2026-10-09 report 1");
    assert.equal(formatSignedWhen("2026-10-10T00:36:00.000Z"), "Signed Oct 9, 2026 at 8:36 PM");
  });
});

describe("America/New_York dates", () => {
  it("keeps 8:36 PM ET on Friday Oct 9 as 2026-10-09, not the UTC next day", () => {
    assert.equal(todayISO(new Date("2026-10-10T00:36:00.000Z")), "2026-10-09");
    assert.equal(todayISO(new Date("2026-10-09T16:00:00.000Z")), "2026-10-09");
    assert.equal(todayISO(new Date("2026-10-10T04:00:00.000Z")), "2026-10-10");
    assert.equal(clayFormDate({ signatureDate: "", signedAt: "2026-10-10T00:36:00.000Z" }), "2026-10-09");
    assert.equal(clayFormDate({ signatureDate: "2026-10-09", signedAt: "2026-10-10T04:00:00.000Z" }), "2026-10-09");
  });
});

describe("print page signature block", () => {
  it("keeps the Clay warning until the daily is signed", () => {
    const waiting = claySignFixtureDaily();
    assert.equal(isClaySignedDaily(waiting), false);
    assert.match(CLAY_UNSIGNED_HINT, /do not sign as Clay unless you are Clay/);
    const signed = applyClaySignature(waiting, {
      signatureDataUrl: TINY_PNG,
      signatureDate: "2026-10-09",
      signedBy: "Clay",
      signedAt: "2026-10-10T00:36:00.000Z",
    });
    assert.equal(isClaySignedDaily(signed), true);
    assert.equal(clayFormDate(signed), "2026-10-09");
    assert.equal(CLAY_FULL_NAME, "Clay Butner");
    assert.equal(signed.certNumber, "306906");
  });
});

describe("signed official PDF", () => {
  it("makes 3 pages, keeps crew readings, and does not mutate the daily", async () => {
    const report = applyClaySignature(claySignFixtureDaily(), {
      signatureDataUrl: TINY_PNG,
      signatureDate: "2026-10-10",
      signedBy: "Clay",
      signedAt: "2026-10-10T16:12:00.000Z",
    });
    const snapshot = structuredClone(report);
    const bytes = await buildOfficialSignedPdf(report);
    assert.deepEqual(report.milTests, snapshot.milTests);
    assert.deepEqual(report.materials, snapshot.materials);
    assert.equal(report.loc1.wall, "E");
    assert.equal(newReport().certNumber, CLAY_CERT_NUMBER);

    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 3);
    assert.ok(bytes.byteLength > 200_000, "signed PDF should keep the official blank form");
    const text = pdfLiteralText(bytes).replace(/\x00/g, "");
    assert.match(text, /Virginia Home/);
    assert.match(text, /16/);
    assert.match(text, /A-3 east/);
    assert.match(text, /RS-24081/);
    assert.match(text, /SF-1182/);
    assert.match(text, /185/);
    assert.match(text, /2026-10-10/);
    assert.match(text, /306906/);
    assert.match(text, /Clay Butner/);
    assert.doesNotMatch(text, /DRAFT/);
    assert.doesNotMatch(text, /do not sign as Clay/);
  });
});

function pdfLiteralText(bytes: Uint8Array) {
  const raw = Buffer.from(bytes);
  const chunks: string[] = [];
  let offset = 0;
  while (offset < raw.length) {
    const start = raw.indexOf(Buffer.from("stream"), offset);
    if (start < 0) break;
    const dataStart = raw.indexOf(0x0a, start) + 1;
    const end = raw.indexOf(Buffer.from("endstream"), dataStart);
    if (end < 0) break;
    const data = raw.subarray(dataStart, end - 1);
    let stream: string;
    try {
      stream = inflateSync(data).toString("latin1");
    } catch {
      stream = data.toString("latin1");
    }
    for (const match of stream.matchAll(/<([0-9A-Fa-f]+)>/g)) {
      chunks.push(Buffer.from(match[1], "hex").toString("latin1"));
    }
    for (const match of stream.matchAll(/\(([^\\)]*(?:\\.[^\\)]*)*)\)/g)) {
      chunks.push(match[1].replace(/\\n/g, "\n").replace(/\\(.)/g, "$1"));
    }
    offset = end + 9;
  }
  return chunks.join("\n");
}
