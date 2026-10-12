import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sign/form-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") || "";
        const { assertClayToken } = await import("@/lib/dailies.server");
        try {
          await assertClayToken(token);
        } catch {
          return Response.json({ ok: false, error: "This signing link is not valid." }, { status: 401 });
        }
        const { applyClaySignature, claySignFixtureDaily, TINY_PNG } = await import("@/lib/clay-sign");
        const { buildOfficialSignedPdf } = await import("@/lib/signed-pdf");
        const report = applyClaySignature(claySignFixtureDaily("form-check"), {
          signatureDataUrl: TINY_PNG,
          signatureDate: "2026-10-12",
          signedBy: "Clay",
        });
        report.sample = true;
        const bytes = await buildOfficialSignedPdf(report);
        return Response.json({ ok: true, pages: 3, bytes: bytes.byteLength });
      },
    },
  },
});
