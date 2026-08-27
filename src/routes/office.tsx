import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/office")({ component: OfficeLayout });

function OfficeLayout() {
  return <Outlet />;
}
