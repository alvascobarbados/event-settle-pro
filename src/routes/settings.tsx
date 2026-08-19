import { createFileRoute } from "@tanstack/react-router";
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
  const { db, updateSettings, showToast } = useSetlup();
  const [business, setBusiness] = useState(db.settings.business);
  const [currency, setCurrency] = useState(db.settings.currency);

  return (
    <>
      <AppBar />
      <PageScroll>
        <div className="px-4 pb-10 pt-5">
          <h1 className="wide-116 text-[26px] font-black uppercase leading-none text-ink">Settings</h1>

          <div className="mt-5">
            <SectionLabel>Business</SectionLabel>
          </div>
          <Card className="mt-2 px-4 pb-4 pt-1">
            <Field label="Business name">
              <TextInput value={business} onChange={(e) => setBusiness(e.target.value)} />
            </Field>
            <Field label="Currency">
              <TextInput value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </Field>
            <div className="mt-5">
              <PrimaryButton
                onClick={() => {
                  updateSettings({ business: business.trim() || db.settings.business, currency: currency.trim() || db.settings.currency });
                  showToast("Settings saved");
                }}
              >
                Save
              </PrimaryButton>
            </div>
          </Card>

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

          <div className="mt-6 text-[11.5px] text-mute">SETLUP v1.0 · {db.events.length} events on this device</div>
        </div>
      </PageScroll>
    </>
  );
}
