import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetlup } from "@/lib/setlup/store";

function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (res.error) setError(res.error.message);
    else if (mode === "up" && !res.data.session) setNotice("Check your email to confirm your account.");
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-[var(--accent)] px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="font-display text-[30px] leading-none tracking-tight">SETLUP</div>
        <p className="mt-3 text-[13px] leading-snug text-white/70">
          Budget, manage and reconcile your events.
        </p>

        <form onSubmit={submit} className="mt-9 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-white/60">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-lg border border-white/25 bg-white/10 px-3 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-white/60"
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-white/60">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-white/25 bg-white/10 px-3 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-white/60"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-[12px] text-white">{error}</p> : null}
          {notice ? <p className="text-[12px] text-white/80">{notice}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 rounded-lg bg-white text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)] disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
            setNotice(null);
          }}
          className="mt-5 text-[12px] uppercase tracking-[0.08em] text-white/70 underline"
        >
          {mode === "in" ? "Create an account" : "I already have an account"}
        </button>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { authReady, userId, loading } = useSetlup();
  if (!authReady) return <Spinner />;
  if (!userId) return <SignIn />;
  if (loading) return <Spinner />;
  return <>{children}</>;
}
