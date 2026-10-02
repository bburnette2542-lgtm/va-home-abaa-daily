import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { t } from "@/lib/i18n";
import { isWaived, type Lang, type Report } from "@/lib/report";

export function WaiveField({
  id,
  lang,
  report,
  patch,
  arnold,
}: {
  id: string;
  lang: Lang;
  report: Report;
  patch: (p: Partial<Report>) => void;
  arnold: boolean;
}) {
  const waived = isWaived(report, id);
  const [reason, setReason] = useState(report.waivers?.[id]?.reason || "");
  if (waived) {
    return (
      <p className="text-xs text-muted">
        {t(lang, "waivedByArnold")}: {report.waivers?.[id]?.reason}
        {arnold ? (
          <button
            type="button"
            className="ml-2 text-navy underline"
            onClick={() => {
              const waivers = { ...report.waivers };
              delete waivers[id];
              patch({ waivers });
            }}
          >
            {t(lang, "clearWaiver")}
          </button>
        ) : null}
      </p>
    );
  }
  if (!arnold) return null;
  return (
    <div className="mt-1 flex flex-col gap-1">
      <p className="text-xs text-muted">{t(lang, "arnoldWaive")}</p>
      <div className="flex gap-2">
        <Input
          value={reason}
          placeholder={t(lang, "waiveReason")}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 shrink-0 px-3 text-xs"
          disabled={!reason.trim()}
          onClick={() =>
            patch({
              waivers: {
                ...report.waivers,
                [id]: { reason: reason.trim(), at: new Date().toISOString() },
              },
            })
          }
        >
          {t(lang, "waive")}
        </Button>
      </div>
    </div>
  );
}

export function ArnoldUnlock({
  lang,
  unlocked,
  onUnlock,
}: {
  lang: Lang;
  unlocked: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  if (unlocked) {
    return <span className="text-xs font-medium text-ok">{t(lang, "arnoldOn")}</span>;
  }
  if (!open) {
    return (
      <button type="button" className="text-xs font-medium text-navy" onClick={() => setOpen(true)}>
        {t(lang, "arnoldUnlock")}
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void onUnlock(pin).then((ok) => {
          if (!ok) setError(t(lang, "arnoldBadPin"));
          else setOpen(false);
        });
      }}
    >
      <Input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="PIN"
        className="min-h-9 w-24 px-2 text-xs"
      />
      <Button type="submit" variant="secondary" className="min-h-9 px-2 text-xs">
        OK
      </Button>
      {error ? <span className="text-[10px] text-bad">{error}</span> : null}
    </form>
  );
}
