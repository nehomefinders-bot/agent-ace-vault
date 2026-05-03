import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Apex Realty OS" },
      { name: "description", content: "How Apex Realty OS collects, uses, and protects your information." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link to="/landing" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="font-display text-4xl font-bold mt-6 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: May 3, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-bold mb-2">1. Information we collect</h2>
          <p>We collect information you provide directly: your name, email address, business records (transactions, accounts, deals, mileage, receipts) and any client or invoice data you choose to enter. We also collect basic usage data (IP address, browser type, pages viewed) to keep the service running.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">2. How we use it</h2>
          <p>We use your information to provide and improve the service, authenticate you, store your business records, send you transactional emails (receipts, password resets), and respond to support requests. We do not sell your data.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">3. Storage and security</h2>
          <p>Your data is stored on managed cloud infrastructure with row-level security so only you can access your records. We use industry-standard encryption in transit (TLS) and at rest. Receipt images are stored in private buckets accessible only to you.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">4. Third parties</h2>
          <p>We use a small number of vetted subprocessors: Lovable Cloud (hosting and database), Stripe (payment processing, only if you connect it), and an AI provider (for receipt scanning). Each subprocessor is bound by their own privacy commitments.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">5. Your rights</h2>
          <p>You can export or delete your data at any time by contacting <a href="mailto:support@apexrealtyos.com" className="underline">support@apexrealtyos.com</a>. You can also delete your account, which permanently removes all associated records.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">6. Contact</h2>
          <p>Questions? Email <a href="mailto:support@apexrealtyos.com" className="underline">support@apexrealtyos.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
