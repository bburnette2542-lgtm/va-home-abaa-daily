import { createFileRoute } from "@tanstack/react-router";
import { BootScreen } from "@/components/daily/boot";
import { DailyWizard } from "@/components/daily/wizard";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/daily/$id")({ component: DailyPage });

function DailyPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  if (!hydrated) return <BootScreen />;
  return <DailyWizard id={id} />;
}
