import { createServerFn } from "@tanstack/react-start";

/**
 * Google Picker needs its client id + API key in the browser. They are
 * public-by-design values, but they are stored as project secrets, so the
 * browser asks the server for them at runtime.
 */
export const getDriveConfig = createServerFn({ method: "GET" }).handler(async () => {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"] ?? "";
  const apiKey = process.env["GOOGLE_API_KEY"] ?? "";
  return { clientId, apiKey, configured: !!clientId && !!apiKey };
});
