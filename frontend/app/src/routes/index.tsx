import { createFileRoute } from "@tanstack/react-router";
import { SpotSelector } from "@/components/SpotSelector";

export const Route = createFileRoute('/')({
  component: SpotSelector
});