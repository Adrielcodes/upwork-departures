import { get, put } from "@vercel/blob";

/**
 * Private Vercel Blob storage for two JSON files:
 *   tokens.json   — Upwork OAuth tokens (never sent to the browser)
 *   snapshot.json — the sanitized board data the public page renders
 */

export const hasStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export async function readJson<T>(pathname: string): Promise<T | null> {
  if (!hasStore()) return null;
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return (await new Response(result.stream).json()) as T;
}

export async function writeJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
