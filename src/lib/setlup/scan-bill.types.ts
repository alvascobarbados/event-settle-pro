/** Shape the model must return. Never written to the ledger without user confirmation. */
export interface ScanFields {
  is_bill: boolean;
  confidence: number;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  currency: string;
  /** Net of VAT, as printed. Derived as inclusive_total − vat_amount when VAT applies. */
  subtotal: number;
  printed_total: number;
  vat_amount: number | null;
  vat_treatment: "inclusive" | "exclusive" | "none";
  inclusive_total: number;
  description: string;
}
