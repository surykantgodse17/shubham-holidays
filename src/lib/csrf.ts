/** Client copy of the HMAC CSRF token minted with the HttpOnly browser cookie. */
let csrfToken = "";

export function getCsrfToken() {
  return csrfToken;
}

/**
 * Mint / refresh browser session + CSRF.
 * Use POST so browsers always send Origin (GET often omits it; Pi Browser also
 * often omits Sec-Fetch-* — server accepts Referer when Origin is missing).
 */
export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/session", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "ShubhamHolidays",
    },
    body: "{}",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      detail = String(body.error || "").trim();
    } catch {
      /* ignore */
    }
    throw new Error(
      detail || `Could not start browser session (${res.status}). Refresh and try again.`,
    );
  }
  const data = (await res.json().catch(() => ({}))) as { csrf?: string };
  csrfToken = String(data.csrf || "").trim();
  if (!csrfToken) {
    throw new Error("Missing CSRF token. Refresh and try again.");
  }
  return csrfToken;
}
