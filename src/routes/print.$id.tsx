import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Printer, Share2, Download, Send } from "lucide-react";
import { toast } from "sonner";
import { BootScreen } from "@/components/daily/boot";
import { OfficialForm } from "@/components/daily/official-form";
import { Button } from "@/components/ui";
import { completeness } from "@/lib/report";
import { downloadJson, emailBernie, shareWithOffice } from "@/lib/share";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/print/$id")({ component: PrintPage });

function PrintPage() {
  const { id } = Route.useParams();
  const lang = useAppStore((s) => s.lang);
  const report = useAppStore((s) => s.reports.find((r) => r.id === id));
  const submit = useAppStore((s) => s.submit);
  const hydrated = useHydrated();
  const navigate = useNavigate();

  if (!hydrated) return <BootScreen />;
  if (!report) {
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
  const gaps = completeness(daily).blocking;

  async function onShare() {
    const result = await shareWithOffice(daily);
    if (result === "shared") toast.success(t(lang, "shared"));
    if (result === "email") toast.success(t(lang, "submit"));
  }

  function onSubmit() {
    if (gaps.length && !window.confirm(t(lang, "submitAnyway"))) return;
    submit(daily.id);
    emailBernie(daily);
    toast.success(t(lang, "received"));
    void navigate({ to: "/office/$id", params: { id: daily.id } });
  }

  return (
    <div className="min-h-dvh bg-paper-2">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <Link
            to="/daily/$id"
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
          <Button type="button" variant="secondary" onClick={() => void onShare()}>
            <Share2 className="size-4" />
            {t(lang, "share")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t(lang, "print")}
          </Button>
          {daily.submittedAt ? (
            <Link
              to="/office/$id"
              params={{ id: daily.id }}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-ok px-4 text-sm font-medium text-ok-fg"
            >
              {t(lang, "alreadyIn")}
            </Link>
          ) : (
            <Button type="button" variant="ok" onClick={onSubmit}>
              <Send className="size-4" />
              {t(lang, "submit")}
            </Button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-muted">{t(lang, "formNote")}</p>
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
      </div>
      <div className="px-3 py-6">
        <OfficialForm report={daily} />
      </div>
    </div>
  );
}
