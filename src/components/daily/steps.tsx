import { useState } from "react";
import { PhotoCapture } from "@/components/daily/photos";
import { SignaturePad } from "@/components/daily/signature";
import { Button, Card, Chip, Field, Input, Textarea, YN } from "@/components/ui";
import { FLUID_LABEL, TRANS_LABEL, t } from "@/lib/i18n";
import {
  CREW_NAMES,
  FLUID_DEFECTS,
  TRANS_DEFECTS,
  type FluidDefect,
  type Lang,
  type LocationBlock,
  type Report,
  type TransDefect,
  type Wall,
} from "@/lib/report";

export const STEPS: { id: string; key: "stepWho" | "stepSite" | "stepMat" | "stepLoc" | "stepVis" | "stepMils" | "stepAdh" | "stepPics" | "stepSign" }[] = [
  { id: "who", key: "stepWho" },
  { id: "site", key: "stepSite" },
  { id: "mat", key: "stepMat" },
  { id: "loc", key: "stepLoc" },
  { id: "vis", key: "stepVis" },
  { id: "mils", key: "stepMils" },
  { id: "adh", key: "stepAdh" },
  { id: "pics", key: "stepPics" },
  { id: "sign", key: "stepSign" },
];

export function StepBody({
  step,
  lang,
  report,
  patch,
}: {
  step: number;
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  switch (step) {
    case 0:
      return <StepWho lang={lang} report={report} patch={patch} />;
    case 1:
      return <StepSite lang={lang} report={report} patch={patch} />;
    case 2:
      return <StepMat lang={lang} report={report} patch={patch} />;
    case 3:
      return <StepLoc lang={lang} report={report} patch={patch} />;
    case 4:
      return <StepVis lang={lang} report={report} patch={patch} />;
    case 5:
      return <StepMils lang={lang} report={report} patch={patch} />;
    case 6:
      return <StepAdh lang={lang} report={report} patch={patch} />;
    case 7:
      return (
        <PhotoCapture
          lang={lang}
          photos={report.photos}
          onChange={(photos) => patch({ photos })}
        />
      );
    default:
      return <StepSign lang={lang} report={report} patch={patch} />;
  }
}

function StepWho({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  const [other, setOther] = useState("");
  function toggle(name: string) {
    const on = report.onSite.includes(name);
    patch({ onSite: on ? report.onSite.filter((n) => n !== name) : [...report.onSite, name] });
  }
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t(lang, "locked")}</p>
        <p className="font-display text-xl font-semibold text-navy">{report.projectName}</p>
        <p className="text-sm text-muted">
          {report.contractor} · ABAA {report.license}
        </p>
        <p className="mt-1 text-sm text-ink">Clay Butner L3 #306906 exp 12/31/26</p>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t(lang, "crewNo")}>
          <Input value={report.crewNumber} inputMode="numeric" onChange={(e) => patch({ crewNumber: e.target.value })} />
        </Field>
        <Field label={t(lang, "of")}>
          <Input value={report.crewOf} inputMode="numeric" onChange={(e) => patch({ crewOf: e.target.value })} />
        </Field>
        <Field label={t(lang, "jsr")}>
          <Input value={report.jobSiteReportNo} inputMode="numeric" onChange={(e) => patch({ jobSiteReportNo: e.target.value })} />
        </Field>
      </div>
      <Field label={t(lang, "date")}>
        <Input type="date" value={report.date} onChange={(e) => patch({ date: e.target.value })} />
      </Field>
      <Field label={t(lang, "filledBy")} hint={t(lang, "yourName")}>
        <div className="flex flex-wrap gap-2">
          {CREW_NAMES.map((n) => (
            <Chip key={n} selected={report.filledBy === n} onClick={() => patch({ filledBy: n })}>
              {n}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label={t(lang, "onSite")} hint={t(lang, "tapAll")}>
        <div className="flex flex-wrap gap-2">
          {CREW_NAMES.map((n) => (
            <Chip key={n} selected={report.onSite.includes(n)} onClick={() => toggle(n)}>
              {n}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={other}
            placeholder={t(lang, "otherName")}
            onChange={(e) => setOther(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const name = other.trim();
              if (!name) return;
              if (!report.onSite.includes(name)) patch({ onSite: [...report.onSite, name] });
              setOther("");
            }}
          >
            {t(lang, "add")}
          </Button>
        </div>
      </Field>
    </div>
  );
}

function StepSite({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={t(lang, "subType")}>
        <Input value={report.substrateType} onChange={(e) => patch({ substrateType: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t(lang, "subTemp")} hint={t(lang, "tempHint")}>
          <Input
            inputMode="decimal"
            value={report.substrateTemp}
            onChange={(e) => patch({ substrateTemp: e.target.value })}
          />
        </Field>
        <Field label={t(lang, "ambTemp")}>
          <Input
            inputMode="decimal"
            value={report.ambientTemp}
            onChange={(e) => patch({ ambientTemp: e.target.value })}
          />
        </Field>
        <Field label={t(lang, "moisture")}>
          <Input value={report.substrateMoisture} onChange={(e) => patch({ substrateMoisture: e.target.value })} />
        </Field>
        <Field label={t(lang, "rh")}>
          <Input inputMode="decimal" value={report.rh} onChange={(e) => patch({ rh: e.target.value })} />
        </Field>
      </div>
      <Field label={t(lang, "prep")} hint={t(lang, "prepHint")}>
        <Textarea value={report.surfacePrep} onChange={(e) => patch({ surfacePrep: e.target.value })} />
      </Field>
      <Field label={t(lang, "accept")}>
        <YN
          value={report.substrateAcceptable}
          onChange={(v) => patch({ substrateAcceptable: v })}
          yes={t(lang, "yes")}
          no={t(lang, "no")}
        />
      </Field>
    </div>
  );
}

function StepMat({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  const mats = report.materials;
  function setBatch(i: number, batch: string) {
    patch({ materials: mats.map((m, idx) => (idx === i ? { ...m, batch } : m)) });
  }
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-sm font-medium text-ink">Masterwall Rollershield on Densglass / Glassroc</p>
        <p className="text-xs text-muted">15 mil wet → 10 mil dry · Superior Flash 12–15 mils</p>
      </Card>
      <Field label={t(lang, "batchRS")} hint={t(lang, "batchHint")}>
        <Input value={mats[0]?.batch ?? ""} onChange={(e) => setBatch(0, e.target.value)} />
      </Field>
      <Field label={t(lang, "batchSF")}>
        <Input
          value={mats[2]?.batch ?? ""}
          onChange={(e) => {
            const batch = e.target.value;
            patch({
              materials: mats.map((m, idx) => (idx === 2 || idx === 5 ? { ...m, batch } : m)),
            });
          }}
        />
      </Field>
      <Field label={t(lang, "inSpec")}>
        <YN value={report.materialsInSpec} onChange={(v) => patch({ materialsInSpec: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
      {report.materialsInSpec === "N" ? (
        <Field label={t(lang, "approved")}>
          <YN value={report.materialsApproved} onChange={(v) => patch({ materialsApproved: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
        </Field>
      ) : null}
      <Field label={t(lang, "perMfr")}>
        <YN value={report.installedPerMfr} onChange={(v) => patch({ installedPerMfr: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
      <Field label={t(lang, "compat")}>
        <YN value={report.compatible} onChange={(v) => patch({ compatible: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
    </div>
  );
}

function LocCard({
  lang,
  title,
  loc,
  onChange,
}: {
  lang: Lang;
  title: string;
  loc: LocationBlock;
  onChange: (loc: LocationBlock) => void;
}) {
  const walls: { id: Wall; key: "north" | "south" | "east" | "west" }[] = [
    { id: "N", key: "north" },
    { id: "S", key: "south" },
    { id: "E", key: "east" },
    { id: "W", key: "west" },
  ];
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-medium text-navy">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t(lang, "started")}>
          <Input placeholder="7:15 AM" value={loc.timeStart} onChange={(e) => onChange({ ...loc, timeStart: e.target.value })} />
        </Field>
        <Field label={t(lang, "finished")}>
          <Input placeholder="3:30 PM" value={loc.timeEnd} onChange={(e) => onChange({ ...loc, timeEnd: e.target.value })} />
        </Field>
      </div>
      <Field label={t(lang, "onGrid")}>
        <Input value={loc.onGrid} onChange={(e) => onChange({ ...loc, onGrid: e.target.value })} />
      </Field>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label={t(lang, "betweenGrid")}>
          <Input value={loc.betweenFrom} onChange={(e) => onChange({ ...loc, betweenFrom: e.target.value })} />
        </Field>
        <span className="pb-3 text-muted">{t(lang, "to")}</span>
        <Field label=" ">
          <Input value={loc.betweenTo} onChange={(e) => onChange({ ...loc, betweenTo: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label={t(lang, "betweenElev")}>
          <Input value={loc.elevFrom} onChange={(e) => onChange({ ...loc, elevFrom: e.target.value })} />
        </Field>
        <span className="pb-3 text-muted">{t(lang, "to")}</span>
        <Field label=" ">
          <Input value={loc.elevTo} onChange={(e) => onChange({ ...loc, elevTo: e.target.value })} />
        </Field>
      </div>
      <Field label={t(lang, "wall")}>
        <div className="grid grid-cols-4 gap-2">
          {walls.map((w) => (
            <Chip key={w.id} selected={loc.wall === w.id} onClick={() => onChange({ ...loc, wall: w.id })}>
              {t(lang, w.key)}
            </Chip>
          ))}
        </div>
      </Field>
    </Card>
  );
}

function StepLoc({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <LocCard lang={lang} title={t(lang, "loc1")} loc={report.loc1} onChange={(loc1) => patch({ loc1 })} />
      <LocCard lang={lang} title={t(lang, "loc2")} loc={report.loc2} onChange={(loc2) => patch({ loc2 })} />
    </div>
  );
}

function StepVis({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  function toggleFluid(d: FluidDefect) {
    const has = report.fluidDefects.includes(d);
    patch({
      fluidClean: false,
      fluidDefects: has ? report.fluidDefects.filter((x) => x !== d) : [...report.fluidDefects, d],
    });
  }
  function toggleTrans(d: TransDefect) {
    const has = report.transDefects.includes(d);
    patch({
      transClean: false,
      transDefects: has ? report.transDefects.filter((x) => x !== d) : [...report.transDefects, d],
    });
  }
  return (
    <div className="flex flex-col gap-5">
      <Field label={t(lang, "visWhere")}>
        <div className="flex gap-2">
          <Chip selected={report.visualAt1} onClick={() => patch({ visualAt1: !report.visualAt1 })}>
            {t(lang, "loc1")}
          </Chip>
          <Chip selected={report.visualAt2} onClick={() => patch({ visualAt2: !report.visualAt2 })}>
            {t(lang, "loc2")}
          </Chip>
        </div>
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-medium text-navy">{t(lang, "fluid")}</h3>
          <Button
            type="button"
            variant={report.fluidClean ? "ok" : "secondary"}
            className="min-h-10 px-3 text-xs"
            onClick={() => patch({ fluidClean: true, fluidDefects: [] })}
          >
            {t(lang, "markClean")}
          </Button>
        </div>
        <p className="mb-2 text-xs text-muted">{t(lang, "tapDefects")}</p>
        <div className="flex flex-wrap gap-2">
          {FLUID_DEFECTS.map((d) => (
            <Chip key={d} selected={report.fluidDefects.includes(d)} onClick={() => toggleFluid(d)}>
              {FLUID_LABEL[d][lang]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-medium text-navy">{t(lang, "trans")}</h3>
          <Button
            type="button"
            variant={report.transClean ? "ok" : "secondary"}
            className="min-h-10 px-3 text-xs"
            onClick={() => patch({ transClean: true, transDefects: [] })}
          >
            {t(lang, "markClean")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRANS_DEFECTS.map((d) => (
            <Chip key={d} selected={report.transDefects.includes(d)} onClick={() => toggleTrans(d)}>
              {TRANS_LABEL[d][lang]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t(lang, "defNoted")}>
          <Input inputMode="numeric" value={report.defNoted} onChange={(e) => patch({ defNoted: e.target.value })} />
        </Field>
        <Field label={t(lang, "defCorr")}>
          <Input inputMode="numeric" value={report.defCorrected} onChange={(e) => patch({ defCorrected: e.target.value })} />
        </Field>
      </div>
      <Field label={t(lang, "defDesc")}>
        <Textarea value={report.defDescribe} onChange={(e) => patch({ defDescribe: e.target.value })} />
      </Field>
    </div>
  );
}

function StepMils({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t(lang, "milsHint")}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t(lang, "projectWet")}>
          <Input value={report.projectWetMils} onChange={(e) => patch({ projectWetMils: e.target.value })} />
        </Field>
        <Field label={t(lang, "projectDry")}>
          <Input value={report.projectDryMils} onChange={(e) => patch({ projectDryMils: e.target.value })} />
        </Field>
        <Field label={t(lang, "mfrWet")}>
          <Input value={report.mfrWetMils} onChange={(e) => patch({ mfrWetMils: e.target.value })} />
        </Field>
        <Field label={t(lang, "mfrDry")}>
          <Input value={report.mfrDryMils} onChange={(e) => patch({ mfrDryMils: e.target.value })} />
        </Field>
      </div>
      <Field label={t(lang, "visWhere")}>
        <div className="flex gap-2">
          <Chip selected={report.thicknessAt1} onClick={() => patch({ thicknessAt1: !report.thicknessAt1 })}>
            {t(lang, "loc1")}
          </Chip>
          <Chip selected={report.thicknessAt2} onClick={() => patch({ thicknessAt2: !report.thicknessAt2 })}>
            {t(lang, "loc2")}
          </Chip>
        </div>
      </Field>
      <div className="flex flex-col gap-2">
        {report.milTests.map((m, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <Input
              inputMode="decimal"
              placeholder={`${t(lang, "reading")} ${i + 1}`}
              value={m.reading}
              onChange={(e) =>
                patch({
                  milTests: report.milTests.map((x, idx) =>
                    idx === i ? { ...x, reading: e.target.value } : x,
                  ),
                })
              }
            />
            <Input
              placeholder={t(lang, "where")}
              value={m.location}
              onChange={(e) =>
                patch({
                  milTests: report.milTests.map((x, idx) =>
                    idx === i ? { ...x, location: e.target.value } : x,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>
      <Field label={t(lang, "defDesc")}>
        <Textarea value={report.milDefDescribe} onChange={(e) => patch({ milDefDescribe: e.target.value })} />
      </Field>
    </div>
  );
}

function StepAdh({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t(lang, "prefer")}</p>
      <Field label={t(lang, "equip")}>
        <YN value={report.testingEquipOnSite} onChange={(v) => patch({ testingEquipOnSite: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
      <Field label={t(lang, "tester")}>
        <YN value={report.testerOnSite} onChange={(v) => patch({ testerOnSite: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
      <Field label={t(lang, "discs")}>
        <YN value={report.discsOnSite} onChange={(v) => patch({ discsOnSite: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
      <Field label={t(lang, "diskSize")}>
        <Input value={report.diskSize} onChange={(e) => patch({ diskSize: e.target.value })} />
      </Field>
      <Field label={t(lang, "visWhere")}>
        <div className="flex gap-2">
          <Chip selected={report.adhesionAt1} onClick={() => patch({ adhesionAt1: !report.adhesionAt1 })}>
            {t(lang, "loc1")}
          </Chip>
          <Chip selected={report.adhesionAt2} onClick={() => patch({ adhesionAt2: !report.adhesionAt2 })}>
            {t(lang, "loc2")}
          </Chip>
        </div>
      </Field>
      {report.adhesionTests.map((a, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Disk {i + 1}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="decimal"
              placeholder={t(lang, "gauge")}
              value={a.gauge}
              onChange={(e) =>
                patch({
                  adhesionTests: report.adhesionTests.map((x, idx) =>
                    idx === i ? { ...x, gauge: e.target.value } : x,
                  ),
                })
              }
            />
            <Input
              placeholder={t(lang, "where")}
              value={a.location}
              onChange={(e) =>
                patch({
                  adhesionTests: report.adhesionTests.map((x, idx) =>
                    idx === i ? { ...x, location: e.target.value } : x,
                  ),
                })
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["PM", "MS", "SS"] as const).map((mode) => (
              <Chip
                key={mode}
                selected={a.mode === mode}
                onClick={() =>
                  patch({
                    adhesionTests: report.adhesionTests.map((x, idx) =>
                      idx === i ? { ...x, mode } : x,
                    ),
                  })
                }
              >
                {mode}
              </Chip>
            ))}
          </div>
        </Card>
      ))}
      <p className="text-xs text-muted">
        {t(lang, "pm")} · {t(lang, "ms")} · {t(lang, "ss")}
      </p>
      <Field label={t(lang, "whyNot")}>
        <Textarea value={report.adhesionWhyNot} onChange={(e) => patch({ adhesionWhyNot: e.target.value })} />
      </Field>
    </div>
  );
}

function StepSign({
  lang,
  report,
  patch,
}: {
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={t(lang, "gilbane")} hint={t(lang, "gilbaneHint")}>
        <YN value={report.leftWithGc} onChange={(v) => patch({ leftWithGc: v })} yes={t(lang, "yes")} no={t(lang, "no")} />
      </Field>
      {report.leftWithGc === "N" ? (
        <Field label={t(lang, "gilbaneWhy")}>
          <Textarea value={report.leftWithGcWhy} onChange={(e) => patch({ leftWithGcWhy: e.target.value })} />
        </Field>
      ) : null}
      <Field label={t(lang, "comments")}>
        <Textarea value={report.comments} onChange={(e) => patch({ comments: e.target.value })} />
      </Field>
      <Field label={t(lang, "clayReady")} hint={t(lang, "clayOnly")}>
        <YN
          value={report.clayReady}
          onChange={(v) =>
            patch({
              clayReady: v,
              signatureDate: v === "Y" ? report.date : report.signatureDate,
            })
          }
          yes={t(lang, "yes")}
          no={t(lang, "no")}
        />
      </Field>
      {report.clayReady === "Y" ? (
        <Field label={t(lang, "signHere")}>
          <SignaturePad
            lang={lang}
            value={report.signatureDataUrl}
            onChange={(signatureDataUrl) => patch({ signatureDataUrl, signatureDate: report.date })}
          />
        </Field>
      ) : (
        <p className="rounded-md border border-line bg-paper-2 px-3 py-3 text-sm text-muted">
          {t(lang, "clayOnly")}
        </p>
      )}
      <Field label={t(lang, "cert")}>
        <Input value={report.certNumber} readOnly />
      </Field>
    </div>
  );
}
