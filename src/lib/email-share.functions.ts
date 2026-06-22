import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
  pdfBase64: z.string().min(1),
  pdfFilename: z.string().min(1).max(200),
  listingDocumentPath: z.string().nullable().optional(),
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const sendListingEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Response(
        "Email sending is not configured. Add RESEND_API_KEY in project settings.",
        { status: 500 },
      );
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "listings@endlessprospects.net";
    const brandName = process.env.RESEND_FROM_NAME || "Agent Tracker";

    // Resolve the logged-in agent's profile for dynamic From / Reply-To.
    const { supabase, userId, claims } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, contact_email")
      .eq("id", userId)
      .maybeSingle();

    const agentName =
      profile?.display_name?.trim() ||
      (claims as { email?: string } | null)?.email?.split("@")[0] ||
      "Your Agent";
    const replyTo =
      profile?.contact_email?.trim() ||
      (claims as { email?: string } | null)?.email ||
      null;

    // If the caller passed a storage path instead of pre-fetching the blob,
    // pull the PDF bytes server-side from the `listing-documents` bucket so
    // the agent never needs a public URL.
    let pdfBase64 = data.pdfBase64;
    if (data.listingDocumentPath) {
      const { data: file, error } = await supabase.storage
        .from("listing-documents")
        .download(data.listingDocumentPath);
      if (!error && file) {
        const buf = await file.arrayBuffer();
        // Base64-encode the ArrayBuffer without leaking memory on big files.
        const bytes = new Uint8Array(buf);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        pdfBase64 = btoa(binary);
      }
    }

    const fromName = `${agentName} via ${brandName}`;
    const payload = {
      from: `${fromName} <${fromEmail}>`,
      to: [data.to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: data.subject,
      text: data.body,
      html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin:0">${escapeHtml(data.body)}</pre>`,
      attachments: [
        {
          filename: data.pdfFilename.endsWith(".pdf")
            ? data.pdfFilename
            : `${data.pdfFilename}.pdf`,
          content: pdfBase64,
          content_type: "application/pdf",
        },
      ],
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[resend] send failed", res.status, errText);
      throw new Response(
        `Email failed to send (${res.status}). ${errText.slice(0, 300)}`,
        { status: 502 },
      );
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: json.id ?? null, to: data.to };
  });
