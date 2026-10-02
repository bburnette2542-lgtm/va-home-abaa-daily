import { sendReportsInOrder, sentStatus } from "./dailies";
import { submitDailyFn } from "./dailies.functions";
import type { Report } from "./report";
import { useAppStore } from "./store";

export async function pushDailyToServer(report: Report) {
  try {
    await submitDailyFn({ data: report });
    useAppStore.getState().markSent(report.id);
    return { ok: true as const };
  } catch (err) {
    useAppStore.getState().markNotSent(report.id);
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not send. Try again.",
    };
  }
}

export async function pushAllUnsent() {
  const unsent = useAppStore.getState().reports.filter((r) => sentStatus(r) === "not_sent");
  const results = await sendReportsInOrder(unsent, async (report) => {
    const result = await pushDailyToServer(report);
    if (!result.ok) throw new Error(result.error);
  });
  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    errors: results.filter((r) => !r.ok).map((r) => r.error || "Could not send"),
    results,
  };
}
