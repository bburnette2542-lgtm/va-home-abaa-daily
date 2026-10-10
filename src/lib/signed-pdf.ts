import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  FLUID_DEFECTS,
  TRANS_DEFECTS,
  composedComments,
  type FluidDefect,
  type Report,
  type TransDefect,
} from "./report.ts";
import { CLAY_CERT_NUMBER } from "./clay-sign.ts";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 32;
const NAVY = rgb(27 / 255, 54 / 255, 93 / 255);
const INK = rgb(0.08, 0.1, 0.12);
const MUTED = rgb(0.35, 0.38, 0.42);
const WHITE = rgb(1, 1, 1);
const RULE = rgb(0.15, 0.16, 0.18);

const FLUID_PRINT: Record<FluidDefect, string> = {
  shadow: "SHADOW EFFECT",
  blisters: "BLISTERS",
  pinHoles: "PIN HOLES",
  fishEyes: "FISH EYES",
  slump: "SLUMPING",
  cracking: "CRACKING/ALLIGATORING",
  texture: "SMOOTHNESS/TEXTURE",
  efflorescence: "EFFLORESCENCE",
  overlap: "TRANSITION OVERLAP",
  uniformity: "PROPER UNIFORMITY",
};

const TRANS_PRINT: Record<TransDefect, string> = {
  laps: "LAPS",
  tJoints: "T-JOINTS",
  seams: "SEAMS",
  wrinkles: "WRINKLES",
  ties: "TIES",
  compat: "COMPATIBILITY OF MATERIALS",
  fishMouths: "FISH-MOUTHS",
  shingled: "SHINGLED PROPERLY",
  staggered: "JOINTS STAGGERED",
  mastic: "APPROVED MASTIC APPLIED",
  rolled: "ROLLED",
  delamination: "DELAMINATION",
};

function yn(v: string) {
  if (v === "Y") return "Yes";
  if (v === "N") return "No";
  return "";
}

function pdfSafe(value: unknown) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

type Ctx = {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

function text(ctx: Ctx, value: string, opts?: { x?: number; size?: number; font?: PDFFont; color?: RGB; max?: number }) {
  const size = opts?.size ?? 9;
  const font = opts?.font ?? ctx.font;
  const x = opts?.x ?? MARGIN;
  let line = pdfSafe(value);
  if (opts?.max) {
    while (line && font.widthOfTextAtSize(line, size) > opts.max) {
      line = line.slice(0, -1);
    }
  }
  ctx.page.drawText(line, {
    x,
    y: ctx.y,
    size,
    font,
    color: opts?.color ?? INK,
  });
}

function wrapped(ctx: Ctx, value: string, opts?: { size?: number; width?: number; font?: PDFFont }) {
  const size = opts?.size ?? 9;
  const font = opts?.font ?? ctx.font;
  const width = opts?.width ?? PAGE_W - MARGIN * 2;
  const words = pdfSafe(value).split(/\s+/).filter(Boolean);
  let line = "";
  const flush = () => {
    if (!line) return;
    text(ctx, line, { size, font });
    ctx.y -= size + 3;
    line = "";
  };
  if (words.length === 0) {
    ctx.y -= size + 3;
    return;
  }
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) flush();
    else line = next;
    if (!line) line = word;
  }
  flush();
}

function bar(ctx: Ctx, label: string) {
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: PAGE_W - MARGIN * 2,
    height: 16,
    color: NAVY,
  });
  ctx.page.drawText(label.toUpperCase(), {
    x: MARGIN + 8,
    y: ctx.y,
    size: 9,
    font: ctx.bold,
    color: WHITE,
  });
  ctx.y -= 20;
}

function line(ctx: Ctx, label: string, value: string) {
  text(ctx, `${label} ${pdfSafe(value)}`, { size: 9 });
  ctx.y -= 13;
}

function checkbox(ctx: Ctx, on: boolean, x: number, y: number) {
  ctx.page.drawRectangle({
    x,
    y,
    width: 8,
    height: 8,
    borderColor: INK,
    borderWidth: 0.8,
    color: on ? NAVY : WHITE,
  });
}

function box(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: RULE,
    borderWidth: 0.8,
  });
}

function footer(ctx: Ctx, pageNo: number) {
  ctx.page.drawText(
    `Date of Issue: 08/24/2015  F-115-041 Rev 3 ABAA Daily Job Site Report - FL  Page ${pageNo} of 3`,
    {
      x: MARGIN,
      y: 22,
      size: 7,
      font: ctx.font,
      color: MUTED,
    },
  );
}

function header(ctx: Ctx, report: Report, pageNo: number) {
  ctx.page.drawRectangle({
    x: MARGIN,
    y: PAGE_H - 78,
    width: 118,
    height: 42,
    color: NAVY,
  });
  ctx.page.drawText("ABAA", {
    x: MARGIN + 10,
    y: PAGE_H - 54,
    size: 16,
    font: ctx.bold,
    color: WHITE,
  });
  ctx.page.drawText("DAILY JOB SITE REPORT", {
    x: 168,
    y: PAGE_H - 44,
    size: 13,
    font: ctx.bold,
    color: NAVY,
  });
  ctx.page.drawText("Fluid Applied Air Barrier Assembly", {
    x: 168,
    y: PAGE_H - 58,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  ctx.page.drawText(`Page ${pageNo} of 3`, {
    x: 168,
    y: PAGE_H - 70,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  const boxX = 430;
  box(ctx.page, boxX, PAGE_H - 80, 150, 48);
  ctx.page.drawText(`Crew # ${pdfSafe(report.crewNumber)} of ${pdfSafe(report.crewOf)}`, {
    x: boxX + 8,
    y: PAGE_H - 48,
    size: 8,
    font: ctx.font,
    color: INK,
  });
  ctx.page.drawText(`Job Site Report# ${pdfSafe(report.jobSiteReportNo)}`, {
    x: boxX + 8,
    y: PAGE_H - 60,
    size: 8,
    font: ctx.font,
    color: INK,
  });
  ctx.page.drawText(`Date: ${pdfSafe(report.date)}`, {
    x: boxX + 8,
    y: PAGE_H - 72,
    size: 8,
    font: ctx.font,
    color: INK,
  });
  ctx.y = PAGE_H - 96;
}

function table(
  ctx: Ctx,
  headers: string[],
  rows: string[][],
  widths: number[],
) {
  const x0 = MARGIN;
  const headerH = 14;
  const rowH = 16;
  let x = x0;
  for (let i = 0; i < headers.length; i++) {
    ctx.page.drawRectangle({
      x,
      y: ctx.y - headerH + 4,
      width: widths[i],
      height: headerH,
      color: rgb(0.93, 0.93, 0.94),
      borderColor: RULE,
      borderWidth: 0.6,
    });
    text(ctx, headers[i], { x: x + 3, size: 6.5, font: ctx.bold, max: widths[i] - 6 });
    x += widths[i];
  }
  ctx.y -= headerH;
  for (const row of rows) {
    x = x0;
    for (let i = 0; i < row.length; i++) {
      box(ctx.page, x, ctx.y - rowH + 4, widths[i], rowH);
      text(ctx, row[i], { x: x + 3, size: 8, max: widths[i] - 6 });
      x += widths[i];
    }
    ctx.y -= rowH;
  }
  ctx.y -= 8;
}

function sampleMark(page: PDFPage, font: PDFFont) {
  page.drawText("SAMPLE", {
    x: 160,
    y: 380,
    size: 48,
    font,
    color: rgb(0.85, 0.55, 0.55),
    rotate: degrees(28),
    opacity: 0.18,
  });
}

async function embedSignature(doc: PDFDocument, dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (match[1].toLowerCase() === "png") return doc.embedPng(bytes);
  return doc.embedJpg(bytes);
}

function drawPage1(ctx: Ctx, report: Report) {
  header(ctx, report, 1);
  bar(ctx, "Project Information");
  line(ctx, "PROJECT NAME:", report.projectName);
  line(ctx, "AIR BARRIER CONTRACTOR:", report.contractor);
  line(ctx, "ABAA CONTRACTOR LICENSE #", report.license);
  table(
    ctx,
    ["INSTALLER NAME", "CERTIFICATION LEVEL (1, 2, 3)", "CERTIFICATION #", "EXPIRATION DATE"],
    report.installers.map((i) => [i.name, String(i.level), i.cert, i.exp]),
    [170, 150, 120, 108],
  );
  line(ctx, "SUBSTRATE TYPE:", report.substrateType);
  line(ctx, "SUBSTRATE TEMPERATURE:", `${report.substrateTemp} F`);
  line(ctx, "AMBIENT TEMP:", `${report.ambientTemp} F`);
  line(ctx, "SUBSTRATE MOISTURE CONTENT:", report.substrateMoisture);
  line(ctx, "RELATIVE HUMIDITY:", report.rh ? `${report.rh} %` : "");
  line(ctx, "SUBSTRATE SURFACE CONDITIONS AND PREPARATION REQUIRED:", "");
  wrapped(ctx, report.surfacePrep || " ");
  line(ctx, "SUBSTRATE CONDITIONS ACCEPTABLE FOR APPLICATION OF AIR BARRIER:", yn(report.substrateAcceptable));
  ctx.y -= 4;
  bar(ctx, "Material Information");
  table(
    ctx,
    ["PROJECT MATERIALS", "MANUFACTURER NAME", "PRODUCT NAME", "BATCH#"],
    report.materials.map((m) => [m.role, m.mfr, m.product, m.batch]),
    [190, 120, 130, 108],
  );
  line(ctx, "ARE ALL MATERIALS BEING INSTALLED LISTED IN PROJECT SPECIFICATION?", yn(report.materialsInSpec));
  line(ctx, "IF NO, HAVE ALL MATERIALS BEEN APPROVED FOR USE BY OWNER OR ARCHITECT?", yn(report.materialsApproved));
  line(ctx, "ARE ALL MATERIALS BEING INSTALLED PER MANUFACTURER SPECIFICATION?", yn(report.installedPerMfr));
  line(ctx, "ARE ALL MATERIALS BEING INSTALLED COMPATIBLE (PHYSICAL & CHEMICAL) WITH EACH OTHER PER MANUFACTURER?", yn(report.compatible));
  ctx.y -= 4;
  text(ctx, "ADDITIONAL INSTALLERS (LEVEL 1)", { font: ctx.bold, size: 9 });
  ctx.y -= 14;
  table(
    ctx,
    ["INSTALLER NAME", "CERTIFICATION LEVEL (1, 2, 3)", "CERTIFICATION #", "EXPIRATION DATE"],
    report.additionalInstallers.map((i) => [i.name, String(i.level), i.cert, i.exp]),
    [170, 150, 120, 108],
  );
  footer(ctx, 1);
}

function locBlock(ctx: Ctx, label: string, loc: Report["loc1"], x: number, width: number) {
  const top = ctx.y;
  box(ctx.page, x, top - 92, width, 100);
  ctx.page.drawText(label, { x: x + 6, y: top - 8, size: 9, font: ctx.bold, color: INK });
  ctx.page.drawText(`Time Started: ${pdfSafe(loc.timeStart || "--")}   Time Completed: ${pdfSafe(loc.timeEnd || "--")}`, {
    x: x + 6,
    y: top - 22,
    size: 8,
    font: ctx.font,
    color: INK,
  });
  ctx.page.drawText(`On Gridline: ${pdfSafe(loc.onGrid)}`, { x: x + 6, y: top - 34, size: 8, font: ctx.font, color: INK });
  ctx.page.drawText(`Between Gridline: ${pdfSafe(loc.betweenFrom)} to ${pdfSafe(loc.betweenTo)}`, {
    x: x + 6,
    y: top - 46,
    size: 8,
    font: ctx.font,
    color: INK,
  });
  ctx.page.drawText(`Between Elevation: ${pdfSafe(loc.elevFrom)} to ${pdfSafe(loc.elevTo)}`, {
    x: x + 6,
    y: top - 58,
    size: 8,
    font: ctx.font,
    color: INK,
  });
  ctx.page.drawText("Wall location:", { x: x + 6, y: top - 74, size: 8, font: ctx.font, color: INK });
  const walls = [
    ["N", "NORTH"],
    ["S", "SOUTH"],
    ["E", "EAST"],
    ["W", "WEST"],
  ] as const;
  walls.forEach(([code, name], i) => {
    const cx = x + 78 + i * 48;
    checkbox(ctx, loc.wall === code, cx, top - 76);
    ctx.page.drawText(name, { x: cx + 11, y: top - 74, size: 7, font: ctx.font, color: INK });
  });
}

function defectRow(
  ctx: Ctx,
  title: string,
  items: readonly string[],
  labels: Record<string, string>,
  selected: string[],
  clean: boolean,
) {
  box(ctx.page, MARGIN, ctx.y - 52, PAGE_W - MARGIN * 2, 64);
  ctx.page.drawText(title, {
    x: MARGIN + 8,
    y: ctx.y,
    size: 8,
    font: ctx.bold,
    color: INK,
  });
  let x = MARGIN + 8;
  let y = ctx.y - 16;
  items.forEach((id) => {
    const label = labels[id];
    const w = ctx.font.widthOfTextAtSize(label, 7) + 16;
    if (x + w > PAGE_W - MARGIN - 8) {
      x = MARGIN + 8;
      y -= 12;
    }
    checkbox(ctx, selected.includes(id), x, y - 1);
    ctx.page.drawText(label, { x: x + 11, y, size: 7, font: ctx.font, color: INK });
    x += w;
  });
  if (clean) {
    ctx.page.drawText("CLEAN", { x: PAGE_W - MARGIN - 48, y: ctx.y, size: 9, font: ctx.bold, color: NAVY });
  }
  ctx.y -= 72;
}

function drawPage2(ctx: Ctx, report: Report) {
  header(ctx, report, 2);
  bar(ctx, "Installation & Testing Location");
  const colW = (PAGE_W - MARGIN * 2 - 8) / 2;
  locBlock(ctx, "# 1", report.loc1, MARGIN, colW);
  locBlock(ctx, "# 2", report.loc2, MARGIN + colW + 8, colW);
  ctx.y -= 110;
  bar(ctx, "Testing Results");
  text(ctx, "VISUAL INSPECTION COMPLETED AT:", { size: 9, font: ctx.bold });
  checkbox(ctx, report.visualAt1, MARGIN + 210, ctx.y - 1);
  ctx.page.drawText("LOCATION 1", { x: MARGIN + 222, y: ctx.y, size: 8, font: ctx.font, color: INK });
  checkbox(ctx, report.visualAt2, MARGIN + 300, ctx.y - 1);
  ctx.page.drawText("LOCATION 2", { x: MARGIN + 312, y: ctx.y, size: 8, font: ctx.font, color: INK });
  ctx.y -= 18;
  defectRow(ctx, "VISUAL INSPECTION OF FLUID MEMBRANES", FLUID_DEFECTS, FLUID_PRINT, report.fluidDefects, report.fluidClean);
  defectRow(
    ctx,
    "VISUAL INSPECTION OF TRANSITION MATERIALS",
    TRANS_DEFECTS,
    TRANS_PRINT,
    report.transDefects,
    report.transClean,
  );
  line(ctx, "# OF DEFICIENCIES NOTED:", report.defNoted || "");
  line(ctx, "# OF DEFICIENCIES CORRECTED:", report.defCorrected || "");
  text(ctx, "DESCRIBE DEFICIENCIES & CORRECTIVE ACTION TAKEN:", { size: 8, font: ctx.bold });
  ctx.y -= 12;
  wrapped(ctx, report.defDescribe || " ");
  text(ctx, "LIQUID APPLIED MEMBRANES:", { size: 9, font: ctx.bold });
  ctx.y -= 13;
  line(ctx, "PROJECT SPECIFIED WET MIL THICKNESS:", report.projectWetMils);
  line(ctx, "PROJECT SPECIFIED DRY MIL THICKNESS:", report.projectDryMils);
  line(ctx, "MANUFACTURER'S SPECIFIED WET MIL THICKNESS:", report.mfrWetMils);
  line(ctx, "MANUFACTURER'S SPECIFIED DRY MIL THICKNESS:", report.mfrDryMils);
  text(ctx, "THICKNESS TESTING COMPLETED AT:", { size: 9 });
  checkbox(ctx, report.thicknessAt1, MARGIN + 200, ctx.y - 1);
  ctx.page.drawText("LOCATION 1", { x: MARGIN + 212, y: ctx.y, size: 8, font: ctx.font, color: INK });
  checkbox(ctx, report.thicknessAt2, MARGIN + 290, ctx.y - 1);
  ctx.page.drawText("LOCATION 2", { x: MARGIN + 302, y: ctx.y, size: 8, font: ctx.font, color: INK });
  ctx.y -= 16;
  text(ctx, "WET RESULTS WITH WET MIL GAUGE:", { size: 8, font: ctx.bold });
  ctx.y -= 14;
  const cellW = (PAGE_W - MARGIN * 2) / 6;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const i = row * 6 + col;
      const m = report.milTests[i] || { reading: "", location: "" };
      const x = MARGIN + col * cellW;
      box(ctx.page, x, ctx.y - 28, cellW, 36);
      ctx.page.drawText(`TEST ${i + 1}:`, { x: x + 3, y: ctx.y, size: 6.5, font: ctx.bold, color: INK });
      ctx.page.drawText(pdfSafe(m.reading), { x: x + 3, y: ctx.y - 11, size: 8, font: ctx.font, color: INK });
      ctx.page.drawText(`LOCATION: ${pdfSafe(m.location)}`, {
        x: x + 3,
        y: ctx.y - 22,
        size: 6,
        font: ctx.font,
        color: INK,
        maxWidth: cellW - 6,
      });
    }
    ctx.y -= 40;
  }
  text(ctx, "DESCRIBE DEFICIENCIES & CORRECTIVE ACTION TAKEN:", { size: 8, font: ctx.bold });
  ctx.y -= 12;
  wrapped(ctx, report.milDefDescribe || " ");
  footer(ctx, 2);
}

async function drawPage3(ctx: Ctx, report: Report, doc: PDFDocument) {
  header(ctx, report, 3);
  text(ctx, "ADHESION TESTING:", { size: 10, font: ctx.bold });
  ctx.y -= 14;
  line(ctx, "IS ALL REQUIRED TESTING EQUIPMENT ON-SITE?", yn(report.testingEquipOnSite));
  line(ctx, "ADHESION TESTER ON-SITE:", yn(report.testerOnSite));
  line(ctx, "TEST DISCS ON-SITE:", yn(report.discsOnSite));
  line(ctx, "SIZE OF DISK:", `${report.diskSize} (MINIMUM SIZE: 2.25" DIA., MAXIMUM 4" DIA.)`);
  text(ctx, "ADHESION TESTING COMPLETED AT:", { size: 9 });
  checkbox(ctx, report.adhesionAt1, MARGIN + 200, ctx.y - 1);
  ctx.page.drawText("LOCATION 1", { x: MARGIN + 212, y: ctx.y, size: 8, font: ctx.font, color: INK });
  checkbox(ctx, report.adhesionAt2, MARGIN + 290, ctx.y - 1);
  ctx.page.drawText("LOCATION 2", { x: MARGIN + 302, y: ctx.y, size: 8, font: ctx.font, color: INK });
  ctx.y -= 16;
  wrapped(
    ctx,
    "INDICATE BOND STRENGTH RESULT FOR EACH TEST (GAUGE READING) AND INDICATE: IF PAD RELEASED FROM MATERIAL (PM), OR IF THE MATERIAL RELEASED FROM SUBSTRATE (MS) OR IF SUBSTRATE SEPARATION (SS) OCCURRED.",
    { size: 7.5 },
  );
  const cellW = (PAGE_W - MARGIN * 2) / 6;
  for (let i = 0; i < 6; i++) {
    const a = report.adhesionTests[i] || { gauge: "", location: "", mode: "" };
    const x = MARGIN + i * cellW;
    box(ctx.page, x, ctx.y - 36, cellW, 48);
    ctx.page.drawText(`DISK ${i + 1}`, { x: x + 3, y: ctx.y, size: 6.5, font: ctx.bold, color: INK });
    ctx.page.drawText(pdfSafe(a.gauge), { x: x + 3, y: ctx.y - 12, size: 8, font: ctx.font, color: INK });
    ctx.page.drawText(`LOCATION: ${pdfSafe(a.location)}`, { x: x + 3, y: ctx.y - 23, size: 6, font: ctx.font, color: INK });
    ctx.page.drawText(pdfSafe(a.mode), { x: x + 3, y: ctx.y - 33, size: 7, font: ctx.font, color: INK });
  }
  ctx.y -= 52;
  line(ctx, "*IF TESTING WAS NOT COMPLETED, YOU MUST INDICATE WHY.", report.adhesionWhyNot);
  text(ctx, "COMMENTS:", { size: 9, font: ctx.bold });
  ctx.y -= 13;
  wrapped(ctx, composedComments(report) || " ");
  line(ctx, "DAILY JOB SITE REPORTS LEFT WITH GENERAL CONTRACTOR / OWNER'S REPRESENTATIVE*?", yn(report.leftWithGc));
  text(ctx, "*MANDATORY REQUIREMENT PER ABAA QUALITY ASSURANCE PROGRAM.", { size: 7, color: MUTED });
  ctx.y -= 12;
  line(ctx, "IF NO, WHY?", report.leftWithGcWhy);
  ctx.y -= 24;

  const sigY = Math.max(ctx.y, 90);
  const col = (PAGE_W - MARGIN * 2) / 3;
  ctx.page.drawLine({
    start: { x: MARGIN, y: sigY },
    end: { x: MARGIN + col - 12, y: sigY },
    thickness: 0.8,
    color: INK,
  });
  ctx.page.drawText(pdfSafe(report.signatureDate), {
    x: MARGIN,
    y: sigY + 6,
    size: 11,
    font: ctx.font,
    color: INK,
  });
  ctx.page.drawText("DATE", { x: MARGIN, y: sigY - 12, size: 7, font: ctx.bold, color: MUTED });

  const sig = await embedSignature(doc, report.signatureDataUrl || "");
  if (sig) {
    const w = 150;
    const h = (sig.height / sig.width) * w;
    ctx.page.drawImage(sig, {
      x: MARGIN + col,
      y: sigY - 4,
      width: w,
      height: Math.min(h, 42),
    });
  }
  ctx.page.drawLine({
    start: { x: MARGIN + col, y: sigY },
    end: { x: MARGIN + col * 2 - 12, y: sigY },
    thickness: 0.8,
    color: INK,
  });
  ctx.page.drawText("LEVEL 2/3 CERTIFIED INSTALLER SIGNATURE", {
    x: MARGIN + col,
    y: sigY - 12,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });

  ctx.page.drawLine({
    start: { x: MARGIN + col * 2, y: sigY },
    end: { x: PAGE_W - MARGIN, y: sigY },
    thickness: 0.8,
    color: INK,
  });
  ctx.page.drawText(CLAY_CERT_NUMBER, {
    x: MARGIN + col * 2,
    y: sigY + 6,
    size: 14,
    font: ctx.bold,
    color: INK,
  });
  ctx.page.drawText("CERTIFICATION #", {
    x: MARGIN + col * 2,
    y: sigY - 12,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  footer(ctx, 3);
}

export async function buildOfficialSignedPdf(report: Report): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = [doc.addPage([PAGE_W, PAGE_H]), doc.addPage([PAGE_W, PAGE_H]), doc.addPage([PAGE_W, PAGE_H])];
  const ctx1: Ctx = { page: pages[0], font, bold, y: 0 };
  const ctx2: Ctx = { page: pages[1], font, bold, y: 0 };
  const ctx3: Ctx = { page: pages[2], font, bold, y: 0 };
  if (report.sample) pages.forEach((p) => sampleMark(p, bold));
  drawPage1(ctx1, report);
  drawPage2(ctx2, report);
  await drawPage3(ctx3, report, doc);
  return doc.save();
}
