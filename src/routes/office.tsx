import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BootScreen } from "@/components/daily/boot";
import { Button, Field, Input } from "@/components/ui";
import { loginOfficeFn, officeStatusFn } from "@/lib/dailies.functions";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/office")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    if (typeof s.next === "string" && s.next) return { next: s.next };
    return {};
  },
  component: OfficeLayout,
});

function OfficeLayout() {
  const { next } = Route.useSearch();
  const lang = useAppStore((s) => s.lang);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void officeStatusFn()
      .then((r) => setStatus(r.ok ? "in" : "out"))
      .catch(() => setStatus("out"));
  }, []);

  async function onUnlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await loginOfficeFn({ data: { passcode } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus("in");
    if (next && next.startsWith("/")) {
      window.location.assign(next);
      return;
    }
    void navigate({ to: "/office" });
  }

  if (status === "loading") return <BootScreen />;
  if (status === "out") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-paper px-5 py-10">
        <h1 className="font-display text-3xl font-semibold text-navy">{t(lang, "officeGate")}</h1>
        <p className="mt-2 text-sm text-muted">{t(lang, "officeGateHint")}</p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void onUnlock(e)}>
          <Field label={t(lang, "officeGate")}>
            <Input
              type="password"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <Button type="submit" disabled={busy || !passcode}>
            {t(lang, "unlock")}
          </Button>
        </form>
      </div>
    );
  }

  return <Outlet />;
}
