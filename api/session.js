import { ensureBrowserSessionWeb } from "../server/security.js";

/** Mint HttpOnly sh_browser cookie — not an authorization grant. */
export async function GET(request) {
  const { setCookie } = ensureBrowserSessionWeb(request);
  const headers = { "Content-Type": "application/json" };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const request = new Request(url, { method: "GET", headers: req.headers });
  const response = await GET(request);
  const setCookie = response.headers.get("Set-Cookie");
  if (setCookie) res.setHeader("Set-Cookie", setCookie);
  res.status(200).json({ ok: true });
}
