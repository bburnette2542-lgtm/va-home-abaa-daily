import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BootScreen } from "@/components/daily/boot";
import { OfficialForm } from "@/components/daily/official-form";
import { Button } from "@/components/ui";
import { officeReceiptNoteKey, statusLabel, workflowStatus } from "@/lib/dailies";
import { markFiledFn, uploadSignedPdfFn } from "@/lib/dailies.functions";
import { t } from "@/lib/i18n";
import { composedComments } from "@/lib/report";
import { OFFICE, downloadJson } from "@/lib/share";
import { useAppStore } from "@/lib/store";
import { useLocalOrOfficeDaily } from "@/lib/use-remote-daily";
import { formatDisplayDate } from "@/lib/utils";

export const Route = createFileRoute("/office/$id")({ component: OfficeReceipt });

function readFileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const comma = text.indexOf(",");
      resolve(comma >= 0 ? text.slice(comma + 1) : text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function OfficeReceipt() {
  const { id } = Route.useParams();
  const lang = useAppStore((s) => s.lang);
  const { report, hydrated, loading, needOffice, missing } = useLocalOrOfficeDaily(id);
  const [status, setStatus] = useState<string>("");
  const [signedName, setSignedName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!hydrated || loading) return <BootScreen />;
  if (needOffice) {
    return (
      <main className="min-h-dvh bg-paper p-8 text-center">
        <Link to="/office" search={{ next: `/office/${id}` }} className="text-navy underline">
          {t(lang, "office")}
        </Link>
      </main>
    );
  }
  if (!report || missing) {
    return (
      <main className="min-h-dvh bg-paper p-8 text-center">
        Daily not found.{" "}
        <Link to="/office" className="text-navy underline">
          {t(lang, "office")}
        </Link>
      </main>
    );
  }

  const daily = report;
  const flow = (status || workflowStatus(daily)) as ReturnType<typeof workflowStatus>;
  const pdfName = signedName || daily.signedPdfName;

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataBase64 = await readFileBase64(file);
      const result = await uploadSignedPdfFn({
        data: { id: daily.id, filename: file.name, dataBase64 },
      });
      setStatus(result.status || "signed");
      setSignedName(result.name || file.name);
      toast.success("Signed PDF saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload");
    } finally {
      setBusy(false);
    }
  }

  async function onFile() {
    setBusy(true);
    try {
      const result = await markFiledFn({ data: { id: daily.id } });
      setStatus(result.status || "filed");
      toast.success("Filed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not file");
    } finally {
      setBusy(false);
    }
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
            <Link to="/print/$id" params={{ id: daily.id }} className="text-sm font-medium text-navy">
              {t(lang, "print")}
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
                {formatDisplayDate(daily.date)} · Report #{daily.jobSiteReportNo}
                {daily.priorReportNo ? ` (old #${daily.priorReportNo})` : ""} · {daily.filledBy}
              </p>
              <p className="text-xs text-muted">
                {statusLabel(flow)} · {daily.signedPdfPath || flow === "signed" || flow === "filed" ? t(lang, "signed") : t(lang, "unsigned")}
                {daily.signedBy ? ` · ${daily.signedBy}` : ""} · {daily.photos.length} photos
              </p>
            </div>
          </div>
          {daily.sample ? (
            <p className="mt-3 rounded-md bg-warn px-3 py-2 text-sm font-medium text-paper">
              {t(lang, "sampleBanner")}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted">{t(lang, officeReceiptNoteKey(daily))}</p>
          <p className="mt-2 text-sm text-ink">{composedComments(daily)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => downloadJson(daily)}>
              {t(lang, "export")}
            </Button>
            <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-navy px-4 text-sm font-medium text-paper">
              {busy ? t(lang, "sending") : t(lang, "uploadSigned")}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  void onUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {pdfName || daily.signedPdfPath ? (
              <a
                href={`/api/office/signed/${daily.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-line px-4 text-sm font-medium text-navy"
              >
                {t(lang, "signedPdf")}
                {pdfName ? ` · ${pdfName}` : ""}
              </a>
            ) : null}
            {flow === "signed" ? (
              <Button type="button" variant="ok" disabled={busy} onClick={() => void onFile()}>
                {t(lang, "markFiled")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-3 py-6">
        <OfficialForm report={daily} />
      </div>
    </div>
  );
}
