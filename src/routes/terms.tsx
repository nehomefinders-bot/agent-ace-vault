import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Apex Realty OS" },
      { name: "description", content: "Terms governing use of Apex Realty OS." },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link to="/landing" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="font-display text-4xl font-bold mt-6 mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: May 3, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-bold mb-2">1. Acceptance</h2>
          <p>By creating an account or using Apex Realty OS ("the Service"), you agree to these Terms. If you don't agree, don't use the Service.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">2. Your account</h2>
          <p>You're responsible for keeping your login credentials secure and for all activity under your account. Notify us immediately if you suspect unauthorized access.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">3. Acceptable use</h2>
          <p>Don't use the Service to violate any law, infringe anyone's rights, transmit malware, scrape data, or attempt to disrupt the platform. We may suspend accounts that do.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">4. Subscriptions and billing</h2>
          <p>Paid plans are billed in advance via Stripe. You can cancel any time; cancellations take effect at the end of the current billing period. We don't issue prorated refunds for partial periods unless required by law.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">5. Not tax or legal advice</h2>
          <p>The Service helps you organize your books, mileage and commissions. The numbers it produces — including the Tax Estimator — are estimates only and are not tax, legal, or financial advice. Always consult a licensed CPA before filing.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">6. Your data</h2>
          <p>You own everything you put into the Service. You grant us a limited license to host and process it for the sole purpose of providing the Service. See our <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">7. Warranty disclaimer</h2>
          <p>The Service is provided "as is" without warranties of any kind. We don't guarantee uninterrupted or error-free operation.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">8. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, our total liability for any claim arising from the Service is limited to the amount you paid us in the 12 months prior to the claim.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">9. Changes</h2>
          <p>We may update these Terms. We'll notify you of material changes by email or in-app notice.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold mb-2">10. Contact</h2>
          <p>Questions? Email <a href="mailto:support@apexrealtyos.com" className="underline">support@apexrealtyos.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
