import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google/calendar-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        const appBase = `${url.protocol}//${url.host}`;
        const failRedirect = (reason: string) =>
          Response.redirect(
            `${appBase}/calendar?google=error&reason=${encodeURIComponent(reason)}`,
            302,
          );

        if (errorParam) return failRedirect(errorParam);
        if (!code || !state) return failRedirect("missing_code_or_state");

        try {
          const { verifyState, exchangeCodeForTokens, fetchGoogleUserEmail } =
            await import("@/lib/google-oauth.server");
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const { userId } = verifyState(state);
          const redirectUri = `${appBase}/api/public/google/calendar-callback`;
          const tokens = await exchangeCodeForTokens({ code, redirectUri });

          if (!tokens.refresh_token) {
            return failRedirect("no_refresh_token");
          }

          const email = await fetchGoogleUserEmail(tokens.access_token);
          const expiresAt = new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString();

          const { error } = await supabaseAdmin
            .from("google_calendar_tokens")
            .upsert(
              {
                user_id: userId,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: tokens.token_type ?? "Bearer",
                scope: tokens.scope,
                expires_at: expiresAt,
                google_email: email,
              },
              { onConflict: "user_id" },
            );
          if (error) {
            console.error("[google-calendar-callback] token upsert failed", error);
            return failRedirect("token_persist_failed");
          }

          return Response.redirect(`${appBase}/calendar?google=connected`, 302);
        } catch (err) {
          // Log raw details server-side only. Never forward internal error
          // strings to the browser URL — they leak to history, analytics,
          // server logs, and referrer headers.
          console.error("[google-calendar-callback] flow failed", err);
          const message = err instanceof Error ? err.message : "";
          let reason = "oauth_failed";
          if (/state/i.test(message)) reason = "invalid_state";
          else if (/token/i.test(message)) reason = "token_exchange_failed";
          else if (/email/i.test(message)) reason = "userinfo_failed";
          return failRedirect(reason);
        }
      },
    },
  },
});
