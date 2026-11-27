/** Client copy of the HMAC CSRF token minted with the HttpOnly browser cookie. */
let csrfToken = "";

export function getCsrfToken() {
  return csrfToken;
}

/** Fetch /api/session so checkout/pay POSTs can send X-CSRF-Token. */
export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/session", {
    credentials: "include",
    cache: "no-store",
    headers: { "X-Requested-With": "ShubhamHolidays" },
  });
  if (!res.ok) {
    throw new Error("Could not start browser session. Refresh and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as { csrf?: string };
  csrfToken = String(data.csrf || "").trim();
  if (!csrfToken) {
    throw new Error("Missing CSRF token. Refresh and try again.");
  }
  return csrfToken;
}
