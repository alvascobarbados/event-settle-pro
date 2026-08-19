import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetlup } from "@/lib/setlup/store";

const MAGENTA = "#CE1663";
const DEEP = "#A81050";
const INK = "#221A20";

function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: MAGENTA, borderTopColor: "transparent" }}
      />
    </div>
  );
}

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (/already registered/i.test(msg)) return "That email already has an account — sign in instead.";
  if (/at least 6/i.test(msg)) return "Password needs at least 6 characters.";
  return msg;
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
    if (res.error) setError(friendly(res.error.message));
    else if (mode === "up" && !res.data.session)
      setNotice("Check your email to confirm your account.");
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: MAGENTA }}>
      {/* brand band — same language as the app bar */}
      <div className="flex flex-1 flex-col justify-end px-6 pb-8" style={{ color: INK }}>
        <div
          className="text-[9px] font-extrabold uppercase"
          style={{ letterSpacing: "0.22em", opacity: 0.55 }}
        >
          Event budgeting &amp; reconciliation
        </div>
        <div className="wordmark mt-1 text-[40px] font-black uppercase leading-none">SETLUP</div>
        <p className="mt-2 max-w-[32ch] text-[13px] font-semibold leading-snug" style={{ opacity: 0.75 }}>
          Budget, manage and settle up your events.
        </p>
      </div>

      {/* form card — same surface as the rest of the app */}
      <div className="rounded-t-[24px] bg-card px-6 pb-10 pt-7 shadow-[0_-12px_40px_rgba(34,26,32,0.18)]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-extrabold uppercase text-mute"
              style={{ letterSpacing: "0.1em" }}
            >
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-app px-3.5 text-[15px] text-ink outline-none placeholder:text-mute"
              style={{ border: "1.5px solid var(--hairline)" }}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-extrabold uppercase text-mute"
              style={{ letterSpacing: "0.1em" }}
            >
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-app px-3.5 text-[15px] text-ink outline-none placeholder:text-mute"
              style={{ border: "1.5px solid var(--hairline)" }}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="text-[12.5px] font-semibold" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}
          {notice && <p className="text-[12.5px] font-semibold text-mute">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-12 rounded-full text-[13px] font-extrabold uppercase text-white transition-transform active:scale-[0.99] disabled:opacity-60"
            style={{ backgroundColor: MAGENTA, letterSpacing: "0.08em" }}
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
          className="mt-5 w-full text-center text-[12.5px] font-bold"
          style={{ color: DEEP }}
        >
          {mode === "in" ? "New here? Create an account" : "I already have an account"}
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
