import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/office/signed/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { officeAuthorizedFromRequest, readSignedPdf } = await import("@/lib/dailies.server");
        if (!officeAuthorizedFromRequest(request)) {
          return Response.json({ error: "Office login required" }, { status: 401 });
        }
        const file = await readSignedPdf(params.id);
        if (!file) return new Response("Not found", { status: 404 });
        return new Response(file.stream, {
          headers: {
            "Content-Type": file.contentType,
            "Content-Disposition": `inline; filename="signed-${params.id}.pdf"`,
          },
        });
      },
    },
  },
});
