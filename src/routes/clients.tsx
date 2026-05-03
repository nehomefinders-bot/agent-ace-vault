import { createFileRoute } from "@tanstack/react-router";
import { Plus, Mail, Phone } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { clients } from "@/lib/mock-data";

export const Route = createFileRoute("/clients")({
  component: Clients,
  head: () => ({ meta: [{ title: "Clients — Apex Realty OS" }] }),
});

const tone: Record<string, "success" | "warning" | "primary" | "muted"> = {
  Buyer: "primary", Seller: "warning", Both: "success", Lead: "muted",
};

function Clients() {
  return (
    <PageShell
      title="Clients"
      subtitle="Your CRM — buyers, sellers, and active leads."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Client
        </button>
      }
    >
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left font-medium py-3 px-6">Name</th>
              <th className="text-left font-medium py-3">Contact</th>
              <th className="text-left font-medium py-3">Type</th>
              <th className="text-left font-medium py-3 pr-6">Last touch</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {c.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="py-4 text-muted-foreground">
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</span>
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</span>
                  </div>
                </td>
                <td className="py-4"><StatusPill tone={tone[c.type]}>{c.type}</StatusPill></td>
                <td className="py-4 pr-6 text-muted-foreground text-xs">{c.lastContact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
