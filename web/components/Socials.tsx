'use client';

import { useState } from 'react';

// ── Update these for unknown0 / $UNK0 ─────────────────────────────────────────
const TWITTER = 'https://x.com/unk0vpn'; // official unknown0 X account
const CONTRACT = '0x745c1c97551204f10cd5eb51c1b6902fece13b0e'; // $UNK0 on Robinhood Chain
const DEXSCREENER = `https://dexscreener.com/robinhoodchain/${CONTRACT}`;
// ──────────────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DexIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M7 3v18M17 3v18" />
      <rect x="4.5" y="8" width="5" height="7" rx="1" fill="currentColor" stroke="none" />
      <rect x="14.5" y="6" width="5" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function Socials() {
  const [copied, setCopied] = useState(false);

  function copyCA() {
    if (!CONTRACT || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(CONTRACT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <div className="socials">
      <a
        className="social"
        href={TWITTER}
        target="_blank"
        rel="noreferrer"
        title="X / Twitter"
        aria-label="X (Twitter)"
      >
        <XIcon />
      </a>
      <a
        className="social"
        href={DEXSCREENER}
        target="_blank"
        rel="noreferrer"
        title="Dexscreener"
        aria-label="Dexscreener"
      >
        <DexIcon />
      </a>
      <button
        type="button"
        className="social"
        onClick={copyCA}
        title={CONTRACT ? 'Copy contract address' : 'Contract address — coming soon'}
        aria-label="Contract address"
      >
        <CopyIcon />
        <span className="ca-text">{copied ? 'copied' : CONTRACT ? 'CA' : 'CA · soon'}</span>
      </button>
    </div>
  );
}
