import type { SupabaseClient } from "@supabase/supabase-js";

import type { ScanFields } from "./scan-bill.types";

export type ScanResult = { fields: ScanFields } | { error: string };

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const TIMEOUT_MS = 25_000;

const SCHEMA = {
  type: "object",
  properties: {
    is_bill: { type: "boolean", description: "True only if this document is a vendor invoice, bill or receipt." },
    confidence: { type: "number", description: "0 to 1 overall confidence. Low if the printed numbers do not reconcile." },
    vendor_name: { type: "string", description: "Supplier / vendor name exactly as printed. Empty string if unknown." },
    invoice_number: { type: "string", description: "Invoice or receipt number. Empty string if none." },
    invoice_date: { type: "string", description: "Invoice date as ISO yyyy-mm-dd. Empty string if none." },
    currency: { type: "string", description: "Currency code, e.g. BBD or USD. Empty string if not printed." },
    subtotal: {
      type: "number",
      description: "The printed subtotal / net amount before any VAT line. 0 if the document prints no subtotal.",
    },
    printed_total: {
      type: "number",
      description: "The grand total printed at the foot of the document — the amount payable, exactly as printed.",
    },
    vat_amount: {
      type: ["number", "null"],
      description:
        "The VAT / TAX / V.A.T. / Sales Tax amount PRINTED on the document. null when no such line is printed, when it reads 0.00, or when the document is zero-rated. Never infer, estimate or compute it.",
    },
    vat_treatment: {
      type: "string",
      enum: ["inclusive", "exclusive", "none"],
      description:
        "Classify by arithmetic: 'exclusive' when subtotal + VAT = grand total; 'inclusive' when the grand total equals the subtotal and VAT is shown as included/within; 'none' when no VAT is printed.",
    },
    inclusive_total: {
      type: "number",
      description: "The VAT-inclusive amount payable. In both the exclusive and inclusive patterns this is the grand total.",
    },
    description: { type: "string", description: "Very short description of what was billed (max 6 words)." },
  },
  required: [
    "is_bill",
    "confidence",
    "vendor_name",
    "invoice_number",
    "invoice_date",
    "currency",
    "subtotal",
    "printed_total",
    "vat_amount",
    "vat_treatment",
    "inclusive_total",
    "description",
  ],
  additionalProperties: false,
} as const;

const SYSTEM =
  "You extract fields from Barbados supplier documents. Rules you must obey exactly:\n" +
  "1. VAT is ONLY what is printed on the document. Never infer, estimate or compute VAT the document does not show.\n" +
  "2. A line labelled TAX, V.A.T., VAT or Sales Tax on a Barbados invoice means VAT.\n" +
  "3. A TAX/VAT line of 0.00, a document marked zero-rated, or no VAT line at all → vat_treatment \"none\" and vat_amount null.\n" +
  "4. Classify the VAT pattern by ARITHMETIC, not wording:\n" +
  "   (a) exclusive (most common): subtotal + VAT = grand total → vat_treatment \"exclusive\", inclusive_total = grand total.\n" +
  "   (b) inclusive: the grand total equals the subtotal and VAT is shown as included/within → vat_treatment \"inclusive\", inclusive_total = grand total.\n" +
  "5. Verify the printed numbers against each other. If subtotal, VAT and total do not reconcile, return a low confidence (below 0.6).\n" +
  "6. Money values are plain numbers with no separators or currency symbols.";

const PROMPT =
  "Read this supplier document and extract the fields with the extract_bill tool. Use only what is printed — never invent a value. " +
  "If the document is not a vendor invoice, bill or receipt, set is_bill to false.";

function toBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function mimeOf(path: string, blobType: string): string {
  if (blobType && blobType !== "application/octet-stream") return blobType;
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number) => Math.abs(a - b) <= 0.02;

/**
 * Normalizes the model output so the app's VAT-inclusive storage rule always holds,
 * and re-classifies the treatment from the printed arithmetic when the model disagrees.
 */
function normalize(raw: Record<string, unknown>): ScanFields {
  let treatment = ["inclusive", "exclusive", "none"].includes(String(raw["vat_treatment"]))
    ? (String(raw["vat_treatment"]) as ScanFields["vat_treatment"])
    : "none";
  const printed = num(raw["printed_total"]);
  const subtotalRaw = num(raw["subtotal"]);
  const vatRaw = raw["vat_amount"];
  let vat = vatRaw === null || vatRaw === undefined ? 0 : num(vatRaw);
  let confidence = Math.max(0, Math.min(1, num(raw["confidence"])));

  /* No printed VAT is the only route to "none" — the 17.5% formula never fills a gap. */
  if (vat <= 0) {
    treatment = "none";
    vat = 0;
  } else if (treatment === "none") {
    treatment = subtotalRaw > 0 && near(subtotalRaw, printed) ? "inclusive" : "exclusive";
  }

  let inclusive = printed || r2(subtotalRaw + vat);
  if (treatment === "exclusive") {
    if (subtotalRaw > 0 && near(subtotalRaw + vat, printed)) {
      inclusive = printed;
    } else if (subtotalRaw > 0 && near(subtotalRaw, printed)) {
      /* the printed "total" was the net figure */
      inclusive = r2(printed + vat);
    } else {
      inclusive = printed || r2(subtotalRaw + vat);
      confidence = Math.min(confidence, 0.4);
    }
  } else if (treatment === "inclusive") {
    inclusive = printed;
    if (subtotalRaw > 0 && !near(subtotalRaw, printed)) confidence = Math.min(confidence, 0.4);
  }

  const date = String(raw["invoice_date"] ?? "");
  return {
    is_bill: Boolean(raw["is_bill"]),
    confidence,
    vendor_name: String(raw["vendor_name"] ?? "").trim(),
    invoice_number: String(raw["invoice_number"] ?? "").trim(),
    invoice_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    currency: String(raw["currency"] ?? "").trim(),
    subtotal: treatment === "none" ? inclusive : r2(inclusive - vat),
    printed_total: printed,
    vat_amount: treatment === "none" ? null : vat,
    vat_treatment: treatment,
    inclusive_total: inclusive,
    description: String(raw["description"] ?? "").trim(),
  };
}


export async function scanBillDocument(
  client: SupabaseClient,
  storagePath: string,
  eventId: string,
): Promise<ScanResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { error: "AI is not configured" };

  /* RLS applies: the caller can only download files for events they can access. */
  const owner = await client.from("files").select("id").eq("event_id", eventId).limit(1);
  if (owner.error) return { error: "Not allowed" };

  const dl = await client.storage.from("setlup-files").download(storagePath);
  if (dl.error || !dl.data) return { error: "Could not read the file" };

  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  if (bytes.length === 0) return { error: "The file is empty" };
  const mime = mimeOf(storagePath, dl.data.type);
  const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;
  const filename = storagePath.slice(storagePath.lastIndexOf("/") + 1);

  const content =
    mime === "application/pdf"
      ? [
          { type: "text", text: PROMPT },
          { type: "file", file: { filename, file_data: dataUrl } },
        ]
      : [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ];

  let res: Response;
  try {
    res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        tools: [
          {
            type: "function",
            function: { name: "extract_bill", description: "Return the bill fields.", parameters: SCHEMA },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_bill" } },
      }),
    });
  } catch {
    return { error: "Scan timed out" };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) return { error: "AI is busy — try again in a moment" };
    if (res.status === 402) return { error: "AI credits exhausted" };
    if (res.status === 403) return { error: "AI is unavailable for this workspace" };
    console.error("scan-bill gateway error", res.status, body.slice(0, 400));
    return { error: "Scan unavailable" };
  }

  const json = (await res.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[]; content?: string } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { error: "Scan returned nothing" };
  try {
    return { fields: normalize(JSON.parse(args) as Record<string, unknown>) };
  } catch {
    return { error: "Scan returned nothing" };
  }
}
