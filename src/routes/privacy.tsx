import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal-documents";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy - Agent Business Tracker" },
      { name: "description", content: "How Agent Business Tracker collects, uses, and protects your information." },
    ],
  }),
});

function PrivacyPage() {
  return <LegalDocumentPage kind="privacy" />;
}
