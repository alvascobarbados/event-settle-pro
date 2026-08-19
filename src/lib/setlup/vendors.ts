import type { Vendor } from "./types";

const SUFFIX = /\b(ltd|limited|inc|incorporated|llc|co|company|corp|corporation|barbados|bdos|the)\b/g;

/** Loose key used to recognise the same vendor across differently punctuated bills. */
export function vendorKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Existing vendor whose name or alias matches the scanned name, else undefined. */
export function matchVendor(vendors: Vendor[], scanned: string): Vendor | undefined {
  const key = vendorKey(scanned);
  if (!key) return undefined;
  return vendors.find(
    (v) => vendorKey(v.name) === key || v.aliases.some((a) => vendorKey(a) === key),
  );
}
