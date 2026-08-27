import { AbaaMark } from "@/components/abaa-mark";

export function BootScreen() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 bg-paper px-6">
      <AbaaMark className="h-12 w-[200px]" />
      <h1 className="font-display text-3xl font-semibold text-navy">VA Home ABAA Daily</h1>
      <p className="text-sm text-muted">James River Exteriors · Virginia Home 725-011</p>
      <p className="text-sm text-ink">Loading saved dailies…</p>
    </main>
  );
}
