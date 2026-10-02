import { createServerFn } from "@tanstack/react-start";
import { submitDailyToOffice } from "./dailies";
import { canSubmit, type Report } from "./report";

function asReport(data: unknown): Report {
  if (!data || typeof data !== "object") throw new Error("Daily is missing.");
  const report = data as Report;
  if (!report.id || !report.date) throw new Error("Daily is missing a date or id.");
  return report;
}

export const submitDailyFn = createServerFn({ method: "POST" })
  .validator((data: Report) => asReport(data))
  .handler(async ({ data }) => {
    if (!canSubmit(data)) {
      throw new Error("Required fields are still blank. Arnold can waive a field if it does not apply.");
    }
    const { emailDailyToBernie, saveDailyBlob } = await import("./dailies.server");
    const toSave: Report = { ...data, officeStatus: "waiting_signature" };
    await submitDailyToOffice(toSave, {
      save: async (report) => {
        await saveDailyBlob(report);
      },
      email: async (report) => {
        await emailDailyToBernie(report);
      },
    });
    return { ok: true as const };
  });

export const officeStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { isOfficeLoggedIn } = await import("./dailies.server");
  return { ok: isOfficeLoggedIn() };
});

export const loginOfficeFn = createServerFn({ method: "POST" })
  .validator((data: { passcode: string }) => {
    if (!data || typeof data.passcode !== "string") throw new Error("Passcode is required.");
    return { passcode: data.passcode };
  })
  .handler(async ({ data }) => {
    const { loginOffice } = await import("./dailies.server");
    const ok = loginOffice(data.passcode);
    if (!ok) return { ok: false as const, error: "That passcode is not right." };
    return { ok: true as const };
  });

export const arnoldStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { isArnoldUnlocked } = await import("./dailies.server");
  return { ok: isArnoldUnlocked() };
});

export const unlockArnoldFn = createServerFn({ method: "POST" })
  .validator((data: { pin: string }) => {
    if (!data || typeof data.pin !== "string") throw new Error("PIN is required.");
    return { pin: data.pin };
  })
  .handler(async ({ data }) => {
    const { unlockArnold } = await import("./dailies.server");
    const ok = unlockArnold(data.pin);
    if (!ok) return { ok: false as const, error: "That PIN is not right." };
    return { ok: true as const };
  });

export const listOfficeDailiesFn = createServerFn({ method: "GET" })
  .validator((data?: { from?: string; to?: string; status?: string }) => ({
    from: data?.from?.trim() || undefined,
    to: data?.to?.trim() || undefined,
    status: data?.status?.trim() || undefined,
  }))
  .handler(async ({ data }) => {
    const { listDailySummaries, requireOffice } = await import("./dailies.server");
    requireOffice();
    return listDailySummaries(data.from, data.to, data.status);
  });

export const getOfficeDailyFn = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => {
    if (!data?.id) throw new Error("Daily id is required.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { loadDailyById, requireOffice } = await import("./dailies.server");
    requireOffice();
    const report = await loadDailyById(data.id);
    if (!report) throw new Error("Daily not found on the server.");
    return report;
  });

export const listOfficeRangeFn = createServerFn({ method: "GET" })
  .validator((data?: { from?: string; to?: string }) => ({
    from: data?.from?.trim() || undefined,
    to: data?.to?.trim() || undefined,
  }))
  .handler(async ({ data }) => {
    const { loadDailiesInRange, requireOffice } = await import("./dailies.server");
    requireOffice();
    return loadDailiesInRange(data.from, data.to);
  });

export const importOfficeDailyFn = createServerFn({ method: "POST" })
  .validator((data: Report) => asReport(data))
  .handler(async ({ data }) => {
    const { importDailyKeepingDate, requireOffice } = await import("./dailies.server");
    requireOffice();
    const saved = await importDailyKeepingDate(data);
    return { ok: true as const, date: saved.date, jobSiteReportNo: saved.jobSiteReportNo };
  });

export const uploadSignedPdfFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; filename: string; dataBase64: string }) => {
    if (!data?.id || !data.dataBase64) throw new Error("Signed PDF is missing.");
    return { id: data.id, filename: data.filename || "signed.pdf", dataBase64: data.dataBase64 };
  })
  .handler(async ({ data }) => {
    const { attachSignedPdf } = await import("./dailies.server");
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    const report = await attachSignedPdf(data.id, data.filename, bytes);
    return { ok: true as const, status: report.officeStatus, name: report.signedPdfName };
  });

export const markFiledFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => {
    if (!data?.id) throw new Error("Daily id is required.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { markDailyFiled } = await import("./dailies.server");
    const report = await markDailyFiled(data.id);
    return { ok: true as const, status: report.officeStatus };
  });
