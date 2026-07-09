'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { search as apiSearch, type SearchResponse, type SearchCategory } from '../lib/api';

const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: 'general', label: 'web' },
  { key: 'images', label: 'images' },
  { key: 'news', label: 'news' },
  { key: 'videos', label: 'videos' },
];

// Crypto shortcut: an EVM contract address (0x…) or a $TICKER gets quick links.
type Shortcut =
  | { type: 'ca'; value: string }
  | { type: 'token'; value: string }
  | null;

function detectShortcut(raw: string): Shortcut {
  const s = raw.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return { type: 'ca', value: s };
  if (/^\$[A-Za-z0-9]{2,12}$/.test(s)) return { type: 'token', value: s.slice(1) };
  return null;
}

export default function SearchApp() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<SearchCategory>('general');
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState<Shortcut>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('q');
    const cat = (params.get('category') as SearchCategory) || 'general';
    if (initial) {
      setQ(initial);
      setCategory(cat);
      void run(initial, cat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(query: string, cat: SearchCategory) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setShortcut(detectShortcut(trimmed));
    try {
      const r = await apiSearch(trimmed, cat);
      setRes(r);
      const url = `?q=${encodeURIComponent(trimmed)}&category=${cat}`;
      window.history.replaceState(null, '', url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search error');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(q, category);
  }

  function pickCategory(cat: SearchCategory) {
    setCategory(cat);
    if (res) void run(res.query, cat);
  }

  const hasResults = res !== null;

  // ---- Home (engine landing) ----
  if (!hasResults) {
    return (
      <div className="engine-home">
        <img src="/logo.svg" alt="" className="engine-logo" width={64} height={64} />
        <h1 className="engine-title">
          unknown0 <span className="under">Search</span>
        </h1>
        <form className="search-bar engine-bar" onSubmit={onSubmit}>
          <span className="search-prompt">›</span>
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search privately, or paste a token / contract…"
            autoFocus
            aria-label="search query"
          />
          <button className="btn primary" disabled={busy || !q.trim()}>
            {busy ? '…' : 'search'}
          </button>
        </form>
        <p className="engine-tagline">no logs · no tracking · no ads · our engine</p>
        {error && <p className="line err">✘ {error}</p>}
      </div>
    );
  }

  // ---- Results ----
  return (
    <div className="engine-results">
      <form className="search-bar" onSubmit={onSubmit}>
        <span className="search-prompt">›</span>
        <input
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="search query"
        />
        <button className="btn primary" disabled={busy || !q.trim()}>
          {busy ? '…' : 'search'}
        </button>
      </form>

      <div className="search-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={'search-tab' + (c.key === category ? ' active' : '')}
            onClick={() => pickCategory(c.key)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </div>

      {shortcut && <ShortcutCard shortcut={shortcut} />}

      <p className="search-meta">
        {res.results.length} results · source: {res.source}
      </p>

      {category === 'images' ? (
        <div className="image-grid">
          {res.results
            .filter((r) => r.img)
            .map((r, i) => (
              <a
                key={`${r.url}-${i}`}
                className="image-cell"
                href={r.url}
                target="_blank"
                rel="noreferrer"
                title={r.title}
              >
                <img src={r.img} alt={r.title} loading="lazy" />
              </a>
            ))}
        </div>
      ) : (
        <div className="search-results">
          {res.results.map((r, i) => (
            <article key={`${r.url}-${i}`} className="result">
              <a className="result-title" href={r.url} target="_blank" rel="noreferrer">
                {r.title || r.url}
              </a>
              <span className="result-url">{r.url}</span>
              {r.content && <p className="result-snippet">{r.content}</p>}
              {r.engine && <span className="result-engine">{r.engine}</span>}
            </article>
          ))}
          {res.results.length === 0 && <p className="muted">No results for “{res.query}”.</p>}
        </div>
      )}

      {error && <p className="line err">✘ {error}</p>}
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: NonNullable<Shortcut> }) {
  if (shortcut.type === 'ca') {
    const a = shortcut.value;
    return (
      <div className="shortcut">
        <span className="shortcut-tag">CONTRACT</span>
        <code className="shortcut-val">{a}</code>
        <div className="shortcut-links">
          <a href={`https://dexscreener.com/search?q=${a}`} target="_blank" rel="noreferrer">Dexscreener</a>
          <a href={`https://robinhoodchain.blockscout.com/token/${a}`} target="_blank" rel="noreferrer">Explorer</a>
          <a href={`https://www.geckoterminal.com/search?q=${a}`} target="_blank" rel="noreferrer">GeckoTerminal</a>
        </div>
      </div>
    );
  }
  const t = shortcut.value;
  return (
    <div className="shortcut">
      <span className="shortcut-tag">TOKEN</span>
      <code className="shortcut-val">${t}</code>
      <div className="shortcut-links">
        <a href={`https://dexscreener.com/search?q=${t}`} target="_blank" rel="noreferrer">Dexscreener</a>
        <a href={`https://www.geckoterminal.com/search?q=${t}`} target="_blank" rel="noreferrer">GeckoTerminal</a>
      </div>
    </div>
  );
}
