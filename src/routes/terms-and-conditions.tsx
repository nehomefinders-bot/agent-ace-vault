import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal-documents";

export const Route = createFileRoute("/terms-and-conditions")({
  component: TermsAndConditionsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions - Agent Business Tracker" },
      { name: "description", content: "Terms and Conditions governing the use of Agent Business Tracker." },
    ],
  }),
});

function TermsAndConditionsPage() {
  return <LegalDocumentPage kind="terms" />;
}
