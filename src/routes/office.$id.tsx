import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Mail } from "lucide-react";
import { BootScreen } from "@/components/daily/boot";
import { OfficialForm } from "@/components/daily/official-form";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { composedComments } from "@/lib/report";
import { OFFICE, downloadJson, mailtoBernieUrl } from "@/lib/share";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatDisplayDate } from "@/lib/utils";

export const Route = createFileRoute("/office/$id")({ component: OfficeReceipt });

function OfficeReceipt() {
  const { id } = Route.useParams();
  const lang = useAppStore((s) => s.lang);
  const report = useAppStore((s) => s.reports.find((r) => r.id === id));
  const hydrated = useHydrated();

  if (!hydrated) return <BootScreen />;
  if (!report) {
    return (
      <main className="min-h-dvh bg-paper p-8 text-center">
        Daily not found.{" "}
        <Link to="/office" className="text-navy underline">
          {t(lang, "office")}
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-paper-2">
      <div className="border-b border-line bg-paper px-4 py-5">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex gap-3">
            <Link to="/" className="text-sm font-medium text-navy">
              Home
            </Link>
            <Link to="/office" className="text-sm font-medium text-navy">
              {t(lang, "office")}
            </Link>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ok text-ok-fg">
              <Check className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-navy">{t(lang, "received")}</h1>
              <p className="text-sm text-ink">
                {OFFICE.name} · {OFFICE.email}
              </p>
              <p className="text-sm text-ink">
                {formatDisplayDate(report.date)} · Report #{report.jobSiteReportNo} · {report.filledBy}
              </p>
              <p className="text-xs text-muted">
                {report.submittedAt ? new Date(report.submittedAt).toLocaleString() : ""} · {report.photos.length}{" "}
                photos
              </p>
            </div>
          </div>
          {report.sample ? (
            <p className="mt-3 rounded-md bg-warn px-3 py-2 text-sm font-medium text-paper">
              {t(lang, "sampleBanner")}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted">{t(lang, "receiptNote")}</p>
          <p className="mt-2 text-sm text-ink">{composedComments(report)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={mailtoBernieUrl(report)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ok px-4 text-sm font-medium text-ok-fg"
            >
              <Mail className="size-4" />
              {t(lang, "emailAgain")}
            </a>
            <Button type="button" variant="secondary" onClick={() => downloadJson(report)}>
              {t(lang, "export")}
            </Button>
          </div>
        </div>
      </div>
      <div className="px-3 py-6">
        <OfficialForm report={report} />
      </div>
    </div>
  );
}
