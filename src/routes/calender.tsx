import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/calender")({
  beforeLoad: () => {
    throw redirect({ to: "/calendar" });
  },
});

