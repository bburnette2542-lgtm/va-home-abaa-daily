import { FilePlus, Inbox, Printer, Trash2, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AbaaMark } from "@/components/abaa-mark";
import { Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import { completeness, type Report } from "@/lib/report";
import { reportStatus, useAppStore } from "@/lib/store";
import { buildTestDaily } from "@/lib/test-daily";
import { formatDisplayDate, todayISO } from "@/lib/utils";

export function HomeScreen() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const reports = useAppStore((s) => s.reports);
  const create = useAppStore((s) => s.create);
  const remove = useAppStore((s) => s.remove);
  const importOne = useAppStore((s) => s.importOne);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const todayDraft = useMemo(
    () => reports.find((r) => r.date === today),
    [reports, today],
  );

  function startNew() {
    const id = create();
    void navigate({ to: "/daily/$id", params: { id } });
  }

  function loadTest() {
    const report = buildTestDaily(reports.length);
    const id = importOne(report);
    toast.success(t(lang, "loadTestHint"));
    void navigate({ to: "/print/$id", params: { id } });
  }

  function onImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Report;
        if (!parsed || typeof parsed !== "object") throw new Error("bad");
        const id = importOne(parsed);
        toast.success("Imported");
        void navigate({ to: "/daily/$id", params: { id } });
      } catch {
        toast.error("Could not import that file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex min-h-dvh bg-paper">
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <header className="border-b border-line px-5 pb-5 pt-8">
          <div className="mb-4 flex items-start justify-between gap-3">
            <AbaaMark className="h-12 w-[200px]" />
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-3 text-xs font-medium"
              onClick={() => setLang(lang === "en" ? "es" : "en")}
            >
              {lang === "en" ? "ES" : "EN"}
            </button>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            James River Exteriors
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-navy">
            {t(lang, "app")}
          </h1>
          <p className="mt-1 text-sm text-muted">Virginia Home 725-011 · Fluid applied air barrier</p>
          <p className="mt-2 text-sm text-ink">{t(lang, "officeTo")}</p>
        </header>

        <div className="bg-ok px-5 py-2.5 text-sm font-medium text-ok-fg">{t(lang, "liveBanner")}</div>

        <main className="flex flex-1 flex-col gap-4 px-5 py-5">
          {todayDraft ? (
            <Link
              to="/daily/$id"
              params={{ id: todayDraft.id }}
              className="flex min-h-16 items-center justify-center rounded-lg bg-navy px-4 text-base font-medium text-paper"
            >
              {t(lang, "continueDraft")} · {formatDisplayDate(todayDraft.date)}
            </Link>
          ) : (
            <Button className="min-h-16 text-base" onClick={startNew}>
              <FilePlus className="size-5" />
              {t(lang, "startToday")}
            </Button>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={loadTest}>
              {t(lang, "loadTest")}
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {t(lang, "import")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
          </div>

          <Link
            to="/office"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-paper-2 px-4 text-sm font-medium text-navy"
          >
            <Inbox className="size-4" />
            {t(lang, "office")}
            {reports.filter((r) => r.submittedAt).length
              ? ` · ${reports.filter((r) => r.submittedAt).length}`
              : ""}
          </Link>

          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t(lang, "saved")}</h2>
            {reports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
                {t(lang, "noneYet")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {reports.map((r) => (
                  <DailyRow
                    key={r.id}
                    report={r}
                    lang={lang}
                    onDelete={() => {
                      if (confirm("Delete this daily?")) remove(r.id);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>

      <aside className="hidden w-96 shrink-0 flex-col gap-4 border-l border-line bg-paper-2 px-8 py-10 lg:flex">
        <h2 className="font-display text-xl font-semibold text-navy">How this works</h2>
        <ol className="flex flex-col gap-3 text-sm text-ink">
          <li>
            <span className="font-medium">1. Field</span> — crew answers in English or Spanish, adds photos, Clay
            signs.
          </li>
          <li>
            <span className="font-medium">2. Form</span> — answers land on the official 3-page ABAA daily (F-115-041).
          </li>
          <li>
            <span className="font-medium">3. Office</span> — Email Bernie Burnette at bernie@jamesriverexteriors.com.
            Print the official form and leave the paper with Gilbane.
          </li>
        </ol>
        <p className="text-xs text-muted">
          Pre-filled: Virginia Home, JRE license 306906, Clay Butner L3, Masterwall Rollershield + Superior Flash,
          Densglass / Glassroc.
        </p>
      </aside>
    </div>
  );
}

function DailyRow({
  report,
  lang,
  onDelete,
}: {
  report: Report;
  lang: "en" | "es";
  onDelete: () => void;
}) {
  const status = reportStatus(report);
  const c = completeness(report);
  const label =
    status === "submitted"
      ? t(lang, "submitted")
      : status === "signed"
        ? t(lang, "signed")
        : status === "ready"
          ? t(lang, "ready")
          : t(lang, "draft");
  return (
    <Card className="flex items-center gap-3 p-3">
      <Link to="/daily/$id" params={{ id: report.id }} className="min-w-0 flex-1">
        <p className="font-medium text-ink">
          {formatDisplayDate(report.date)}
          {report.sample ? " · SAMPLE" : ""}
        </p>
        <p className="truncate text-xs text-muted">
          {label} · {c.pct}% · {report.filledBy || "—"} · #{report.jobSiteReportNo}
        </p>
      </Link>
      <Link
        to="/print/$id"
        params={{ id: report.id }}
        className="flex size-11 items-center justify-center rounded-md text-navy"
        aria-label={t(lang, "print")}
      >
        <Printer className="size-4" />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="flex size-11 items-center justify-center rounded-md text-bad"
        aria-label={t(lang, "delete")}
      >
        <Trash2 className="size-4" />
      </button>
    </Card>
  );
}
