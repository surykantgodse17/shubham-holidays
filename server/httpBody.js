/** Bounded request-body readers for serverless Node handlers and Fetch Request. */

export const BODY_MAX_DEFAULT = 8192;
export const BODY_MAX_SEARCH = 4096;

/**
 * Read a Node IncomingMessage body with a hard byte cap (stops early).
 * @returns {{ ok: true, raw: Buffer } | { ok: false, status: number, error: string }}
 */
export async function readNodeBodyLimited(req, maxBytes = BODY_MAX_DEFAULT) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      return { ok: false, status: 413, error: "Request body too large." };
    }
    chunks.push(buf);
  }
  return { ok: true, raw: Buffer.concat(chunks) };
}

/**
 * Read a web Request body with a hard byte cap.
 * @returns {Promise<{ ok: true, text: string } | { ok: false, response: Response }>}
 */
export async function readWebBodyLimited(request, maxBytes = BODY_MAX_DEFAULT) {
  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > maxBytes) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: "Request body too large." }, { status: 413 }),
    };
  }
  const reader = request.body?.getReader?.();
  if (!reader) {
    return { ok: true, text: "" };
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        return {
          ok: false,
          response: Response.json({ ok: false, error: "Request body too large." }, { status: 413 }),
        };
      }
      chunks.push(Buffer.from(value));
    }
  }
  return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
}
