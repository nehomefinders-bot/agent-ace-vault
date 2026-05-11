// Client-side fetch interceptor that attaches the current Supabase session
// bearer token to all server function calls (`/_serverFn/...`).
// Without this, server functions guarded by `requireSupabaseAuth` reject with
// "No authorization header provided".
import { supabase } from "./client";

let installed = false;

export function installServerFnAuth() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (url && url.includes("/_serverFn/")) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers.set("authorization", `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
      }
    } catch {
      // fall through to plain fetch
    }
    return originalFetch(input, init);
  };
}
