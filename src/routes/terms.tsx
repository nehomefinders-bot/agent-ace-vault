import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal-documents";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service - Agent Business Tracker" },
      { name: "description", content: "Terms governing use of Agent Business Tracker." },
    ],
  }),
});

function TermsPage() {
  return <LegalDocumentPage kind="terms" />;
}
