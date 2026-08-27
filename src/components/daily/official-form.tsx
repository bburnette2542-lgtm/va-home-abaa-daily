import { AbaaMark } from "@/components/abaa-mark";
import {
  FLUID_DEFECTS,
  TRANS_DEFECTS,
  composedComments,
  type FluidDefect,
  type Report,
  type TransDefect,
} from "@/lib/report";

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

function Box({ on }: { on: boolean }) {
  return (
    <span
      className="mr-1 inline-block h-3 w-3 border border-ink align-middle"
      style={{ background: on ? "#1b365d" : "#fff" }}
    />
  );
}

function Line({ value, className = "" }: { value?: string; className?: string }) {
  return (
    <span className={`inline-block min-h-4 min-w-16 border-b border-ink px-1 ${className}`}>
      {value || "\u00a0"}
    </span>
  );
}

export function OfficialForm({ report }: { report: Report }) {
  return (
    <div className="official mx-auto flex max-w-[8.5in] flex-col gap-6 text-ink">
      {report.sample ? (
        <div className="no-print rounded-md bg-warn px-3 py-2 text-center text-sm font-medium text-paper">
          SAMPLE — work has not started. Do not send to Gilbane.
        </div>
      ) : null}
      <Page1 report={report} />
      <Page2 report={report} />
      <Page3 report={report} />
      {report.photos.length ? <PhotoPages report={report} /> : null}
    </div>
  );
}

function PageHead({ report, page }: { report: Report; page: number }) {
  return (
    <header className="mb-3 flex items-start justify-between gap-3">
      <AbaaMark className="h-14 w-[220px]" />
      <div className="flex-1 text-center">
        <p className="font-display text-xl font-bold tracking-wide">DAILY JOB SITE REPORT</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider">
          Fluid Applied Air Barrier Assembly
        </p>
        <p className="mt-1 text-[10px] text-muted">
          866.956.5888 | abaa@airbarrier.org | www.airbarrier.org
        </p>
      </div>
      <div className="box w-40 p-2 text-[11px]">
        <div>
          Crew # <Line value={report.crewNumber} className="w-8" /> of{" "}
          <Line value={report.crewOf} className="w-8" />
        </div>
        <div className="mt-1">
          Job Site Report# <Line value={report.jobSiteReportNo} className="w-16" />
        </div>
        <div className="mt-1">
          Date: <Line value={report.date} className="w-24" />
        </div>
      </div>
      <div className="hidden text-[10px] print:block">Page {page} of 3</div>
    </header>
  );
}

function Page1({ report }: { report: Report }) {
  return (
    <section className="print-page relative rounded-sm border border-line bg-white p-5 shadow-sm">
      {report.sample ? <Watermark /> : null}
      <PageHead report={report} page={1} />
      <div className="bar mb-2">Project Information</div>
      <p className="mb-1 text-[12px]">
        <span className="font-semibold">PROJECT NAME:</span> {report.projectName}
      </p>
      <p className="mb-1 text-[12px]">
        <span className="font-semibold">AIR BARRIER CONTRACTOR:</span> {report.contractor}
      </p>
      <p className="mb-2 text-[12px]">
        <span className="font-semibold">ABAA CONTRACTOR LICENSE #</span> {report.license}
      </p>
      <table className="mb-3">
        <thead>
          <tr>
            <th>INSTALLER NAME</th>
            <th>CERTIFICATION LEVEL (1, 2, 3)</th>
            <th>CERTIFICATION #</th>
            <th>EXPIRATION DATE</th>
          </tr>
        </thead>
        <tbody>
          {report.installers.map((i) => (
            <tr key={i.name}>
              <td>{i.name}</td>
              <td>{i.level}</td>
              <td>{i.cert}</td>
              <td>{i.exp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-1 text-[12px]">
        <span className="font-semibold">SUBSTRATE TYPE:</span> {report.substrateType}
        <span className="ml-4 font-semibold">SUBSTRATE TEMPERATURE:</span> {report.substrateTemp} °F
        <span className="ml-4 font-semibold">AMBIENT TEMP:</span> {report.ambientTemp} °F
      </p>
      <p className="mb-1 text-[12px]">
        <span className="font-semibold">SUBSTRATE MOISTURE CONTENT:</span> {report.substrateMoisture}
        <span className="ml-4 font-semibold">RELATIVE HUMIDITY:</span> {report.rh} %
      </p>
      <p className="mb-1 text-[12px]">
        <span className="font-semibold">SUBSTRATE SURFACE CONDITIONS AND PREPARATION REQUIRED:</span>{" "}
        {report.surfacePrep}
      </p>
      <p className="mb-3 text-[12px]">
        <span className="font-semibold">SUBSTRATE CONDITIONS ACCEPTABLE FOR APPLICATION OF AIR BARRIER:</span>{" "}
        {yn(report.substrateAcceptable)}
      </p>
      <div className="bar mb-2">Material Information</div>
      <table className="mb-3">
        <thead>
          <tr>
            <th>PROJECT MATERIALS</th>
            <th>MANUFACTURER NAME</th>
            <th>PRODUCT NAME</th>
            <th>BATCH#</th>
          </tr>
        </thead>
        <tbody>
          {report.materials.map((m) => (
            <tr key={m.role}>
              <td>{m.role}</td>
              <td>{m.mfr}</td>
              <td>{m.product}</td>
              <td>{m.batch}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-1 text-[12px]">
        ARE ALL MATERIALS BEING INSTALLED LISTED IN PROJECT SPECIFICATION? {yn(report.materialsInSpec)}
      </p>
      <p className="mb-1 text-[12px]">
        IF NO, HAVE ALL MATERIALS BEEN APPROVED FOR USE BY OWNER OR ARCHITECT? {yn(report.materialsApproved)}
      </p>
      <p className="mb-1 text-[12px]">
        ARE ALL MATERIALS BEING INSTALLED PER MANUFACTURER SPECIFICATION? {yn(report.installedPerMfr)}
      </p>
      <p className="mb-3 text-[12px]">
        ARE ALL MATERIALS BEING INSTALLED COMPATIBLE (PHYSICAL & CHEMICAL) WITH EACH OTHER PER MANUFACTURER?{" "}
        {yn(report.compatible)}
      </p>
      <p className="mb-1 text-[11px] font-semibold">ADDITIONAL INSTALLERS (LEVEL 1)</p>
      <table>
        <thead>
          <tr>
            <th>INSTALLER NAME</th>
            <th>CERTIFICATION LEVEL (1, 2, 3)</th>
            <th>CERTIFICATION #</th>
            <th>EXPIRATION DATE</th>
          </tr>
        </thead>
        <tbody>
          {report.additionalInstallers.map((i) => (
            <tr key={i.name}>
              <td>{i.name}</td>
              <td>{i.level}</td>
              <td>{i.cert}</td>
              <td>{i.exp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-[9px] text-muted">
        Date of Issue: 08/24/2015 · F-115-041 Rev 3 ABAA Daily Job Site Report - FL · Page 1 of 3
      </p>
    </section>
  );
}

function LocCell({
  label,
  loc,
}: {
  label: string;
  loc: Report["loc1"];
}) {
  return (
    <td>
      <p className="font-semibold">{label}</p>
      <p>
        Time Started: {loc.timeStart || "——"} &nbsp; Time Completed: {loc.timeEnd || "——"}
      </p>
      <p>On Gridline: {loc.onGrid}</p>
      <p>
        Between Gridline: {loc.betweenFrom} to {loc.betweenTo}
      </p>
      <p>
        Between Elevation: {loc.elevFrom} to {loc.elevTo}
      </p>
      <p>
        Wall location: <Box on={loc.wall === "N"} /> NORTH <Box on={loc.wall === "S"} /> SOUTH{" "}
        <Box on={loc.wall === "E"} /> EAST <Box on={loc.wall === "W"} /> WEST
      </p>
    </td>
  );
}

function Page2({ report }: { report: Report }) {
  return (
    <section className="print-page relative rounded-sm border border-line bg-white p-5 shadow-sm">
      {report.sample ? <Watermark /> : null}
      <div className="bar mb-2">Installation & Testing Location</div>
      <table className="mb-3">
        <tbody>
          <tr>
            <LocCell label="# 1" loc={report.loc1} />
            <LocCell label="# 2" loc={report.loc2} />
          </tr>
        </tbody>
      </table>
      <div className="bar mb-2">Testing Results</div>
      <p className="mb-2 text-[12px]">
        VISUAL INSPECTION COMPLETED AT: <Box on={report.visualAt1} /> LOCATION 1 <Box on={report.visualAt2} /> LOCATION
        2
      </p>
      <div className="box mb-3 p-2">
        <p className="mb-1 text-center text-[11px] font-bold">VISUAL INSPECTION OF FLUID MEMBRANES</p>
        <p className="text-[11px] leading-6">
          {FLUID_DEFECTS.map((d) => (
            <span key={d} className="mr-3 inline-block">
              <Box on={report.fluidDefects.includes(d)} /> {FLUID_PRINT[d]}
            </span>
          ))}
          {report.fluidClean ? <span className="ml-2 font-semibold">CLEAN</span> : null}
        </p>
      </div>
      <div className="box mb-3 p-2">
        <p className="mb-1 text-center text-[11px] font-bold">VISUAL INSPECTION OF TRANSITION MATERIALS</p>
        <p className="text-[11px] leading-6">
          {TRANS_DEFECTS.map((d) => (
            <span key={d} className="mr-3 inline-block">
              <Box on={report.transDefects.includes(d)} /> {TRANS_PRINT[d]}
            </span>
          ))}
          {report.transClean ? <span className="ml-2 font-semibold">CLEAN</span> : null}
        </p>
      </div>
      <p className="mb-1 text-[12px]">
        # OF DEFICIENCIES NOTED: {report.defNoted || "______"} &nbsp;&nbsp; # OF DEFICIENCIES CORRECTED:{" "}
        {report.defCorrected || "______"}
      </p>
      <p className="mb-3 min-h-10 text-[12px]">
        DESCRIBE DEFICIENCIES & CORRECTIVE ACTION TAKEN: {report.defDescribe}
      </p>
      <p className="mb-1 text-[11px] font-bold">LIQUID APPLIED MEMBRANES:</p>
      <p className="mb-1 text-[12px]">
        PROJECT SPECIFIED WET MIL THICKNESS: {report.projectWetMils} &nbsp; PROJECT SPECIFIED DRY MIL THICKNESS:{" "}
        {report.projectDryMils}
      </p>
      <p className="mb-1 text-[12px]">
        MANUFACTURER’S SPECIFIED WET MIL THICKNESS: {report.mfrWetMils} &nbsp; MANUFACTURER’S SPECIFIED DRY MIL
        THICKNESS: {report.mfrDryMils}
      </p>
      <p className="mb-2 text-[12px]">
        THICKNESS TESTING COMPLETED AT: <Box on={report.thicknessAt1} /> LOCATION 1 <Box on={report.thicknessAt2} />{" "}
        LOCATION 2
      </p>
      <p className="mb-1 text-[11px] font-bold">WET RESULTS WITH WET MIL GAUGE:</p>
      <table className="mb-3">
        <tbody>
          {[0, 1].map((row) => (
            <tr key={row}>
              {report.milTests.slice(row * 6, row * 6 + 6).map((m, i) => (
                <td key={i}>
                  <p className="font-semibold">TEST {row * 6 + i + 1}:</p>
                  <p>{m.reading || " "}</p>
                  <p className="text-[10px]">LOCATION: {m.location}</p>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="min-h-8 text-[12px]">DESCRIBE DEFICIENCIES & CORRECTIVE ACTION TAKEN: {report.milDefDescribe}</p>
      <p className="mt-4 text-[9px] text-muted">
        Date of Issue: 08/24/2015 · F-115-041 Rev 3 ABAA Daily Job Site Report - FL · Page 2 of 3
      </p>
    </section>
  );
}

function Page3({ report }: { report: Report }) {
  return (
    <section className="print-page relative rounded-sm border border-line bg-white p-5 shadow-sm">
      {report.sample ? <Watermark /> : null}
      <p className="mb-1 text-[12px] font-bold underline">ADHESION TESTING:</p>
      <p className="mb-1 text-[12px]">
        IS ALL REQUIRED TESTING EQUIPMENT ON-SITE? {yn(report.testingEquipOnSite)}
      </p>
      <p className="mb-1 text-[12px]">
        ADHESION TESTER ON-SITE: {yn(report.testerOnSite)} &nbsp; TEST DISCS ON-SITE: {yn(report.discsOnSite)}
      </p>
      <p className="mb-2 text-[12px]">
        SIZE OF DISK: {report.diskSize} (MINIMUM SIZE: 2.25" DIA., MAXIMUM 4" DIA.)
      </p>
      <p className="mb-2 text-[12px]">
        ADHESION TESTING COMPLETED AT: <Box on={report.adhesionAt1} /> LOCATION 1 <Box on={report.adhesionAt2} />{" "}
        LOCATION 2
      </p>
      <p className="mb-2 text-[11px]">
        INDICATE BOND STRENGTH RESULT FOR EACH TEST (GAUGE READING) AND INDICATE: IF PAD RELEASED FROM MATERIAL (PM),
        OR IF THE MATERIAL RELEASED FROM SUBSTRATE (MS) OR IF SUBSTRATE SEPARATION (SS) OCCURRED.
      </p>
      <table className="mb-2">
        <thead>
          <tr>
            {report.adhesionTests.map((_, i) => (
              <th key={i}>DISK {i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {report.adhesionTests.map((a, i) => (
              <td key={i}>
                <p>{a.gauge}</p>
                <p className="text-[10px]">LOCATION: {a.location}</p>
                <p className="text-[10px]">{a.mode}</p>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mb-3 text-[11px]">
        *IF TESTING WAS NOT COMPLETED, YOU MUST INDICATE WHY. {report.adhesionWhyNot}
      </p>
      <p className="mb-1 text-[12px] font-semibold">COMMENTS:</p>
      <p className="mb-4 min-h-16 text-[12px]">{composedComments(report)}</p>
      <p className="mb-1 text-[12px] font-semibold">
        DAILY JOB SITE REPORTS LEFT WITH GENERAL CONTRACTOR / OWNER’S REPRESENTATIVE*? {yn(report.leftWithGc)}
      </p>
      <p className="mb-1 text-[10px] italic">*MANDATORY REQUIREMENT PER ABAA QUALITY ASSURANCE PROGRAM.</p>
      <p className="mb-8 min-h-10 text-[12px]">IF NO, WHY? {report.leftWithGcWhy}</p>
      <div className="mt-8 grid grid-cols-3 items-end gap-4">
        <div>
          <p className="min-h-10 border-b border-ink">{report.signatureDate}</p>
          <p className="mt-1 text-[10px] uppercase">Date</p>
        </div>
        <div>
          {report.signatureDataUrl ? (
            <img src={report.signatureDataUrl} alt="Level 3 signature" className="h-14 object-contain" />
          ) : (
            <p className="min-h-10 border-b border-ink" />
          )}
          <p className="mt-1 text-[10px] uppercase">Level 2/3 Certified Installer Signature</p>
          <p className="text-[10px]">Clay Butner — do not sign as Clay unless you are Clay</p>
        </div>
        <div>
          <p className="min-h-10 border-b border-ink text-right font-mono text-lg">{report.certNumber}</p>
          <p className="mt-1 text-[10px] uppercase">Certification #</p>
        </div>
      </div>
      <p className="mt-6 text-[9px] text-muted">
        Date of Issue: 08/24/2015 · F-115-041 Rev 3 ABAA Daily Job Site Report - FL · Page 3 of 3
      </p>
    </section>
  );
}

function PhotoPages({ report }: { report: Report }) {
  const chunks: (typeof report.photos)[] = [];
  for (let i = 0; i < report.photos.length; i += 4) chunks.push(report.photos.slice(i, i + 4));
  return (
    <>
      {chunks.map((group, gi) => (
        <section key={gi} className="print-page rounded-sm border border-line bg-white p-5 shadow-sm">
          <div className="bar mb-3">Photo Appendix — Virginia Home ABAA Daily</div>
          <p className="mb-3 text-[11px]">
            {report.date} · Report #{report.jobSiteReportNo} · {report.filledBy}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {group.map((p) => (
              <figure key={p.id} className="box p-2">
                <img src={p.dataUrl} alt={p.caption} className="mb-1 max-h-56 w-full object-contain" />
                <figcaption className="text-[11px]">
                  <span className="font-semibold uppercase">{p.kind}</span>
                  {p.caption ? ` — ${p.caption}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Watermark() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <p className="rotate-[-28deg] text-6xl font-bold tracking-widest text-bad/15">SAMPLE</p>
    </div>
  );
}
