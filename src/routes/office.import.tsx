import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { importOfficeDailyFn } from "@/lib/dailies.functions";
import { t } from "@/lib/i18n";
import type { Report } from "@/lib/report";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/office/import")({ component: OfficeImport });

function OfficeImport() {
  const lang = useAppStore((s) => s.lang);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const lines: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const parsed = JSON.parse(await file.text()) as Report;
        if (!parsed?.id || !parsed.date) throw new Error("Missing date or id");
        const saved = await importOfficeDailyFn({ data: parsed });
        lines.push(`${file.name}: saved ${saved.date} #${saved.jobSiteReportNo} (date kept)`);
      } catch (err) {
        lines.push(`${file.name}: ${err instanceof Error ? err.message : "could not import"}`);
      }
    }
    setLog(lines);
    setBusy(false);
    toast.success("Import finished");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-paper px-5 py-8">
      <Link to="/office" className="text-sm font-medium text-navy">
        {t(lang, "back")}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold text-navy">{t(lang, "importOffice")}</h1>
      <p className="mt-2 text-sm text-muted">{t(lang, "importOfficeHint")}</p>
      <label className="mt-6 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper-2 px-4 text-sm text-navy">
        Drop exported JSON here, or tap to choose files.
        <input
          type="file"
          accept="application/json,.json"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <Button type="button" variant="secondary" className="mt-4" disabled={busy} onClick={() => history.back()}>
        {t(lang, "office")}
      </Button>
      {log.length ? (
        <ul className="mt-4 flex flex-col gap-1 text-sm text-ink">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
