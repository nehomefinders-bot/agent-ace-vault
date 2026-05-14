import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Mail, MessageSquareHeart, Phone } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support - Agent Business Tracker" }] }),
});

function SupportPage() {
  return (
    <PageShell
      title="Support"
      subtitle="Contact the team directly or jump back to the step-by-step help guides."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">Direct contact</h2>
              <p className="text-sm text-muted-foreground mt-1">Fastest way to reach us.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <a
              href="mailto:livingandlearningwithjackie@gmail.com"
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 hover:bg-muted/40 transition-colors"
            >
              <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
                <div className="break-all font-medium">livingandlearningwithjackie@gmail.com</div>
              </div>
            </a>

            <a
              href="tel:+15083339393"
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 hover:bg-muted/40 transition-colors"
            >
              <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Phone</div>
                <div className="font-medium">(508) 682-4440</div>
              </div>
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center text-primary shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">How-to guides</h2>
              <p className="text-sm text-muted-foreground mt-1">Self-serve walkthroughs for everyday tasks.</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground leading-6">
              If you need a step-by-step guide for commissions, mileage, books, or reports, the How-to section has
              short walkthroughs for the most common workflows.
            </p>
            <div className="mt-4">
              <Link
                to="/help"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open How-to
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
