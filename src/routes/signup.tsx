import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "./auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Start your 14-Day Free Trial - Agent Business Tracker" },
      {
        name: "description",
        content: "Create your Agent Business Tracker account and start automating bookkeeping, mileage, and client tracking.",
      },
    ],
  }),
});

function SignupPage() {
  return <AuthPage initialMode="signup" />;
}
