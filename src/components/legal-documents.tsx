import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export type LegalDocumentKind = "terms" | "privacy";

const CONTACT_EMAIL = "livingandlearningwithjackie@gmail.com";
const UPDATED_AT = "May 3, 2026";

type Section = {
  title: string;
  body: (onOpenDocument?: (kind: LegalDocumentKind) => void) => ReactNode;
};

function emailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 transition-colors hover:text-foreground">
      {CONTACT_EMAIL}
    </a>
  );
}

function privacyReference(onOpenDocument?: (kind: LegalDocumentKind) => void) {
  if (onOpenDocument) {
    return (
      <button
        type="button"
        onClick={() => onOpenDocument("privacy")}
        className="underline underline-offset-4 transition-colors hover:text-foreground"
      >
        Privacy Policy
      </button>
    );
  }

  return (
    <Link to="/privacy" className="underline underline-offset-4 transition-colors hover:text-foreground">
      Privacy Policy
    </Link>
  );
}

const TERMS_SECTIONS: Section[] = [
  {
    title: "1. Acceptance",
    body: () => (
      <p>
        By creating an account or using Agent Business Tracker ("the Service"), you agree to these Terms. If you don't
        agree, don't use the Service.
      </p>
    ),
  },
  {
    title: "2. Your account",
    body: () => (
      <p>
        You're responsible for keeping your login credentials secure and for all activity under your account. Notify
        us immediately if you suspect unauthorized access.
      </p>
    ),
  },
  {
    title: "3. Acceptable use",
    body: () => (
      <p>
        Don't use the Service to violate any law, infringe anyone's rights, transmit malware, scrape data, or attempt
        to disrupt the platform. We may suspend accounts that do.
      </p>
    ),
  },
  {
    title: "4. Subscriptions and billing",
    body: () => (
      <p>
        Paid plans are billed in advance via Stripe. You can cancel any time; cancellations take effect at the end of
        the current billing period. We don't issue prorated refunds for partial periods unless required by law.
      </p>
    ),
  },
  {
    title: "5. Not tax or legal advice",
    body: () => (
      <p>
        The Service helps you organize your books, mileage and commissions. The numbers it produces, including the Tax
        Estimator, are estimates only and are not tax, legal, or financial advice. Always consult a licensed CPA
        before filing.
      </p>
    ),
  },
  {
    title: "6. Your data",
    body: (onOpenDocument) => (
      <p>
        You own everything you put into the Service. You grant us a limited license to host and process it for the
        sole purpose of providing the Service. See our {privacyReference(onOpenDocument)}.
      </p>
    ),
  },
  {
    title: "7. Warranty disclaimer",
    body: () => (
      <p>
        The Service is provided "as is" without warranties of any kind. We don't guarantee uninterrupted or error-free
        operation.
      </p>
    ),
  },
  {
    title: "8. Limitation of liability",
    body: () => (
      <p>
        To the maximum extent permitted by law, our total liability for any claim arising from the Service is limited
        to the amount you paid us in the 12 months prior to the claim.
      </p>
    ),
  },
  {
    title: "9. Changes",
    body: () => <p>We may update these Terms. We'll notify you of material changes by email or in-app notice.</p>,
  },
  {
    title: "10. Contact",
    body: () => (
      <p>
        Questions? Email {emailLink()}.
      </p>
    ),
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    title: "1. Information we collect",
    body: () => (
      <p>
        We collect information you provide directly: your name, email address, business records (transactions,
        accounts, deals, mileage, receipts) and any client or invoice data you choose to enter. We also collect basic
        usage data (IP address, browser type, pages viewed) to keep the service running.
      </p>
    ),
  },
  {
    title: "2. How we use it",
    body: () => (
      <p>
        We use your information to provide and improve the service, authenticate you, store your business records,
        send you transactional emails (receipts, password resets), and respond to support requests. We do not sell
        your data.
      </p>
    ),
  },
  {
    title: "3. Storage and security",
    body: () => (
      <p>
        Your data is stored on managed cloud infrastructure with row-level security so only you can access your
        records. We use industry-standard encryption in transit (TLS) and at rest. Receipt images are stored in
        private buckets accessible only to you.
      </p>
    ),
  },
  {
    title: "4. Third parties",
    body: () => (
      <p>
        We use a small number of vetted subprocessors: Lovable Cloud (hosting and database), Stripe (payment
        processing, only if you connect it), and an AI provider (for receipt scanning). Each subprocessor is bound by
        their own privacy commitments.
      </p>
    ),
  },
  {
    title: "5. Your rights",
    body: () => (
      <p>
        You can export or delete your data at any time by contacting {emailLink()}. You can also delete your account,
        which permanently removes all associated records.
      </p>
    ),
  },
  {
    title: "6. Contact",
    body: () => (
      <p>
        Questions? Email {emailLink()}.
      </p>
    ),
  },
];

function getDocumentMeta(kind: LegalDocumentKind) {
  if (kind === "terms") {
    return {
      title: "Terms of Service",
      description: "Rules and expectations for using Agent Business Tracker.",
      sections: TERMS_SECTIONS,
    };
  }

  return {
    title: "Privacy Policy",
    description: "How Agent Business Tracker collects, uses, and protects your information.",
    sections: PRIVACY_SECTIONS,
  };
}

export function LegalDocumentContent({
  kind,
  onOpenDocument,
}: {
  kind: LegalDocumentKind;
  onOpenDocument?: (kind: LegalDocumentKind) => void;
}) {
  const document = getDocumentMeta(kind);

  return (
    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-foreground">{document.title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: {UPDATED_AT}</p>
      </div>

      {document.sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="font-display text-xl font-bold text-foreground">{section.title}</h2>
          <div>{section.body(onOpenDocument)}</div>
        </section>
      ))}
    </div>
  );
}

export function LegalDocumentPage({ kind }: { kind: LegalDocumentKind }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/landing" className="text-sm text-muted-foreground hover:text-foreground">
        Back
      </Link>
      <div className="mt-6">
        <LegalDocumentContent kind={kind} />
      </div>
    </div>
  );
}

export function LegalDocumentModal({
  open,
  onOpenChange,
  kind,
  onKindChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LegalDocumentKind;
  onKindChange: (kind: LegalDocumentKind) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0">
        <div className="border-b border-border/60 bg-muted/40 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                {kind === "terms" ? "Terms of Service" : "Privacy Policy"}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-xl text-sm text-muted-foreground">
                Review the policy before signing in.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onKindChange("terms")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  kind === "terms"
                    ? "border-[#d4af37] bg-[#d4af37]/15 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => onKindChange("privacy")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  kind === "privacy"
                    ? "border-[#d4af37] bg-[#d4af37]/15 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Privacy
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[min(72vh,42rem)]">
          <div className="px-6 py-6">
            <LegalDocumentContent kind={kind} onOpenDocument={onKindChange} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
