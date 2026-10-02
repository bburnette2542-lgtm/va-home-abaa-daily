import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { BootScreen } from "@/components/daily/boot";
import { OfficialForm } from "@/components/daily/official-form";
import { Button } from "@/components/ui";
import { listOfficeRangeFn } from "@/lib/dailies.functions";
import { t } from "@/lib/i18n";
import type { Report } from "@/lib/report";
import { useAppStore } from "@/lib/store";
import { isOfficeLoginError } from "@/lib/use-remote-daily";

export const Route = createFileRoute("/print/range")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" ? s.from : "",
    to: typeof s.to === "string" ? s.to : "",
  }),
  component: PrintRangePage,
});

function PrintRangePage() {
  const { from, to } = Route.useSearch();
  const lang = useAppStore((s) => s.lang);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [needOffice, setNeedOffice] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listOfficeRangeFn({ data: { from, to } })
      .then((rows) => {
        if (!cancelled) setReports(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isOfficeLoginError(err)) setNeedOffice(true);
        else setError(err instanceof Error ? err.message : "Could not load dailies.");
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  if (needOffice) {
    const next = `/print/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return (
      <main className="min-h-dvh bg-paper p-8 text-center text-ink">
        <p className="mb-3">Open the office page first, then come back to print.</p>
        <Link to="/office" search={{ next }} className="text-navy underline">
          {t(lang, "office")}
        </Link>
      </main>
    );
  }

  if (!reports && !error) return <BootScreen />;

  return (
    <div className="min-h-dvh bg-paper-2">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <Link to="/office" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-navy">
            {t(lang, "back")}
          </Link>
          <p className="flex-1 font-display text-lg font-semibold text-navy">
            {t(lang, "official")}
            {from || to ? ` · ${from || "…"} – ${to || "…"}` : ""}
          </p>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t(lang, "print")}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-muted">
          Use the browser Print dialog and choose Save as PDF. Each daily is the official 3-page form.
        </p>
      </div>
      <div className="px-3 py-6">
        {error ? <p className="text-center text-sm text-bad">{error}</p> : null}
        {reports?.length === 0 ? (
          <p className="text-center text-sm text-muted">{t(lang, "officeEmpty")}</p>
        ) : (
          reports?.map((report) => (
            <div key={report.id} className="mb-10">
              <OfficialForm report={report} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
