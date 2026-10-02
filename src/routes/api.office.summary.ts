import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/office/summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { officeAuthorizedFromRequest, officeSummary } = await import("@/lib/dailies.server");
        if (!officeAuthorizedFromRequest(request)) {
          return Response.json({ error: "Office login required" }, { status: 401 });
        }
        const url = new URL(request.url);
        const from = url.searchParams.get("from") || undefined;
        const to = url.searchParams.get("to") || undefined;
        const dailies = await officeSummary(from, to);
        return Response.json({ from: from || "", to: to || "", dailies });
      },
    },
  },
});
