import { todayISO, uid } from "./utils";

export type Lang = "en" | "es";
export type YN = "Y" | "N" | "";
export type Wall = "N" | "S" | "E" | "W" | "";
export type Bond = "PM" | "MS" | "SS" | "";

export const FLUID_DEFECTS = [
  "shadow",
  "blisters",
  "pinHoles",
  "fishEyes",
  "slump",
  "cracking",
  "texture",
  "efflorescence",
  "overlap",
  "uniformity",
] as const;
export type FluidDefect = (typeof FLUID_DEFECTS)[number];

export const TRANS_DEFECTS = [
  "laps",
  "tJoints",
  "seams",
  "wrinkles",
  "ties",
  "compat",
  "fishMouths",
  "shingled",
  "staggered",
  "mastic",
  "rolled",
  "delamination",
] as const;
export type TransDefect = (typeof TRANS_DEFECTS)[number];

export type PhotoKind =
  | "substrate"
  | "mils"
  | "adhesion"
  | "defect"
  | "location"
  | "other";

export interface Installer {
  name: string;
  level: 1 | 2 | 3;
  cert: string;
  exp: string;
}

export interface LocationBlock {
  timeStart: string;
  timeEnd: string;
  onGrid: string;
  betweenFrom: string;
  betweenTo: string;
  elevFrom: string;
  elevTo: string;
  wall: Wall;
}

export interface MilReading {
  reading: string;
  location: string;
}

export interface AdhesionReading {
  gauge: string;
  location: string;
  mode: Bond;
}

export interface Photo {
  id: string;
  dataUrl: string;
  caption: string;
  kind: PhotoKind;
}

export interface MaterialRow {
  role: string;
  mfr: string;
  product: string;
  batch: string;
}

export interface Report {
  id: string;
  createdAt: string;
  updatedAt: string;
  sample: boolean;
  crewNumber: string;
  crewOf: string;
  jobSiteReportNo: string;
  date: string;
  filledBy: string;
  onSite: string[];
  projectName: string;
  contractor: string;
  license: string;
  installers: Installer[];
  additionalInstallers: Installer[];
  substrateType: string;
  substrateTemp: string;
  ambientTemp: string;
  substrateMoisture: string;
  rh: string;
  surfacePrep: string;
  substrateAcceptable: YN;
  materials: MaterialRow[];
  materialsInSpec: YN;
  materialsApproved: YN;
  installedPerMfr: YN;
  compatible: YN;
  loc1: LocationBlock;
  loc2: LocationBlock;
  visualAt1: boolean;
  visualAt2: boolean;
  fluidDefects: FluidDefect[];
  transDefects: TransDefect[];
  fluidClean: boolean;
  transClean: boolean;
  defNoted: string;
  defCorrected: string;
  defDescribe: string;
  projectWetMils: string;
  projectDryMils: string;
  mfrWetMils: string;
  mfrDryMils: string;
  thicknessAt1: boolean;
  thicknessAt2: boolean;
  milTests: MilReading[];
  milDefDescribe: string;
  testingEquipOnSite: YN;
  testerOnSite: YN;
  discsOnSite: YN;
  diskSize: string;
  adhesionAt1: boolean;
  adhesionAt2: boolean;
  adhesionTests: AdhesionReading[];
  adhesionWhyNot: string;
  comments: string;
  leftWithGc: YN;
  leftWithGcWhy: string;
  clayReady: YN;
  signatureDataUrl: string;
  signatureDate: string;
  certNumber: string;
  photos: Photo[];
  submittedAt: string;
}

export const CERTIFIED_INSTALLERS: Installer[] = [
  { name: "Clay Butner", level: 3, cert: "306906", exp: "12/31/26" },
  { name: "Jenni Rivera", level: 1, cert: "", exp: "" },
  { name: "Jairo Rivera", level: 1, cert: "", exp: "" },
  { name: "Elias Dubon", level: 1, cert: "", exp: "" },
];

export const ADDITIONAL_INSTALLERS: Installer[] = [
  { name: "Dulvin Cael", level: 1, cert: "", exp: "" },
  { name: "Jose Mojica", level: 1, cert: "", exp: "" },
  { name: "Emil Martinez", level: 1, cert: "", exp: "" },
];

export const CREW_NAMES = [
  "Clay Butner",
  "Jenni Rivera",
  "Jairo Rivera",
  "Elias Dubon",
  "Dulvin Cael",
  "Jose Mojica",
  "Emil Martinez",
  "Mike Gladwell",
  "Arnold",
  "Ty",
  "Nabe Perdoma",
  "Brian",
] as const;

export const EMPTY_LOCATION: LocationBlock = {
  timeStart: "",
  timeEnd: "",
  onGrid: "",
  betweenFrom: "",
  betweenTo: "",
  elevFrom: "",
  elevTo: "",
  wall: "",
};

export function defaultMaterials(): MaterialRow[] {
  return [
    { role: "PRIMARY AIR BARRIER (AB)", mfr: "Masterwall", product: "Rollershield", batch: "" },
    { role: "AB PRIMER", mfr: "", product: "", batch: "" },
    { role: "TRANSITION MATERIALS (TM)", mfr: "Masterwall", product: "Superior Flash", batch: "" },
    { role: "TM PRIMER", mfr: "", product: "", batch: "" },
    { role: "MASTIC/SEALANT", mfr: "", product: "", batch: "" },
    { role: "OTHER (MESH, LIQUID FLASHING, ETC.)", mfr: "Masterwall", product: "Superior Flash", batch: "" },
  ];
}

export function newReport(existingCount: number): Report {
  const date = todayISO();
  const seq = existingCount + 1;
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sample: false,
    crewNumber: "1",
    crewOf: "1",
    jobSiteReportNo: String(seq),
    date,
    filledBy: "",
    onSite: [],
    projectName: "Virginia Home",
    contractor: "James River Exteriors",
    license: "306906",
    installers: CERTIFIED_INSTALLERS.map((i) => ({ ...i })),
    additionalInstallers: ADDITIONAL_INSTALLERS.map((i) => ({ ...i })),
    substrateType: "Densglass - Glassroc",
    substrateTemp: "",
    ambientTemp: "",
    substrateMoisture: "",
    rh: "",
    surfacePrep: "",
    substrateAcceptable: "",
    materials: defaultMaterials(),
    materialsInSpec: "N",
    materialsApproved: "Y",
    installedPerMfr: "Y",
    compatible: "Y",
    loc1: { ...EMPTY_LOCATION },
    loc2: { ...EMPTY_LOCATION },
    visualAt1: true,
    visualAt2: false,
    fluidDefects: [],
    transDefects: [],
    fluidClean: false,
    transClean: false,
    defNoted: "",
    defCorrected: "",
    defDescribe: "",
    projectWetMils: "15",
    projectDryMils: "10",
    mfrWetMils: "15",
    mfrDryMils: "10",
    thicknessAt1: true,
    thicknessAt2: false,
    milTests: Array.from({ length: 12 }, () => ({ reading: "", location: "" })),
    milDefDescribe: "",
    testingEquipOnSite: "Y",
    testerOnSite: "Y",
    discsOnSite: "Y",
    diskSize: "3",
    adhesionAt1: true,
    adhesionAt2: false,
    adhesionTests: Array.from({ length: 6 }, () => ({
      gauge: "",
      location: "",
      mode: "",
    })),
    adhesionWhyNot: "",
    comments: "",
    leftWithGc: "",
    leftWithGcWhy: "",
    clayReady: "",
    signatureDataUrl: "",
    signatureDate: "",
    certNumber: "306906",
    photos: [],
    submittedAt: "",
  };
}

export interface Gap {
  id: string;
  en: string;
  es: string;
  blocking: boolean;
}

export function reportGaps(r: Report): Gap[] {
  const gaps: Gap[] = [];
  const add = (id: string, en: string, es: string, blocking = true) => {
    gaps.push({ id, en, es, blocking });
  };

  if (!r.filledBy) add("filledBy", "Who filled this sheet", "Quien llena esta hoja");
  if (!r.onSite.length) add("onSite", "Who is on site today", "Quien esta en la obra hoy");
  if (!r.substrateTemp) add("subTemp", "Substrate temperature", "Temperatura del sustrato");
  if (!r.ambientTemp) add("ambTemp", "Ambient temperature", "Temperatura ambiente");
  if (!r.surfacePrep) add("prep", "Substrate surface condition and prep", "Condicion y preparacion de la superficie");
  if (!r.substrateAcceptable) add("accept", "Substrate acceptable for air barrier?", "Sustrato aceptable para la barrera de aire?");
  if (!r.materials[0]?.batch) add("rsBatch", "Rollershield batch / pail QR", "Lote o QR del balde Rollershield");
  if (!r.materials[2]?.batch) add("sfBatch", "Superior Flash batch / pail QR", "Lote o QR del balde Superior Flash");
  if (!r.loc1.timeStart) add("tStart", "Location 1 start time", "Ubicacion 1 hora de inicio");
  if (!r.loc1.timeEnd) add("tEnd", "Location 1 finish time", "Ubicacion 1 hora de fin");
  if (!r.loc1.wall) add("wall", "Location 1 wall (N/S/E/W)", "Ubicacion 1 muro (N/S/E/O)");
  if (!r.fluidClean && r.fluidDefects.length === 0) {
    add("fluidVis", "Mark fluid membrane CLEAN or list defects", "Marque la membrana LIMPIO o liste defectos");
  }
  if (!r.transClean && r.transDefects.length === 0) {
    add("transVis", "Mark transitions CLEAN or list defects", "Marque transiciones LIMPIO o liste defectos");
  }
  const milsFilled = r.milTests.filter((m) => m.reading.trim()).length;
  if (milsFilled === 0) add("mils", "At least one wet mil reading", "Al menos una lectura de mils humedos");
  const adhFilled = r.adhesionTests.filter((a) => a.gauge.trim()).length;
  if (adhFilled === 0 && !r.adhesionWhyNot) {
    add("adh", "Adhesion results, or why not tested", "Resultados de adhesion, o por que no se probo");
  }
  if (!r.leftWithGc) add("gc", "Daily left with Gilbane / owner rep?", "Se dejo el reporte con Gilbane?");
  if (r.leftWithGc === "N" && !r.leftWithGcWhy) {
    add("gcWhy", "If not left with Gilbane, why", "Si no se dejo con Gilbane, por que");
  }
  if (r.clayReady !== "Y") add("clay", "Clay ready to sign", "Clay listo para firmar");
  if (!r.signatureDataUrl) add("sig", "Clay's Level 3 signature", "Firma Nivel 3 de Clay");
  if (r.photos.length === 0) {
    add("photos", "Add photos (substrate, mils, adhesion)", "Agregue fotos (sustrato, mils, adhesion)", false);
  }
  return gaps;
}

export function completeness(r: Report) {
  const gaps = reportGaps(r);
  const blocking = gaps.filter((g) => g.blocking);
  const required = 18;
  const missing = blocking.length;
  const done = Math.max(0, required - missing);
  return {
    gaps,
    blocking,
    pct: Math.round((done / required) * 100),
    ready: blocking.length === 0,
  };
}

export function onSiteLine(r: Report) {
  return r.onSite.length ? `On site: ${r.onSite.join(", ")}.` : "";
}

export function composedComments(r: Report) {
  const extra = onSiteLine(r);
  const filled = r.filledBy ? `Filled by ${r.filledBy}.` : "";
  const bits = [filled, extra, r.comments].filter(Boolean);
  return bits.join(" ");
}
