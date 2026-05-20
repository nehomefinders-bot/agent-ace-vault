import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseAuthStorageKey, supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let initialResolved = false;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const applyRecoveredSession = (nextSession: Session | null) => {
      if (!active) return;
      setSession((prev) => {
        if (!nextSession && prev) return prev;
        return prev?.access_token === nextSession?.access_token ? prev : nextSession;
      });
      setUser((prev) => nextSession?.user ?? prev ?? null);
      setLoading(false);
    };

    const resolveInitialSession = (nextSession: Session | null) => {
      initialResolved = true;
      applySession(nextSession);
    };

    const hasStoredSession = () => {
      if (typeof window === "undefined") return false;
      try {
        const storageKey = getSupabaseAuthStorageKey();
        return !!storageKey && !!window.localStorage.getItem(storageKey);
      } catch {
        return false;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        resolveInitialSession(null);
        return;
      }

      if (!initialResolved) {
        if (event === "INITIAL_SESSION" && !nextSession && hasStoredSession()) {
          return;
        }
        resolveInitialSession(nextSession);
        return;
      }

      applyRecoveredSession(nextSession);
    });

    const loadInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!active || initialResolved) return;

        if (!initialSession && hasStoredSession()) {
          window.setTimeout(async () => {
            try {
              const { data: { session: retriedSession } } = await supabase.auth.getSession();
              if (!active || initialResolved) return;
              resolveInitialSession(retriedSession);
            } catch {
              if (!active || initialResolved) return;
              resolveInitialSession(null);
            }
          }, 250);
          return;
        }

        resolveInitialSession(initialSession);
      } catch {
        if (!active || initialResolved) return;
        resolveInitialSession(null);
      }
    };

    const refreshVisibleSession = async () => {
      try {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (!active) return;
        applyRecoveredSession(refreshedSession);
      } catch {
        // Keep the current in-memory session until Supabase emits a real SIGNED_OUT event.
      }
    };

    void loadInitialSession();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshVisibleSession();
      }
    };

    window.addEventListener("focus", refreshVisibleSession);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshVisibleSession);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return { session, user, loading, signOut: () => supabase.auth.signOut() };
}
