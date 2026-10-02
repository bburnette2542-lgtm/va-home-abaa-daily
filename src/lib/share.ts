import type { Report } from "./report";

export const OFFICE = {
  name: "Bernie Burnette",
  email: "bernie@jamesriverexteriors.com",
} as const;

export function downloadJson(report: Report) {
  const blob = new Blob([JSON.stringify(report)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ABAA-VA-Home-${report.date}-R${report.jobSiteReportNo}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
