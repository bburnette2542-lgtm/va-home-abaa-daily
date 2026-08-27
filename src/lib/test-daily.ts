import { defaultMaterials, newReport, type Photo, type Report } from "./report";
import { uid } from "./utils";

function png(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  draw(ctx);
  return canvas.toDataURL("image/png");
}

function claySignature() {
  return png(640, 180, (ctx) => {
    ctx.fillStyle = "#efe8d6";
    ctx.fillRect(0, 0, 640, 180);
    ctx.strokeStyle = "#1b365d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.bezierCurveTo(80, 40, 140, 160, 200, 90);
    ctx.bezierCurveTo(240, 40, 260, 140, 320, 85);
    ctx.bezierCurveTo(380, 20, 420, 150, 520, 70);
    ctx.stroke();
    ctx.font = "italic 28px Georgia, serif";
    ctx.fillStyle = "#1a1f2b";
    ctx.fillText("Clay Butner  (TEST)", 48, 160);
  });
}

function labeledPhoto(title: string, detail: string): string {
  return png(960, 640, (ctx) => {
    ctx.fillStyle = "#d9d2c3";
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = "#1b365d";
    ctx.fillRect(0, 0, 960, 72);
    ctx.fillStyle = "#f6f3ec";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("TEST PHOTO — not a job photo", 28, 46);
    ctx.fillStyle = "#1a1f2b";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(title, 40, 280);
    ctx.font = "28px sans-serif";
    ctx.fillText(detail, 40, 340);
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#5c6573";
    ctx.fillText("Virginia Home 725-011 · SAMPLE daily", 40, 560);
  });
}

function testPhotos(): Photo[] {
  return [
    {
      id: uid(),
      kind: "substrate",
      caption: "TEST — Densglass / Glassroc, east elevation A–B",
      dataUrl: labeledPhoto("Substrate", "Densglass / Glassroc · East A–B · 58°F"),
    },
    {
      id: uid(),
      kind: "mils",
      caption: "TEST — wet mil gauge 16 at A-3 east",
      dataUrl: labeledPhoto("Wet mil gauge", "16 wet mils at A-3 east · target 15"),
    },
    {
      id: uid(),
      kind: "adhesion",
      caption: "TEST — 3 in disk, 185 psi, MS",
      dataUrl: labeledPhoto("Adhesion disk", "Disk 1 · 185 psi · MS · A-3 east"),
    },
  ];
}

export function buildTestDaily(existingCount: number): Report {
  const report = newReport(existingCount);
  const mats = defaultMaterials();
  mats[0] = { ...mats[0], batch: "TEST-RS-24081" };
  mats[2] = { ...mats[2], batch: "TEST-SF-1182" };
  mats[5] = { ...mats[5], batch: "TEST-SF-1182" };

  const milTests = report.milTests.map((m, i) => {
    if (i === 0) return { reading: "16", location: "A-3 east" };
    if (i === 1) return { reading: "15", location: "A-5 east" };
    if (i === 2) return { reading: "16", location: "B-2 east" };
    return m;
  });

  const adhesionTests = report.adhesionTests.map((a, i) => {
    if (i === 0) return { gauge: "185", location: "A-3 east", mode: "MS" as const };
    if (i === 1) return { gauge: "172", location: "A-5 east", mode: "MS" as const };
    return a;
  });

  return {
    ...report,
    sample: true,
    filledBy: "Clay Butner",
    onSite: ["Clay Butner", "Jenni Rivera", "Jairo Rivera", "Elias Dubon"],
    substrateTemp: "58",
    ambientTemp: "62",
    substrateMoisture: "dry",
    rh: "45",
    surfacePrep: "Clean, dry Densglass. Dusted. Ready for Rollershield.",
    substrateAcceptable: "Y",
    materials: mats,
    loc1: {
      timeStart: "7:15 AM",
      timeEnd: "3:30 PM",
      onGrid: "A",
      betweenFrom: "A",
      betweenTo: "B",
      elevFrom: "102",
      elevTo: "114",
      wall: "E",
    },
    visualAt1: true,
    fluidClean: true,
    transClean: true,
    defNoted: "0",
    defCorrected: "0",
    defDescribe: "None. Visual CLEAN.",
    milTests,
    adhesionTests,
    comments:
      "TEST SUBMISSION — fake answers and photos so the office inbox can be checked. Do not send to Gilbane.",
    leftWithGc: "Y",
    clayReady: "Y",
    signatureDataUrl: claySignature(),
    signatureDate: report.date,
    photos: testPhotos(),
    submittedAt: "",
  };
}
