import { jsPDF } from "jspdf";

import { fmtDate, fmtEventNumber, money } from "./format";
import type { VatReport } from "./compute";
import type { Event } from "./types";

/**
 * Clean A4 VAT return. Excluded rows are simply absent — the document carries no
 * word, count or hint that anything was left out.
 */
export function exportVatPdf({
  event,
  promoterName,
  vat,
}: {
  event: Event;
  promoterName: string;
  vat: VatReport;
}): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const right = W - M;
  let y = M;

  const line = () => {
    doc.setDrawColor(220, 214, 218);
    doc.setLineWidth(0.7);
    doc.line(M, y, right, y);
    y += 14;
  };
  const page = () => {
    if (y < doc.internal.pageSize.getHeight() - 70) return;
    doc.addPage();
    y = M;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(206, 22, 99);
  doc.text("SETLUP", M, y);
  doc.setTextColor(34, 26, 32);
  doc.setFontSize(11);
  doc.text("VAT return", right, y, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(promoterName, M, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${event.name}  ${fmtEventNumber(event.number)}`, M, y);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(122, 110, 118);
  doc.text(`As of ${fmtDate(event.asOf)}`, M, y);
  doc.text(`Generated ${fmtDate(new Date().toISOString().slice(0, 10))}`, right, y, { align: "right" });
  doc.setTextColor(34, 26, 32);
  y += 12;
  line();

  const rows = (title: string, list: VatReport["outputRows"], total: number, totalLabel: string) => {
    page();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(title, M, y);
    y += 15;
    doc.setFontSize(8.5);
    doc.setTextColor(122, 110, 118);
    doc.text("DETAIL", M, y);
    doc.text("AMOUNT", right - 110, y, { align: "right" });
    doc.text("VAT", right, y, { align: "right" });
    doc.setTextColor(34, 26, 32);
    y += 6;
    line();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    for (const r of list.filter((x) => !x.excluded)) {
      page();
      const label = [r.line.name, r.detail].filter(Boolean).join(" · ");
      doc.text(doc.splitTextToSize(label, right - M - 190)[0] ?? label, M, y);
      doc.text(money(r.amount), right - 110, y, { align: "right" });
      doc.text(money(r.vat), right, y, { align: "right" });
      y += 15;
    }
    y += 2;
    line();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(totalLabel, M, y);
    doc.text(money(total), right, y, { align: "right" });
    y += 20;
  };

  rows("Output VAT on revenue", vat.outputRows, vat.output, "Output VAT");
  rows("Input VAT on purchases", vat.inputRows, vat.input, "Input VAT");

  page();
  line();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(vat.net >= 0 ? "Net VAT payable" : "Net VAT refundable", M, y);
  doc.text(money(Math.abs(vat.net)), right, y, { align: "right" });
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(122, 110, 118);
  doc.text("VAT within an inclusive amount is computed at 17.5% (amount x 17.5 / 117.5).", M, y);

  const name = `VAT-${event.name.replace(/[^\w]+/g, "-")}-${event.asOf}.pdf`;
  const blob = doc.output("blob");
  const file = typeof File !== "undefined" ? new File([blob], name, { type: "application/pdf" }) : null;
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (file && nav.share && nav.canShare?.({ files: [file] })) {
    void nav.share({ files: [file], title: name }).catch(() => doc.save(name));
    return;
  }
  doc.save(name);
}
