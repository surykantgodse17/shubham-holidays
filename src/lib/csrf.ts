/** Client copy of the HMAC CSRF token minted with the HttpOnly browser cookie. */
let csrfToken = "";
/** Same id as Set-Cookie sh_browser — resent as X-Browser-Id when Pi Browser drops cookies. */
let browserId = "";

const BROWSER_ID_KEY = "sh_browser_id";

function readStoredBrowserId(): string {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return String(sessionStorage.getItem(BROWSER_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

function storeBrowserId(id: string) {
  browserId = id;
  if (typeof sessionStorage === "undefined") return;
  try {
    if (id) sessionStorage.setItem(BROWSER_ID_KEY, id);
    else sessionStorage.removeItem(BROWSER_ID_KEY);
  } catch {
    /* private mode */
  }
}

export function getCsrfToken() {
  return csrfToken;
}

export function getBrowserId() {
  return browserId || readStoredBrowserId();
}

export function clearBrowserSession() {
  csrfToken = "";
  storeBrowserId("");
}

/** Headers for cookie-or-header browser session + CSRF. */
export function browserSessionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Requested-With": "ShubhamHolidays",
  };
  const csrf = getCsrfToken();
  const id = getBrowserId();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  if (id) headers["X-Browser-Id"] = id;
  return headers;
}

/**
 * Mint / refresh browser session + CSRF.
 * Returns CSRF; also stores browserId for X-Browser-Id (Pi Browser cookie fallback).
 */
export async function ensureCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken && getBrowserId()) return csrfToken;

  const existingId = getBrowserId();
  const res = await fetch("/api/session", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "ShubhamHolidays",
      ...(existingId ? { "X-Browser-Id": existingId } : {}),
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
    clearBrowserSession();
    throw new Error(
      detail || `Could not start browser session (${res.status}). Refresh and try again.`,
    );
  }
  const data = (await res.json().catch(() => ({}))) as { csrf?: string; browserId?: string };
  csrfToken = String(data.csrf || "").trim();
  const id = String(data.browserId || "").trim();
  if (id) storeBrowserId(id);
  if (!csrfToken || !getBrowserId()) {
    clearBrowserSession();
    throw new Error("Missing browser session token. Refresh and try again.");
  }
  return csrfToken;
}
