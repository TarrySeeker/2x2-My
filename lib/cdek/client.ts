import "server-only";

const CDEK_API_URL = process.env.CDEK_API_URL || "https://api.edu.cdek.ru/v2";
const CDEK_CLIENT_ID = process.env.CDEK_CLIENT_ID || "";
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET || "";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(`${CDEK_API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CDEK_CLIENT_ID,
      client_secret: CDEK_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new CdekApiError(`Auth failed: ${res.status}`, res.status, text);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

export function resetTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

export class CdekApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "CdekApiError";
  }
}

interface CdekRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  retried?: boolean;
}

export async function cdekFetch<T = unknown>(
  path: string,
  opts: CdekRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, retried = false } = opts;
  const token = await getToken();

  let url = `${CDEK_API_URL}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried) {
    resetTokenCache();
    return cdekFetch<T>(path, { ...opts, retried: true });
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errMsg = json?.errors?.[0]?.message || `CDEK API error ${res.status}`;
    throw new CdekApiError(errMsg, res.status, JSON.stringify(json));
  }

  return json as T;
}

export function isCdekConfigured(): boolean {
  return Boolean(CDEK_CLIENT_ID && CDEK_CLIENT_SECRET);
}

export { CDEK_API_URL };
