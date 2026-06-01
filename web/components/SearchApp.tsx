'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { search as apiSearch, type SearchResponse } from '../lib/api';
import { loadToken, clearToken, requestSignIn } from '../lib/auth';

export default function SearchApp() {
  const { publicKey, signMessage, connected } = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore the session and pick up an initial ?q= (shareable search URLs).
  useEffect(() => {
    const t = loadToken();
    setToken(t);
    const initial = new URLSearchParams(window.location.search).get('q');
    if (initial) {
      setQ(initial);
      if (t) void run(initial, t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(query: string, tok: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      setRes(await apiSearch(tok, trimmed));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search error';
      if (msg === 'unauthorized') {
        clearToken();
        setToken(null);
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      setToken(await requestSignIn(publicKey.toBase58(), signMessage));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in error');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (token) void run(q, token);
  }

  // Signed-out gate.
  if (!token) {
    return (
      <div className="search-gate terminal">
        <div className="terminal-bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="terminal-title">unknown0 — private search</span>
        </div>
        <div className="terminal-body">
          <p className="line">
            <span className="prompt">unknown0@search</span>
            <span className="sep">:</span>
            <span className="path">~</span>
            <span className="sep">$</span> auth required
          </p>
          <p className="line muted">
            Sign in with your wallet to search privately. Free for unknown0 holders.
          </p>
          <div className="terminal-actions">
            <WalletMultiButton />
            {connected && (
              <button className="btn primary" disabled={busy} onClick={signIn}>
                {busy ? 'signing…' : '[ sign in ]'}
              </button>
            )}
          </div>
          {error && <p className="line err">✘ {error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="search-app">
      <form className="search-bar" onSubmit={onSubmit}>
        <span className="search-prompt">›</span>
        <input
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search the web, privately…"
          autoFocus
          aria-label="search query"
        />
        <button className="btn primary" disabled={busy || !q.trim()}>
          {busy ? '…' : 'search'}
        </button>
      </form>

      {res && (
        <div className="search-results">
          <p className="search-meta">
            {res.results.length} results · source: {res.source}
            {res.source === 'mock' ? ' (demo — set SEARXNG_URL for live results)' : ''}
          </p>
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
