import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/daily/home";

export const Route = createFileRoute("/")({ component: HomeScreen });
