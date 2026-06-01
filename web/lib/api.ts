const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AccessStatus {
  wallet: string;
  eligible: boolean;
  balance: number;
  required: number;
  reason?: string;
  vpnActive: boolean;
}

export interface VpnConfig {
  config: string;
  address: string;
  publicKey: string;
}

async function asJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function getNonce(wallet: string): Promise<{ message: string; nonce: string }> {
  return asJson(
    await fetch(`${API}/auth/nonce`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wallet }),
    }),
  );
}

export async function verify(
  wallet: string,
  message: string,
  signature: string,
): Promise<{ token: string }> {
  return asJson(
    await fetch(`${API}/auth/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wallet, message, signature }),
    }),
  );
}

export async function status(token: string): Promise<AccessStatus> {
  return asJson(await fetch(`${API}/access/status`, { headers: auth(token) }));
}

export async function provision(token: string): Promise<VpnConfig> {
  return asJson(
    await fetch(`${API}/access/provision`, { method: 'POST', headers: auth(token) }),
  );
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  number_of_results: number;
  source: string;
}

export async function search(token: string, q: string): Promise<SearchResponse> {
  return asJson(
    await fetch(`${API}/search?q=${encodeURIComponent(q)}`, { headers: auth(token) }),
  );
}

export interface Downloads {
  mac: string | null;
  win: string | null;
  linux: string | null;
}

export async function getDownloads(token: string): Promise<Downloads> {
  return asJson(await fetch(`${API}/download`, { headers: auth(token) }));
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}
