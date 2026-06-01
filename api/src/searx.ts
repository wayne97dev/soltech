import { config } from './config';

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
  source: 'searxng' | 'mock';
}

/**
 * Runs a query against a self-hosted SearXNG instance (privacy meta-search).
 * If SEARXNG_URL is not configured, returns demo results so the UI works in dev.
 */
export async function search(query: string): Promise<SearchResponse> {
  const q = query.trim();
  if (!q) {
    return { query: q, results: [], number_of_results: 0, source: config.searxngUrl ? 'searxng' : 'mock' };
  }

  if (!config.searxngUrl) {
    return mockSearch(q);
  }

  const url = new URL('/search', config.searxngUrl);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`searxng responded ${res.status}`);

  const data = (await res.json()) as { results?: unknown[]; number_of_results?: number };
  const results: SearchResult[] = (data.results ?? []).slice(0, 20).map((r) => {
    const item = r as Record<string, unknown>;
    return {
      title: String(item.title ?? ''),
      url: String(item.url ?? ''),
      content: String(item.content ?? ''),
      engine: String(item.engine ?? ''),
    };
  });

  return {
    query: q,
    results,
    number_of_results: data.number_of_results ?? results.length,
    source: 'searxng',
  };
}

function mockSearch(q: string): SearchResponse {
  const results: SearchResult[] = [
    {
      title: 'unknown0 VPN — private, token-gated VPN',
      url: 'https://github.com/wayne97dev/soltech',
      content: `Demo results for “${q}”. SearXNG is not configured yet (set SEARXNG_URL). Once connected, this returns real, aggregated, no-log results.`,
      engine: 'mock',
    },
    {
      title: 'WireGuard — fast, modern VPN protocol',
      url: 'https://www.wireguard.com',
      content: 'Lean, secure VPN tunnelling — the protocol unknown0 uses for the encrypted connection.',
      engine: 'mock',
    },
    {
      title: 'Solana',
      url: 'https://solana.com',
      content: 'High-performance blockchain. unknown0 reads token balances here to gate access.',
      engine: 'mock',
    },
    {
      title: 'SearXNG — privacy-respecting metasearch engine',
      url: 'https://docs.searxng.org',
      content: 'Open-source metasearch that aggregates 70+ sources with no tracking, ads, or logs.',
      engine: 'mock',
    },
  ];
  return { query: q, results, number_of_results: results.length, source: 'mock' };
}
