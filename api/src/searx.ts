import { config } from './config';

export type SearchCategory = 'general' | 'images' | 'news' | 'videos';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  img?: string; // thumbnail (for images/videos)
}

export interface SearchResponse {
  query: string;
  category: SearchCategory;
  results: SearchResult[];
  number_of_results: number;
  source: 'searxng' | 'mock';
}

const CATEGORIES: SearchCategory[] = ['general', 'images', 'news', 'videos'];

/**
 * Runs a query against a self-hosted SearXNG instance (privacy meta-search).
 * If SEARXNG_URL is not configured, returns demo results so the UI works in dev.
 */
export async function search(query: string, categoryInput?: string): Promise<SearchResponse> {
  const q = query.trim();
  const category: SearchCategory = CATEGORIES.includes(categoryInput as SearchCategory)
    ? (categoryInput as SearchCategory)
    : 'general';

  if (!q) {
    return { query: q, category, results: [], number_of_results: 0, source: config.searxngUrl ? 'searxng' : 'mock' };
  }
  if (!config.searxngUrl) {
    return { ...mockSearch(q), category };
  }

  const url = new URL('/search', config.searxngUrl);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('categories', category);

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`searxng responded ${res.status}`);

  const data = (await res.json()) as { results?: unknown[]; number_of_results?: number };
  const results: SearchResult[] = (data.results ?? []).slice(0, 30).map((r) => {
    const item = r as Record<string, unknown>;
    const thumb = item.thumbnail_src ?? item.thumbnail ?? item.img_src;
    return {
      title: String(item.title ?? ''),
      url: String(item.url ?? ''),
      content: String(item.content ?? ''),
      engine: String(item.engine ?? ''),
      img: thumb ? String(thumb) : undefined,
    };
  });

  return {
    query: q,
    category,
    results,
    number_of_results: data.number_of_results ?? results.length,
    source: 'searxng',
  };
}

function mockSearch(q: string): SearchResponse {
  const results: SearchResult[] = [
    {
      title: 'unknown0 — private VPN, search and browser',
      url: 'https://unknown0.net',
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
      title: 'SearXNG — privacy-respecting metasearch engine',
      url: 'https://docs.searxng.org',
      content: 'Open-source metasearch that aggregates 70+ sources with no tracking, ads, or logs.',
      engine: 'mock',
    },
  ];
  return { query: q, category: 'general', results, number_of_results: results.length, source: 'mock' };
}
