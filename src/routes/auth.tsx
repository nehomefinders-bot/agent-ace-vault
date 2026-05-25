import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import endlessProspectsLogo from "@/assets/endless-prospects-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Agent Business Tracker" },
      { name: "description", content: "Sign in or create your Agent Business Tracker account to track commissions, expenses and mileage." },
    ],
  }),
});

export function AuthPage({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    nav({ to: "/", replace: true });
  }, [authLoading, user, nav]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null); setInfo(null); setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // browser will navigate away
      nav({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh w-full flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <Link to="/landing" className="flex items-center gap-2.5 mb-8 justify-center">
          <img
            src={endlessProspectsLogo}
            alt="Endless Prospects"
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-border"
          />
          <div>
            <div className="font-display font-bold text-lg leading-none">Endless Prospects</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Business Tracker</div>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Sign in to your books, mileage and clients." : "Start tracking commissions and write-offs in minutes."}
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 11v3.2h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"/>
            </svg>
            Continue with Google
          </button>
          <div className="relative my-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="bg-card px-2 relative z-10">or with email</span>
            <div className="absolute inset-x-0 top-1/2 border-t border-border -z-0" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Agent"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
              </Field>
            )}
            <Field label="Email" icon={Mail}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brokerage.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
            </Field>
            <Field label="Password" icon={Lock}>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
            </Field>

            {error && <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</div>}
            {info && <div className="text-xs text-success bg-success/10 px-3 py-2 rounded-lg">{info}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
            <div>
              {mode === "signin" ? (
                <>New here? <button onClick={() => setMode("signup")} className="text-foreground font-medium hover:underline">Create an account</button></>
              ) : (
                <>Already have an account? <button onClick={() => setMode("signin")} className="text-foreground font-medium hover:underline">Sign in</button></>
              )}
            </div>
            {mode === "signin" && (
              <div>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot your password?</Link>
              </div>
            )}
          </div>
          <div className="mt-4 text-center text-[11px] text-muted-foreground">
            By continuing you agree to our <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      <div className="relative">
        {Icon && <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        {children}
      </div>
    </label>
  );
}
