import { composedComments, type LocationBlock, type Report } from "./report";

export const OFFICE = {
  name: "Bernie Burnette",
  email: "bernie@jamesriverexteriors.com",
} as const;

export function downloadJson(report: Report) {
  const blob = new Blob([JSON.stringify(report)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ABAA-VA-Home-${report.date}-R${report.jobSiteReportNo}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function locLine(n: number, loc: LocationBlock) {
  if (!loc.timeStart && !loc.wall && !loc.onGrid) return "";
  return [
    `Location ${n}: ${loc.timeStart || "—"} – ${loc.timeEnd || "—"}`,
    loc.onGrid ? `on grid ${loc.onGrid}` : "",
    loc.betweenFrom || loc.betweenTo ? `between ${loc.betweenFrom || "—"} and ${loc.betweenTo || "—"}` : "",
    loc.elevFrom || loc.elevTo ? `elev ${loc.elevFrom || "—"} to ${loc.elevTo || "—"}` : "",
    loc.wall ? `wall ${loc.wall}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function emailSubject(report: Report) {
  const sample = report.sample ? " SAMPLE" : "";
  return `VA Home ABAA Daily ${report.date} #${report.jobSiteReportNo}${sample}`;
}

export function emailBody(report: Report) {
  const mils = report.milTests
    .filter((m) => m.reading.trim())
    .map((m) => `${m.reading} @ ${m.location || "—"}`)
    .join("; ");
  const adh = report.adhesionTests
    .filter((a) => a.gauge.trim())
    .map((a) => `${a.gauge} psi ${a.mode} @ ${a.location || "—"}`)
    .join("; ");
  const batches = report.materials
    .filter((m) => m.batch)
    .map((m) => `${m.product || m.role} ${m.batch}`)
    .join("; ");
  const photoKinds = report.photos.map((p) => p.kind).join(", ") || "none";

  return [
    report.sample ? "SAMPLE — do not send to Gilbane. Office copy only." : "Office copy of today's ABAA daily.",
    `To: ${OFFICE.name} <${OFFICE.email}>`,
    `${report.projectName} 725-011 · ${report.contractor} · License ${report.license}`,
    `Date ${report.date} · Crew ${report.crewNumber}/${report.crewOf} · Report #${report.jobSiteReportNo}`,
    `Filled by ${report.filledBy || "—"}`,
    `On site: ${report.onSite.join(", ") || "—"}`,
    `Substrate ${report.substrateType} · ${report.substrateTemp || "—"}°F / amb ${report.ambientTemp || "—"}°F / RH ${report.rh || "—"}% · acceptable ${report.substrateAcceptable || "—"}`,
    `Prep: ${report.surfacePrep || "—"}`,
    `Batches: ${batches || "—"}`,
    locLine(1, report.loc1),
    locLine(2, report.loc2),
    `Visual: fluid ${report.fluidClean ? "CLEAN" : report.fluidDefects.join(",") || "—"} · transitions ${report.transClean ? "CLEAN" : report.transDefects.join(",") || "—"}`,
    `Wet mils (target ${report.projectWetMils}): ${mils || "none"}`,
    `Adhesion: ${adh || report.adhesionWhyNot || "none"}`,
    `Left with Gilbane: ${report.leftWithGc || "—"}${report.leftWithGcWhy ? ` (${report.leftWithGcWhy})` : ""}`,
    `Clay signed: ${report.signatureDataUrl ? "Yes" : "No"} · Cert ${report.certNumber}`,
    `Photos (${report.photos.length}): ${photoKinds}`,
    composedComments(report),
  ]
    .filter(Boolean)
    .join("\n");
}

export function mailtoBernieUrl(report: Report) {
  return `mailto:${OFFICE.email}?subject=${encodeURIComponent(emailSubject(report))}&body=${encodeURIComponent(emailBody(report))}`;
}

export function emailBernie(report: Report) {
  const a = document.createElement("a");
  a.href = mailtoBernieUrl(report);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function shareWithOffice(report: Report) {
  const title = emailSubject(report);
  const text = emailBody(report);
  const json = new File(
    [JSON.stringify(report, null, 2)],
    `ABAA-VA-Home-${report.date}.json`,
    { type: "application/json" },
  );

  try {
    if (navigator.canShare?.({ files: [json] })) {
      await navigator.share({ title, text, files: [json] });
      return "shared" as const;
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared" as const;
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return "cancel" as const;
  }
  emailBernie(report);
  return "email" as const;
}
