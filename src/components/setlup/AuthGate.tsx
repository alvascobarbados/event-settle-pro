import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSetlup } from "@/lib/setlup/store";

const MAGENTA = "#CE1663";
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
  if (/rate limit|too many|429/i.test(msg))
    return "Too many link requests just now — wait a minute and try again.";
  if (/invalid|valid email|unable to validate/i.test(msg)) return "That email doesn't look right.";
  if (/signups? not allowed|disabled/i.test(msg)) return "Sign-ups are closed for this app right now.";
  if (/popup|window|closed|cancel/i.test(msg)) return "Google sign-in was cancelled — try again.";
  if (/network|fetch|offline/i.test(msg)) return "No connection — check your network and try again.";
  return "Something went wrong. Please try again.";
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
    />
    <path
      fill="#FBBC05"
      d="M11.69 28.18A13.5 13.5 0 0 1 10.98 24c0-1.45.25-2.86.71-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
    />
    <path
      fill="#EA4335"
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </svg>
);

function SignIn() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "google" | "link">(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function google() {
    setError(null);
    setBusy("google");
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if ("error" in res && res.error) setError(friendly(res.error.message ?? ""));
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : ""));
    }
    setBusy(null);
  }

  async function sendLink(target?: string) {
    const addr = (target ?? email).trim();
    if (!addr) return;
    setError(null);
    setBusy("link");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(null);
    if (err) {
      setError(friendly(err.message));
      return;
    }
    setSentTo(addr);
    setCooldown(60);
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: MAGENTA }}>
      <div className="flex flex-1 flex-col justify-end px-6 pb-8" style={{ color: INK }}>
        <div
          className="text-[9px] font-extrabold uppercase"
          style={{ letterSpacing: "0.22em", opacity: 0.55 }}
        >
          Event budgeting &amp; reconciliation
        </div>
        <div className="wordmark mt-1 text-[40px] font-black uppercase leading-none">SETLUP</div>
        <p
          className="mt-2 max-w-[32ch] text-[13px] font-semibold leading-snug"
          style={{ opacity: 0.75 }}
        >
          Budget, manage and settle up your events.
        </p>
      </div>

      <div className="rounded-t-[24px] bg-card px-6 pb-10 pt-7 shadow-[0_-12px_40px_rgba(34,26,32,0.18)]">
        {sentTo ? (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] font-bold leading-snug text-ink">
              Link sent to {sentTo} — open it on this device.
            </p>
            <p className="text-[12px] font-semibold text-mute">
              The link may land in spam the first time.
            </p>
            {error && (
              <p className="text-[12.5px] font-semibold" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={cooldown > 0 || busy === "link"}
              onClick={() => sendLink(sentTo)}
              className="h-12 rounded-full text-[13px] font-extrabold uppercase text-white transition-transform active:scale-[0.99] disabled:opacity-50"
              style={{ backgroundColor: MAGENTA, letterSpacing: "0.08em" }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : busy === "link" ? "Sending…" : "Resend link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setError(null);
              }}
              className="w-full text-center text-[12.5px] font-bold text-mute"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={google}
              disabled={busy !== null}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[13.5px] font-extrabold text-ink transition-transform active:scale-[0.99] disabled:opacity-60"
              style={{ border: "1.5px solid var(--hairline)" }}
            >
              <GoogleG />
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1" style={{ backgroundColor: "var(--hairline)" }} />
              <span
                className="text-[10.5px] font-extrabold uppercase text-mute"
                style={{ letterSpacing: "0.12em" }}
              >
                or
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: "var(--hairline)" }} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendLink();
              }}
              className="flex flex-col gap-4"
            >
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
                <span className="text-[11.5px] font-semibold text-mute">
                  The link may land in spam the first time.
                </span>
              </label>

              {error && (
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--red)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy !== null}
                className="h-12 rounded-full text-[13px] font-extrabold uppercase text-white transition-transform active:scale-[0.99] disabled:opacity-60"
                style={{ backgroundColor: MAGENTA, letterSpacing: "0.08em" }}
              >
                {busy === "link" ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          </>
        )}
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
