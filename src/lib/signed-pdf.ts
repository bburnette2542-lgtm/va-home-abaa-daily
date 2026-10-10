import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFForm } from "pdf-lib";
import { clayFormDate, CLAY_CERT_NUMBER, CLAY_FULL_NAME } from "./clay-sign.ts";
import { composedComments, FLUID_DEFECTS, TRANS_DEFECTS, type Report } from "./report.ts";

const OFFICIAL_BLANK = "F-115-041-Rev3-blank.pdf";

function officialBlankBytes(): Uint8Array {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    fileURLToPath(new URL(`./forms/${OFFICIAL_BLANK}`, import.meta.url)),
    join(here, "forms", OFFICIAL_BLANK),
    join(process.cwd(), "src/lib/forms", OFFICIAL_BLANK),
    join(process.cwd(), "public/forms", OFFICIAL_BLANK),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path);
    } catch {
      // try the next place
    }
  }
  throw new Error("The official ABAA F-115-041 form is missing.");
}

function pdfSafe(value: unknown) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

function setText(form: PDFForm, name: string, value: unknown, size = 8) {
  const text = pdfSafe(value).trim();
  if (!text) return;
  try {
    const field = form.getTextField(name);
    // Official DAs are often `/Helv  0 Tf` or octal-escaped, which pdf-lib rejects.
    field.acroField.setDefaultAppearance(`/Helv ${size} Tf 0 g`);
    field.setFontSize(size);
    field.setText(text);
  } catch {
    // official form field names stay as ABAA shipped them
  }
}

function setLines(form: PDFForm, names: string[], value: unknown, size = 8) {
  const text = pdfSafe(value).trim();
  if (!text) return;
  const words = text.split(/\s+/);
  const chunks: string[] = names.map(() => "");
  let i = 0;
  for (const word of words) {
    const next = chunks[i] ? `${chunks[i]} ${word}` : word;
    if (i < names.length - 1 && next.length > 90) {
      i += 1;
      chunks[i] = word;
    } else {
      chunks[i] = next;
    }
  }
  names.forEach((name, idx) => setText(form, name, chunks[idx], size));
}

function check(form: PDFForm, name: string, on: boolean) {
  if (!on) return;
  try {
    const box = form.getCheckBox(name);
    box.check();
    try {
      box.defaultUpdateAppearances();
    } catch {
      // keep the on-state even if the official appearance stream is odd
    }
  } catch {
    // leave blank if the official box name does not match
  }
}

function ynBoxes(form: PDFForm, yesName: string, noName: string, value: string) {
  check(form, yesName, value === "Y");
  check(form, noName, value === "N");
}

async function embedSignature(doc: PDFDocument, dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (match[1].toLowerCase() === "png") return doc.embedPng(bytes);
  return doc.embedJpg(bytes);
}

function fillPage1(form: PDFForm, report: Report) {
  setText(form, "Crew", report.crewNumber, 9);
  setText(form, "Text6", report.crewOf, 9);
  setText(form, "Job Site Report", report.jobSiteReportNo, 9);
  setText(form, "Date", report.date, 8);
  setText(form, "Text7", report.projectName, 9);
  setText(form, "Text8", report.contractor, 9);
  setText(form, "ABAA CONTRACTOR LICENSE", report.license, 9);

  report.installers.forEach((row, i) => {
    const n = i + 1;
    setText(form, `INSTALLER NAMERow${n}`, row.name);
    setText(form, `CERTIFICATION LEVEL 1 2 3Row${n}`, row.level);
    setText(form, `CERTIFICATION Row${n}`, row.cert);
    setText(form, `EXPIRATION DATERow${n}`, row.exp);
  });
  report.additionalInstallers.forEach((row, i) => {
    const n = i + 5;
    setText(form, `INSTALLER NAMERow${n}`, row.name);
    setText(form, `CERTIFICATION LEVEL 1 2 3Row${n}`, row.level);
    setText(form, `CERTIFICATION Row${n}`, row.cert);
    setText(form, `EXPIRATION DATERow${n}`, row.exp);
  });

  setText(form, "SUBSTRATE TYPE", report.substrateType, 7);
  setText(form, "SUBSTRATE TEMPERATURE", report.substrateTemp, 8);
  setText(form, "AMBIENT TEMP", report.ambientTemp, 8);
  setText(form, "SUBSTRATE MOISTURE CONTENT", report.substrateMoisture, 7);
  setText(form, "RELATIVE HUMIDITY", report.rh, 8);
  setLines(
    form,
    [
      "SUBSTRATE SURFACE CONDITIONS AND PREPARATION REQUIRED 1",
      "SUBSTRATE SURFACE CONDITIONS AND PREPARATION REQUIRED 2",
    ],
    report.surfacePrep,
    7,
  );
  ynBoxes(form, "Check Box9", "Check Box10", report.substrateAcceptable);

  const mfr = [
    "PRIMARY AIR BARRIER AB",
    "AB PRIMER",
    "TRANSITION MATERIALS TM",
    "TM PRIMER",
    "MASTICSEALANT",
    "OTHER MESH LIQUID FLASHING ETC",
  ];
  const product = ["Text11", "Text12", "Text13", "Text14", "Text15", "Text17"];
  const batch = ["Text18", "Text19", "Text20", "Text21", "Text22", "Text23"];
  report.materials.forEach((row, i) => {
    setText(form, mfr[i], row.mfr, 7);
    setText(form, product[i], row.product, 7);
    setText(form, batch[i], row.batch, 7);
  });

  ynBoxes(form, "Check Box1", "Check Box2", report.materialsInSpec);
  ynBoxes(form, "Check Box3", "Check Box4", report.materialsApproved);
  ynBoxes(form, "Check Box5", "Check Box6", report.installedPerMfr);
  ynBoxes(form, "Check Box7", "Check Box8", report.compatible);
}

function fillPage2(form: PDFForm, report: Report) {
  setText(form, "Time Started 1", report.loc1.timeStart, 8);
  setText(form, "Time completed 1", report.loc1.timeEnd, 8);
  setText(form, "ON GRIDLINE", report.loc1.onGrid, 8);
  setText(form, "Text24", report.loc1.betweenFrom, 8);
  setText(form, "BETWEEN GRIDLINE TO", report.loc1.betweenTo, 8);
  setText(form, "Text25", report.loc1.elevFrom, 8);
  setText(form, "BETWEEN ELEVATION TO", report.loc1.elevTo, 8);
  check(form, "Check Box17", report.loc1.wall === "N");
  check(form, "Check Box18", report.loc1.wall === "S");
  check(form, "Check Box19", report.loc1.wall === "E");
  check(form, "Check Box20", report.loc1.wall === "W");

  setText(form, "Time started 2", report.loc2.timeStart, 8);
  setText(form, "Time completed 2", report.loc2.timeEnd, 8);
  setText(form, "ON GRIDLINE_2", report.loc2.onGrid, 8);
  setText(form, "BETWEEN GRIDLINE TO_2", report.loc2.betweenFrom, 8);
  setText(form, "Text26", report.loc2.betweenTo, 8);
  setText(form, "BETWEEN ELEVATION TO_2", report.loc2.elevFrom, 8);
  setText(form, "Text27", report.loc2.elevTo, 8);
  check(form, "Check Box21", report.loc2.wall === "N");
  check(form, "Check Box22", report.loc2.wall === "S");
  check(form, "Check Box23", report.loc2.wall === "E");
  check(form, "Check Box24", report.loc2.wall === "W");

  check(form, "Check Box25", report.visualAt1);
  check(form, "Check Box26", report.visualAt2);

  const fluidBoxes = [
    "Check Box27",
    "Check Box28",
    "Check Box29",
    "Check Box30",
    "Check Box31",
    "Check Box32",
    "Check Box33",
    "Check Box34",
    "Check Box35",
    "Check Box36",
  ];
  FLUID_DEFECTS.forEach((id, i) => check(form, fluidBoxes[i], report.fluidDefects.includes(id)));

  const transBoxes = [
    "Check Box37",
    "Check Box38",
    "Check Box39",
    "Check Box40",
    "Check Box41",
    "Check Box42",
    "Check Box43",
    "Check Box44",
    "Check Box45",
    "Check Box46",
    "Check Box47",
    "Check Box48",
  ];
  TRANS_DEFECTS.forEach((id, i) => check(form, transBoxes[i], report.transDefects.includes(id)));

  setText(form, "OF DEFICIENCIES NOTED", report.defNoted, 8);
  setText(form, "OF DEFICIENCIES CORRECTED", report.defCorrected, 8);
  setLines(
    form,
    ["DESCRIBE DEFICIENCIES  CORRECTIVE ACTION TAKEN 2.0", "DESCRIBE DEFICIENCIES  CORRECTIVE ACTION TAKEN 2.1"],
    report.defDescribe,
    8,
  );

  setText(form, "PROJECT SPECIFIED WET MIL THICKNESS", report.projectWetMils, 8);
  setText(form, "PROJECT SPECIFIED DRY MIL THICKNESS", report.projectDryMils, 8);
  setText(form, "MANUFACTURERS SPECIFIED WET MIL THICKNESS", report.mfrWetMils, 8);
  setText(form, "MANUFACTURERS SPECIFIED DRY MIL THICKNESS", report.mfrDryMils, 8);
  check(form, "Check Box49", report.thicknessAt1);
  check(form, "Check Box50", report.thicknessAt2);

  const milFields = [
    "Test 1 mil",
    "test 2 mil",
    "Test 3 mil",
    "Test 4 mil",
    "Test 5 mil",
    "Test 6 mils",
    "Test 7 mil",
    "Test 8 mil",
    "Test 9 mils",
    "Test 10 mil",
    "Test 11 mil",
    "Test 12 mil",
  ];
  const milLocs = [
    "TEST 1 LOCATION",
    "TEST 2 LOCATION",
    "TEST 3 LOCATION",
    "TEST 4 LOCATION",
    "TEST 5 LOCATION",
    "TEST 6 LOCATION",
    "TEST 7 LOCATION",
    "TEST 8 LOCATION",
    "TEST 9 LOCATION",
    "TEST 10 LOCATION",
    "TEST 11 LOCATION",
    "TEST 12 LOCATION",
  ];
  report.milTests.forEach((row, i) => {
    setText(form, milFields[i], row.reading, 8);
    setText(form, milLocs[i], row.location, 6);
  });
  setText(form, "Def corr act taken", report.milDefDescribe, 8);
}

function fillPage3(form: PDFForm, report: Report) {
  ynBoxes(form, "Check Box51", "Check Box52", report.testingEquipOnSite);
  ynBoxes(form, "Check Box53", "Check Box54", report.testerOnSite);
  ynBoxes(form, "Check Box55", "Check Box56", report.discsOnSite);
  setText(form, "SIZE OF DISK", report.diskSize, 8);
  check(form, "Check Box57", report.adhesionAt1);
  check(form, "Check Box58", report.adhesionAt2);

  const gauges = [
    "Disk 1 ad tst",
    "Disk 2 adh tst",
    "Disk 3 adh tst",
    "Disk 4 adh tst",
    "Disk 5 adh tst",
    "Disk 6 adh tst",
  ];
  const locs = [
    "DISK 1 LOCATION",
    "DISK 2 LOCATION",
    "DISK 3 LOCATION",
    "DISK 4 LOCATION",
    "DISK 5 LOCATION",
    "DISK 6 LOCATION",
  ];
  report.adhesionTests.forEach((row, i) => {
    const result = [row.gauge, row.mode].filter((part) => String(part || "").trim()).join(" ");
    setText(form, gauges[i], result, 7);
    setText(form, locs[i], row.location, 6);
  });

  setLines(form, ["COMMENTS 2.0", "COMMENTS 2.1.0", "COMMENTS 2.1.1"], composedComments(report), 8);
  ynBoxes(form, "Check Box59", "Check Box60", report.leftWithGc);
  setLines(form, ["IF NO WHY 2.0", "IF NO WHY 2.1"], report.leftWithGcWhy, 8);

  setText(form, "DATE", clayFormDate(report), 10);
  setText(form, "CERTIFICATION", CLAY_CERT_NUMBER, 10);
}

function signatureImageBox(form: PDFForm) {
  try {
    const field = form.getSignature("LEVEL 23 CERTIFIED INSTALLER SIGNATURE");
    const rect = field.acroField.getWidgets()[0]?.getRectangle();
    if (rect) {
      return {
        x: rect.x,
        y: rect.y - 8,
        width: rect.width,
        height: 32,
        nameX: rect.x,
        nameY: Math.max(rect.y - 22, 300),
      };
    }
  } catch {
    // official field name stays as ABAA shipped it
  }
  return { x: 324, y: 316, width: 176, height: 32, nameX: 324, nameY: 312 };
}

export async function buildOfficialSignedPdf(report: Report): Promise<Uint8Array> {
  const doc = await PDFDocument.load(officialBlankBytes());
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  fillPage1(form, report);
  fillPage2(form, report);
  fillPage3(form, report);

  const sig = await embedSignature(doc, report.signatureDataUrl || "");
  const box = signatureImageBox(form);
  const page3 = doc.getPage(2);
  if (sig) {
    const scale = Math.min(box.width / sig.width, box.height / sig.height);
    page3.drawImage(sig, {
      x: box.x,
      y: box.y,
      width: sig.width * scale,
      height: sig.height * scale,
    });
  }
  page3.drawText(CLAY_FULL_NAME, {
    x: box.nameX,
    y: box.nameY,
    size: 8,
    font,
    color: rgb(0.08, 0.1, 0.12),
  });

  if (report.adhesionWhyNot?.trim()) {
    doc.getPage(2).drawText(pdfSafe(report.adhesionWhyNot), {
      x: 36,
      y: 520,
      size: 8,
      font,
      color: rgb(0.08, 0.1, 0.12),
      maxWidth: 540,
    });
  }

  if (report.sample) {
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    doc.getPages().forEach((page) => {
      page.drawText("SAMPLE", {
        x: 180,
        y: 360,
        size: 48,
        font: bold,
        color: rgb(0.75, 0.2, 0.2),
        rotate: degrees(28),
        opacity: 0.12,
      });
    });
  }

  try {
    form.updateFieldAppearances(font);
  } catch {
    // some official fields have no default appearance; flatten still keeps values
  }
  form.flatten();
  return doc.save({ useObjectStreams: false, updateFieldAppearances: false });
}
