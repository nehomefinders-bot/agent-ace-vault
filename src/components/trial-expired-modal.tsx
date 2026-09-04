import { Lock } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export function TrialExpiredModal() {
  const { signOut } = useAuth();

  // Lock background scroll while the overlay is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-expired-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/30 bg-[linear-gradient(180deg,rgba(10,16,36,0.98),rgba(4,8,20,0.98))] p-8 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#d4af37]/15 text-[#f0cf6a]">
          <Lock className="h-5 w-5" />
        </div>
        <h1
          id="trial-expired-title"
          className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl"
        >
          Your 14-Day Free Trial Has Ended
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/75">
          We hope you enjoyed using Agent Business Tracker! To continue accessing your pipeline,
          tracking your mileage, and practicing with Pocket Broker, please upgrade your account
          today.
        </p>
        <a
          href="#"
          className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-[#d4af37] px-6 py-3 text-base font-bold text-slate-950 shadow-[0_16px_40px_-16px_rgba(212,175,55,0.8)] transition-colors hover:bg-[#c89e2f]"
        >
          Subscribe to Continue
        </a>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 text-sm text-white/60 underline underline-offset-4 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
