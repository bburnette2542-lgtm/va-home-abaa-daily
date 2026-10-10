import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClaySignatureCard } from "@/components/daily/clay-sign-card";
import { OfficialForm } from "@/components/daily/official-form";
import { CLAY_DEFAULT_NAME, formatSignedWhen } from "@/lib/clay-sign";
import { listClayUnsignedFn, signClayDailiesFn } from "@/lib/dailies.functions";
import type { Report } from "@/lib/report";
import { formatDisplayDate, todayISO } from "@/lib/utils";

export const Route = createFileRoute("/sign/$token")({
  component: ClaySignPage,
  head: () => ({
    meta: [
      { title: "Clay signature — VA Home ABAA Daily" },
      { name: "theme-color", content: "#0b0b0d" },
    ],
  }),
});

function ClaySignPage() {
  const { token } = Route.useParams();
  const [dailies, setDailies] = useState<Report[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const [name, setName] = useState(CLAY_DEFAULT_NAME);
  const [date, setDate] = useState(todayISO());
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedWhen, setSignedWhen] = useState("");

  async function load() {
    setError("");
    try {
      const rows = await listClayUnsignedFn({ data: { token } });
      setDailies(rows);
    } catch (err) {
      setDailies([]);
      setError(err instanceof Error ? err.message : "This signing link is not valid.");
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  const status = signedWhen || "Not signed yet";
  const canSave = Boolean(signature && name.trim() && date && dailies && dailies.length > 0);

  async function onSave() {
    if (!dailies?.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signClayDailiesFn({
        data: {
          token,
          ids: dailies.map((r) => r.id),
          signatureDataUrl: signature,
          signatureDate: date,
          signedBy: name,
        },
      });
      const failed = result.results.filter((r) => !r.ok);
      if (failed.length && failed.length === result.results.length) {
        throw new Error(failed[0]?.error || "Could not save the signature.");
      }
      setSignedWhen(formatSignedWhen(result.signedAt));
      await load();
      if (failed.length) {
        setError(`${failed.length} daily could not be signed. Try again.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the signature.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0b0b0d] text-[#f2f2f2]">
      <header className="px-4 pb-4 pt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9a9a9a]">
          VA Home ABAA Daily
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Sign these dailies</h1>
        <p className="mt-2 text-[15px] text-[#c8c8c8]">
          One signature signs every daily on this list. You do not need the office passcode.
        </p>
      </header>

      {dailies === null ? (
        <p className="px-4 py-10 text-sm text-[#9a9a9a]">Loading…</p>
      ) : error && dailies.length === 0 && !signedWhen ? (
        <p className="px-4 py-10 text-sm text-[#e8b4b0]">{error}</p>
      ) : (
        <>
          <section className="px-4 pb-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a]">
              {dailies.length === 0 ? "Nothing left to sign" : `${dailies.length} not signed yet`}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {dailies.map((report) => {
                const open = openId === report.id;
                return (
                  <article key={report.id} className="rounded-2xl bg-[#161616] px-4 py-4">
                    <p className="text-[17px] font-medium text-white">{formatDisplayDate(report.date)}</p>
                    <p className="text-[13px] text-[#9a9a9a]">
                      Report #{report.jobSiteReportNo}
                      {report.filledBy ? ` · ${report.filledBy}` : ""}
                      {report.sample ? " · SAMPLE" : ""}
                    </p>
                    <button
                      type="button"
                      className="mt-3 min-h-12 w-full rounded-full border border-[#3a3a3a] px-4 text-[15px] font-medium text-white"
                      onClick={() => setOpenId(open ? "" : report.id)}
                    >
                      {open ? "Hide the 3-page report" : "View the 3-page report"}
                    </button>
                    {open ? (
                      <div className="mt-3 overflow-x-auto rounded-xl bg-white">
                        <OfficialForm report={report} watermark={false} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          {error ? <p className="px-4 pb-3 text-sm text-[#e8b4b0]">{error}</p> : null}

          {dailies.length > 0 || signedWhen ? (
            <ClaySignatureCard
              name={name}
              date={date}
              signature={signature}
              status={status}
              busy={busy}
              canSave={canSave}
              onName={setName}
              onDate={setDate}
              onSignature={setSignature}
              onSave={() => void onSave()}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
