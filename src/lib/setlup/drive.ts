/**
 * Google Drive picker.
 *
 * Scope is drive.file only: the app can read exactly the files the promoter
 * picks in Google's own picker, nothing else in their Drive. The access token
 * lives in this module for the length of the pick and is never persisted.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const MIME_TYPES = "application/pdf,image/jpeg,image/png,image/heic,image/webp";

type AnyWindow = Window & Record<string, any>;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset["loaded"] === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      el.dataset["loaded"] = "1";
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function loadPicker(): Promise<void> {
  const w = window as AnyWindow;
  await loadScript("https://apis.google.com/js/api.js");
  if (w.google?.picker) return;
  await new Promise<void>((resolve, reject) => {
    w.gapi.load("picker", { callback: () => resolve(), onerror: () => reject(new Error("Picker failed to load")) });
  });
}

async function getAccessToken(clientId: string): Promise<string> {
  await loadScript("https://accounts.google.com/gsi/client");
  const w = window as AnyWindow;
  return new Promise<string>((resolve, reject) => {
    const client = w.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (res: { access_token?: string; error?: string }) => {
        if (res.access_token) resolve(res.access_token);
        else reject(new Error(res.error || "Google sign-in was cancelled"));
      },
      error_callback: () => reject(new Error("Google sign-in was cancelled")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

interface PickedDoc {
  id: string;
  name: string;
  mimeType: string;
}

function openPicker(token: string, apiKey: string): Promise<PickedDoc[]> {
  const w = window as AnyWindow;
  const picker = w.google.picker;
  return new Promise<PickedDoc[]>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes(MIME_TYPES)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    const built = new picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setTitle("Choose bills")
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED) {
          resolve(
            (data.docs ?? []).map((d: any) => ({
              id: d.id as string,
              name: (d.name as string) || "Drive file",
              mimeType: (d.mimeType as string) || "application/octet-stream",
            })),
          );
        } else if (data.action === picker.Action.CANCEL) {
          resolve([]);
        }
      })
      .build();
    built.setVisible(true);
  });
}

async function download(doc: PickedDoc, token: string): Promise<File> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Could not download ${doc.name}`);
  const blob = await res.blob();
  return new File([blob], doc.name, { type: doc.mimeType || blob.type });
}

/** Full round trip: Google auth popup → picker → bytes as File objects. */
export async function pickFromDrive(
  clientId: string,
  apiKey: string,
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  await loadPicker();
  const token = await getAccessToken(clientId);
  const docs = await openPicker(token, apiKey);
  const files: File[] = [];
  for (let i = 0; i < docs.length; i++) {
    onProgress?.(i, docs.length);
    files.push(await download(docs[i]!, token));
  }
  onProgress?.(docs.length, docs.length);
  return files;
}
