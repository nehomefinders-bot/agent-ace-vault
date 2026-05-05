import { createServerFn } from "@tanstack/react-start";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, token_prefix, last_used_at, expires_at, revoked_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { keys: data ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        expiresInDays: z.number().int().positive().max(3650).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const raw = randomBytes(32).toString("base64url");
    const token = `sk_live_${raw}`;
    const prefix = token.slice(0, 12);
    const hash = hashToken(token);
    const expires_at = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400 * 1000).toISOString()
      : null;

    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        name: data.name,
        token_prefix: prefix,
        token_hash: hash,
        expires_at,
      })
      .select("id, name, token_prefix, expires_at, created_at")
      .single();
    if (error) throw new Error(error.message);

    // Token is returned ONCE here — never stored or returned again.
    return { key: row, token };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
