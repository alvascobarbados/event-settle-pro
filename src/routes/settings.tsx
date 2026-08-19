import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppBar, PageScroll } from "@/components/setlup/Shell";
import { Field, TextInput } from "@/components/setlup/Sheets";
import { Card, FinePrint, PrimaryButton, SectionLabel } from "@/components/setlup/ui";
import { useSetlup } from "@/lib/setlup/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SETLUP" },
      { name: "description", content: "Business name, reporting currency and VAT rate used across every SETLUP event." },
      { property: "og:title", content: "Settings — SETLUP" },
      { property: "og:description", content: "Business name, reporting currency and VAT rate used across every SETLUP event." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    db,
    updateSettings,
    showToast,
    userEmail,
    signOut,
    resetToSeed,
    promoterCode,
    promoterUsername,
    setUsername,
  } = useSetlup();
  const [business, setBusiness] = useState(db.settings.business);
  const [currency, setCurrency] = useState(db.settings.currency);
  const [username, setUsernameInput] = useState(promoterUsername ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isVerifiedSeedPromoter = promoterCode === "1949AL";


  return (
    <>
      <AppBar />
      <PageScroll>
        <div className="px-4 pb-10 pt-5">
          <h1 className="wide-116 text-[26px] font-black uppercase leading-none text-ink">Settings</h1>

          <div className="mt-5">
            <SectionLabel>Taxonomy</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            <Link
              to="/categories"
              className="flex items-center justify-between px-4 py-4"
            >
              <span>
                <span className="block text-[14.5px] font-bold text-ink">Categories</span>
                <span className="block text-[12px] text-mute">Expense and revenue categories, subcategories, order</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "var(--mute)" }}>
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          </Card>

          <div className="mt-5">
            <SectionLabel>Promoter</SectionLabel>
          </div>
          <Card className="mt-2 px-4 pb-4 pt-1">
            <Field label="Promoter name">
              <TextInput value={business} onChange={(e) => setBusiness(e.target.value)} />
            </Field>
            <Field label="Username">
              <TextInput
                value={username}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="@yourname"
              />
            </Field>
            <Field label="Currency">
              <TextInput value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </Field>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-mute">Promoter code</span>
              <span className="num text-[14.5px] font-bold text-ink">{promoterCode ?? "—"}</span>
            </div>
            <div className="mt-5">
              <PrimaryButton
                onClick={() => {
                  updateSettings({ business: business.trim() || db.settings.business, currency: currency.trim() || db.settings.currency });
                  const next = username.trim().replace(/^@/, "").toLowerCase();
                  if (next !== (promoterUsername ?? "")) {
                    void setUsername(next);
                  } else {
                    showToast("Settings saved");
                  }
                }}
              >
                Save
              </PrimaryButton>
            </div>
          </Card>
          <FinePrint>
            Your promoter code is permanent and identifies your account. The username is optional and yours to claim.
          </FinePrint>


          <div className="mt-6">
            <SectionLabel>Tax</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            <div className="dashed-row flex items-baseline justify-between px-4 py-3.5">
              <span className="text-[14px] font-semibold text-ink">VAT rate</span>
              <span className="num text-[14.5px] font-bold text-ink">{db.settings.vatRate}%</span>
            </div>
            <div className="flex items-baseline justify-between px-4 py-3.5">
              <span className="text-[14px] font-semibold text-ink">Amounts entered</span>
              <span className="text-[13px] font-semibold text-mute">VAT inclusive</span>
            </div>
          </Card>
          <FinePrint>
            Barbados VAT is fixed at 17.5% for this build. Every amount you enter includes VAT; SETLUP extracts the
            VAT within for the return.
          </FinePrint>

          <div className="mt-6">
            <SectionLabel>Account</SectionLabel>
          </div>
          <Card className="mt-2 overflow-hidden">
            <div className="dashed-row flex items-baseline justify-between px-4 py-3.5">
              <span className="text-[14px] font-semibold text-ink">Signed in as</span>
              <span className="text-[13px] font-semibold text-mute">{userEmail ?? "—"}</span>
            </div>
            <div className="dashed-row px-4 py-3.5">
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-[13px] font-bold uppercase tracking-[0.06em]"
                style={{ color: "var(--accent-c)" }}
              >
                Sign out
              </button>
            </div>
            {isVerifiedSeedPromoter && (
              <div className="px-4 py-3.5">
                <button
                  type="button"
                  disabled={resetting}
                  onClick={() => setConfirmReset(true)}
                  className="text-[13px] font-bold uppercase tracking-[0.06em] disabled:opacity-60"
                  style={{ color: "var(--red)" }}
                >
                  {resetting ? "Resetting…" : "Reset data to seed"}
                </button>
              </div>
            )}

          </Card>

          {confirmReset && (
            <>
              <div
                className="fixed inset-0 z-[80]"
                style={{ backgroundColor: "rgba(34,26,32,0.45)" }}
                onClick={() => setConfirmReset(false)}
              />
              <div
                role="dialog"
                aria-label="Reset data to seed"
                className="fixed left-1/2 top-1/2 z-[90] w-[86%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-card p-5"
              >
                <div className="text-[15px] font-extrabold text-ink">Reset data to seed</div>
                <p className="mt-2 text-[13px] leading-snug text-mute">
                  This deletes all your SETLUP data and reloads the verified seed. Uploaded PDFs are removed too.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="h-11 flex-1 rounded-full bg-app text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmReset(false);
                      setResetting(true);
                      await resetToSeed();
                      setResetting(false);
                    }}
                    className="h-11 flex-1 rounded-full text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-white"
                    style={{ backgroundColor: "var(--red)" }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 text-[11.5px] text-mute">SETLUP v1.0 · {db.events.length} events synced to your account</div>
        </div>
      </PageScroll>
    </>
  );
}
