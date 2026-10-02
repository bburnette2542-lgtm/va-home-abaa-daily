import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Printer, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BootScreen } from "@/components/daily/boot";
import { OfficialForm } from "@/components/daily/official-form";
import { Button } from "@/components/ui";
import { completeness } from "@/lib/report";
import { isSent } from "@/lib/dailies";
import { downloadJson } from "@/lib/share";
import { t } from "@/lib/i18n";
import { pushDailyToServer } from "@/lib/send-daily";
import { useAppStore } from "@/lib/store";
import { useLocalOrOfficeDaily } from "@/lib/use-remote-daily";

export const Route = createFileRoute("/print/$id")({ component: PrintPage });

function PrintPage() {
  const { id } = Route.useParams();
  const lang = useAppStore((s) => s.lang);
  const { report, hydrated, loading, needOffice, missing, fromLocal } = useLocalOrOfficeDaily(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!hydrated || loading) return <BootScreen />;
  if (needOffice) {
    return (
      <main className="min-h-dvh bg-paper p-8 text-center text-ink">
        <p className="mb-3">Open the office page first, then come back to this print link.</p>
        <Link to="/office" search={{ next: `/print/${id}` }} className="text-navy underline">
          {t(lang, "office")}
        </Link>
      </main>
    );
  }
  if (!report || missing) {
    return (
      <main className="min-h-dvh bg-paper p-8 text-center text-ink">
        Daily not found.{" "}
        <Link to="/" className="text-navy underline">
          Home
        </Link>
      </main>
    );
  }

  const daily = report;
  const complete = completeness(daily);
  const gaps = complete.blocking;
  const sent = isSent(daily);

  async function onSubmit() {
    if (gaps.length) {
      toast.error(t(lang, "submitAnyway"));
      return;
    }
    setBusy(true);
    setError("");
    const result = await pushDailyToServer(daily);
    setBusy(false);
    if (result.ok) {
      toast.success(t(lang, "savedAndSent"));
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  return (
    <div className="min-h-dvh bg-paper-2">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <Link
            to={fromLocal ? "/daily/$id" : "/office/$id"}
            params={{ id }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-navy"
          >
            {t(lang, "back")}
          </Link>
          <p className="flex-1 font-display text-lg font-semibold text-navy">{t(lang, "official")}</p>
          <Button type="button" variant="secondary" onClick={() => downloadJson(daily)}>
            <Download className="size-4" />
            {t(lang, "export")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t(lang, "print")}
          </Button>
          {sent ? (
            <span className="inline-flex min-h-12 items-center justify-center rounded-md bg-ok px-4 text-sm font-medium text-ok-fg">
              {t(lang, "savedAndSent")}
            </span>
          ) : (
            <Button type="button" variant="ok" disabled={busy} onClick={() => void onSubmit()}>
              <Send className="size-4" />
              {busy ? t(lang, "sending") : error ? t(lang, "retry") : t(lang, "submit")}
            </Button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-muted">{t(lang, "formNote")}</p>
        {error ? (
          <p className="mx-auto mt-2 max-w-3xl text-sm text-bad">
            {t(lang, "notSent")} — {error}
          </p>
        ) : null}
        {gaps.length ? (
          <div className="mx-auto mt-3 max-w-3xl rounded-md border border-line bg-fill px-3 py-2">
            <p className="text-xs font-medium text-navy">{t(lang, "stillNeed")}</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-ink">
              {gaps.map((g) => (
                <li key={g.id}>{lang === "es" ? g.es : g.en}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {complete.warnings.length ? (
          <div className="mx-auto mt-3 max-w-3xl rounded-md border border-warn bg-fill px-3 py-2">
            <p className="text-xs font-medium text-navy">{t(lang, "outOfSpec")}</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-ink">
              {complete.warnings.map((g) => (
                <li key={g.id}>{lang === "es" ? g.es : g.en}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="px-3 py-6">
        <OfficialForm report={daily} />
      </div>
    </div>
  );
}
