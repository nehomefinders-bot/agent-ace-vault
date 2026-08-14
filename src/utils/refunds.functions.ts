import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "livingandlearningwithjackie@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const REASONS = [
  "Accidental Purchase",
  "Not Using the App",
  "Technical Issues",
  "Other",
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const submitRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        reason: z.enum(REASONS),
        details: z.string().trim().max(2000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const userEmail = (claims as { email?: string } | null)?.email ?? "";

    const { data: row, error } = await supabase
      .from("refund_requests")
      .insert({
        user_id: userId,
        user_email: userEmail,
        reason: data.reason,
        details: data.details || null,
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);

    let emailed = false;
    let emailError: string | null = null;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];

    if (lovableKey && resendKey) {
      try {
        const html = `
          <h2>New Refund Request</h2>
          <p><strong>User Email:</strong> ${escapeHtml(userEmail)}</p>
          <p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
          <p><strong>Additional Feedback:</strong><br/>${escapeHtml(data.details || "—")}</p>
          <p><strong>User ID:</strong> ${escapeHtml(userId)}</p>
          <p><strong>Timestamp:</strong> ${escapeHtml(String(row.created_at))}</p>
        `;
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "Agent Business Tracker <onboarding@resend.dev>",
            to: [ADMIN_EMAIL],
            subject: `New Refund Request from ${userEmail}`,
            html,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`Resend request failed [${res.status}]: ${body}`);
          emailError = `Provider request failed [${res.status}]: ${body}`;
        } else {
          emailed = true;
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : "Unknown email error";
        console.error("Refund notification email failed:", emailError);
      }
    } else {
      emailError = "Email provider is not configured";
    }

    return { id: row.id, emailed, emailError };
  });
