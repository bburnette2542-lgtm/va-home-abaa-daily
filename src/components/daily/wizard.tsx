import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AbaaMark } from "@/components/abaa-mark";
import { StepBody, STEPS } from "@/components/daily/steps";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { completeness } from "@/lib/report";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DailyWizard({ id }: { id: string }) {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const report = useAppStore((s) => s.reports.find((r) => r.id === id));
  const update = useAppStore((s) => s.update);
  const [step, setStep] = useState(0);

  const stats = useMemo(() => (report ? completeness(report) : null), [report]);

  if (!report) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-ink">Daily not found.</p>
        <Link to="/" className="text-navy underline">
          Home
        </Link>
      </main>
    );
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-paper">
      {report.sample ? (
        <div className="bg-warn px-4 py-2 text-center text-xs font-medium text-paper">{t(lang, "sampleBanner")}</div>
      ) : null}
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex size-11 items-center justify-center rounded-md text-navy">
            <ChevronLeft className="size-5" />
          </Link>
          <AbaaMark className="h-9 w-auto flex-1" />
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-3 text-xs font-medium"
            onClick={() => update(id, { sample: !report.sample })}
          >
            {report.sample ? "SAMPLE" : "LIVE"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-3 text-xs font-medium"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
          >
            {lang === "en" ? "ES" : "EN"}
          </button>
        </div>
        <div className="mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={t(lang, s.key)}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-navy" : "bg-line",
              )}
            />
          ))}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="font-display text-lg font-semibold text-navy">{t(lang, STEPS[step].key)}</h1>
          <span className="text-xs tabular-nums text-muted">
            {stats?.pct ?? 0}% {t(lang, "ofComplete")}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-36">
        <StepBody
          step={step}
          lang={lang}
          report={report}
          patch={(p) => update(id, p)}
        />
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="size-4" />
            {t(lang, "back")}
          </Button>
          {last ? (
            <Link
              to="/print/$id"
              params={{ id }}
              className="inline-flex flex-[2] min-h-12 items-center justify-center rounded-md bg-navy px-4 text-sm font-medium text-paper"
            >
              {t(lang, "review")}
            </Link>
          ) : (
            <Button type="button" className="flex-[2]" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              {t(lang, "next")}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
