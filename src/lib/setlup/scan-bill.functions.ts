import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const scanBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ storagePath: z.string().min(1), eventId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { scanBillDocument } = await import("./scan-bill.server");
    return scanBillDocument(context.supabase as never, data.storagePath, data.eventId);
  });
