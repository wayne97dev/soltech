'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getDownloads, type Downloads } from '../lib/api';
import { loadToken, clearToken, requestSignIn } from '../lib/auth';

const PLATFORMS: { key: keyof Downloads; label: string; sub: string }[] = [
  { key: 'mac', label: 'macOS', sub: 'Apple silicon / Intel · .dmg' },
  { key: 'win', label: 'Windows', sub: '.exe installer' },
  { key: 'linux', label: 'Linux', sub: '.AppImage' },
];

export default function DownloadApp() {
  const { publicKey, signMessage, connected } = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [dl, setDl] = useState<Downloads | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = loadToken();
    setToken(t);
    if (t) void load(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(tok: string) {
    setBusy(true);
    setError(null);
    try {
      setDl(await getDownloads(tok));
      setEligible(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error';
      if (msg === 'unauthorized') {
        clearToken();
        setToken(null);
      } else if (msg === 'not-eligible') {
        setEligible(false);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      const t = await requestSignIn(publicKey.toBase58(), signMessage);
      setToken(t);
      await load(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in error');
    } finally {
      setBusy(false);
    }
  }

  // Signed out → gate.
  if (!token) {
    return (
      <div className="terminal dl-gate">
        <div className="terminal-bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="terminal-title">unknown0 — download</span>
        </div>
        <div className="terminal-body">
          <p className="line">
            <span className="prompt">unknown0@download</span>
            <span className="sep">:</span>
            <span className="path">~</span>
            <span className="sep">$</span> auth required
          </p>
          <p className="line muted">
            Sign in with your wallet to unlock the download. Free for $UNK0 holders.
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

  // Signed in but not a holder.
  if (eligible === false) {
    return (
      <div className="dl-notice">
        <p className="line warn">! hold $UNK0 to unlock the download</p>
        <p className="muted">The unknown0 browser is free for token holders.</p>
      </div>
    );
  }

  // Eligible → platform downloads.
  return (
    <div className="download-grid">
      {PLATFORMS.map((p) => {
        const url = dl?.[p.key] ?? null;
        return (
          <div key={p.key} className="dl-card">
            <span className="dl-os">{p.label}</span>
            <span className="dl-sub">{p.sub}</span>
            {url ? (
              <a className="btn primary" href={url} target="_blank" rel="noreferrer">
                download
              </a>
            ) : (
              <span className="dl-soon">coming soon</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
