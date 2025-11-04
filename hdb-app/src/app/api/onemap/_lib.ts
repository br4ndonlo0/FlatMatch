// Simple OneMap token manager (Node runtime)
export const runtime = "nodejs";

type TokenCache = { token: string; exp: number };
declare global { // eslint-disable-next-line no-var
  var __onemapCache: TokenCache | undefined;
}

async function fetchTokenViaCreds(): Promise<TokenCache> {
  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;
  if (!email || !password) {
    throw new Error("ONEMAP_EMAIL/ONEMAP_PASSWORD not set");
  }
  const resp = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    // OneMap expects JSON body; response typically includes access_token and expiry.
  });
  if (!resp.ok) {
    throw new Error(`getToken failed: ${resp.status} ${resp.statusText}`);
  }
  const j = await resp.json();

  // Try a few common field names
  const token =
    j?.access_token || j?.token || j?.accessToken || j?.jwt || "";
  if (!token) {
    throw new Error("No token in OneMap getToken response");
  }

  // Try to read expiry (seconds) if present; else default ~2.5 days
  const now = Date.now();
  const expSeconds =
    j?.expiry_timestamp || j?.expires_in || j?.expiresIn || 60 * 60 * 60; // ~60h
  const exp = now + Number(expSeconds) * 1000;

  return { token: String(token), exp };
}

export async function getOneMapToken(): Promise<string> {
  // If user provided a static token, prefer it
  const staticToken = process.env.ONEMAP_TOKEN;
  if (staticToken) return staticToken;

  const cache = global.__onemapCache;
  const now = Date.now();
  if (cache && cache.token && cache.exp - now > 60_000) {
    return cache.token;
  }
  const fresh = await fetchTokenViaCreds();
  global.__onemapCache = fresh;
  return fresh.token;
}

/** Fetch wrapper that tries both domains in case Search moved. */
export async function oneMapGET(
  urlPathOrAbsolute: string,
  searchParams?: Record<string, string | number | undefined>
) {
  const token = await getOneMapToken();
  const sp = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([k, v]) => {
    if (v !== undefined) sp.set(k, String(v));
  });

  // Allow absolute URL or path
  const candidates = (() => {
    if (/^https?:\/\//i.test(urlPathOrAbsolute)) return [urlPathOrAbsolute];
    // Try developers.* then www.*
    return [
      `https://developers.onemap.sg${urlPathOrAbsolute}?${sp.toString()}`,
      `https://www.onemap.gov.sg${urlPathOrAbsolute}?${sp.toString()}`
    ];
  })();

  let lastErr: any;
  for (const u of candidates) {
    try {
      const res = await fetch(u, {
        headers: { Authorization: `Bearer ${token}` },
        // Avoid caching sensitive responses
        cache: "no-store",
      });
      if (res.ok) return res;
      // If unauthorized/forbidden, try next candidate
      if (res.status === 401 || res.status === 403) {
        // invalidate cache and retry next
        global.__onemapCache = undefined;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("OneMap request failed");
}