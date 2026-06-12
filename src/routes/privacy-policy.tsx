import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal-documents";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy - Agent Business Tracker" },
      { name: "description", content: "How Agent Business Tracker collects, uses, and protects your information." },
    ],
  }),
});

function PrivacyPolicyPage() {
  return <LegalDocumentPage kind="privacy" />;
}
