import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { BootScreen } from "@/components/daily/boot";
import { Button, Card, Field, Input } from "@/components/ui";
import { listOfficeDailiesFn, voidOfficeDailyFn } from "@/lib/dailies.functions";
import { statusLabel, type DailySummary } from "@/lib/dailies";
import { t } from "@/lib/i18n";
import type { OfficeStatus } from "@/lib/report";
import { OFFICE } from "@/lib/share";
import { useAppStore } from "@/lib/store";
import { formatDisplayDate } from "@/lib/utils";

export const Route = createFileRoute("/office/")({ component: OfficeInbox });

const STATUSES: { id: "" | OfficeStatus; key: "allStatuses" | "statusDraft" | "statusWaiting" | "statusSigned" | "statusFiled" }[] = [
  { id: "", key: "allStatuses" },
  { id: "draft", key: "statusDraft" },
  { id: "waiting_signature", key: "statusWaiting" },
  { id: "signed", key: "statusSigned" },
  { id: "filed", key: "statusFiled" },
];

function OfficeInbox() {
  const lang = useAppStore((s) => s.lang);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<DailySummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState("");

  async function search(nextFrom = from, nextTo = to, nextStatus = status) {
    setBusy(true);
    setError("");
    try {
      const list = await listOfficeDailiesFn({
        data: { from: nextFrom, to: nextTo, status: nextStatus },
      });
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dailies.");
    } finally {
      setBusy(false);
    }
  }

  async function onVoid(row: DailySummary) {
    const ok = window.confirm(`${t(lang, "voidConfirm")}\n${row.date} #${row.jobSiteReportNo} (${row.id})`);
    if (!ok) return;
    setVoiding(row.id);
    setError("");
    try {
      await voidOfficeDailyFn({ data: { id: row.id } });
      setRows((current) => (current ?? []).filter((item) => item.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not void that daily.");
    } finally {
      setVoiding("");
    }
  }

  useEffect(() => {
    void search("", "", "");
    // First paint: every daily on the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null && !error) return <BootScreen />;

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
        <form
          className="mt-4 grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <Field label={t(lang, "fromDate")}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t(lang, "toDate")}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label={t(lang, "statusFilter")}>
            <select
              className="min-h-12 w-full rounded-sm border border-line bg-fill px-3 text-base"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.id}>
                  {t(lang, s.key)}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" className="self-end" disabled={busy}>
            {busy ? t(lang, "sending") : t(lang, "search")}
          </Button>
        </form>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/print/range"
            search={{ from, to }}
            className="flex min-h-12 items-center justify-center rounded-md bg-navy px-4 text-sm font-medium text-paper"
          >
            {t(lang, "makePdf")}
          </Link>
          <Link
            to="/office/import"
            className="flex min-h-12 items-center justify-center rounded-md border border-line px-4 text-sm font-medium text-navy"
          >
            {t(lang, "importOffice")}
          </Link>
        </div>
      </header>
      <main className="flex flex-col gap-3 px-5 py-5">
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        {rows && rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-10 text-center text-sm text-muted">
            <Inbox className="mx-auto mb-2 size-6" />
            {t(lang, "officeEmpty")}
          </p>
        ) : (
          rows?.map((r) => (
            <Card key={r.id} className="p-4">
              <Link to="/office/$id" params={{ id: r.id }} className="block">
                <p className="font-medium text-ink">
                  {formatDisplayDate(r.date)} · #{r.jobSiteReportNo}
                  {r.sample ? " · SAMPLE" : ""}
                </p>
                <p className="text-xs text-muted">
                  {statusLabel(r.status)} · {r.filledBy || "—"} · {r.photoCount} photos
                  {r.waivedCount ? ` · ${r.waivedCount} waived` : ""}
                  {r.signed ? " · signed PDF" : ""}
                </p>
              </Link>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link to="/daily/$id" params={{ id: r.id }} className="font-medium text-navy">
                  Form
                </Link>
                <Link to="/print/$id" params={{ id: r.id }} className="font-medium text-navy">
                  {t(lang, "print")}
                </Link>
                <button
                  type="button"
                  className="font-medium text-bad"
                  disabled={voiding === r.id}
                  onClick={() => void onVoid(r)}
                >
                  {voiding === r.id ? t(lang, "sending") : t(lang, "voidDaily")}
                </button>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
