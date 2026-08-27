import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { BootScreen } from "@/components/daily/boot";
import { Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import { OFFICE } from "@/lib/share";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatDisplayDate } from "@/lib/utils";

export const Route = createFileRoute("/office/")({ component: OfficeInbox });

function OfficeInbox() {
  const lang = useAppStore((s) => s.lang);
  const reports = useAppStore((s) => s.reports);
  const submitted = reports.filter((r) => r.submittedAt);
  const hydrated = useHydrated();
  if (!hydrated) return <BootScreen />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-paper">
      <header className="border-b border-line px-5 py-5">
        <Link to="/" className="text-sm font-medium text-navy">
          {t(lang, "back")}
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold text-navy">{t(lang, "office")}</h1>
        <p className="mt-1 text-sm text-ink">
          {OFFICE.name} · {OFFICE.email}
        </p>
        <p className="mt-1 text-sm text-muted">{t(lang, "receiptNote")}</p>
      </header>
      <main className="flex flex-col gap-3 px-5 py-5">
        {submitted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-10 text-center text-sm text-muted">
            <Inbox className="mx-auto mb-2 size-6" />
            {t(lang, "officeEmpty")}
          </p>
        ) : (
          submitted.map((r) => (
            <Link key={r.id} to="/office/$id" params={{ id: r.id }}>
              <Card className="p-4">
                <p className="font-medium text-ink">
                  {formatDisplayDate(r.date)} · #{r.jobSiteReportNo}
                  {r.sample ? " · SAMPLE" : ""}
                </p>
                <p className="text-xs text-muted">
                  {r.filledBy || "—"} · {r.photos.length} photos ·{" "}
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ""}
                </p>
              </Card>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
