import Link from 'next/link';
import type { Metadata } from 'next';
import BackgroundFX from '../../components/BackgroundFX';
import SwapWidget from '../../components/SwapWidget';
import Socials from '../../components/Socials';

export const metadata: Metadata = {
  title: 'unknown0 Swap — Robinhood Chain',
  description: 'Swap $UNK0 and WETH on Robinhood Chain via Uniswap v3.',
};

export default function SwapPage() {
  return (
    <>
      <BackgroundFX />

      <header className="nav">
        <Link className="brand" href="/">
          <img src="/brand/wordmark.png" alt="unknown0" className="brand-wordmark" />
          <span className="brand-cursor">█</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">home</Link>
          <Link href="/#app">vpn</Link>
          <Link href="/search">search</Link>
          <Link href="/download">download</Link>
          <Socials />
          <span className="nav-cta nav-current">swap</span>
        </nav>
      </header>

      <main className="page swap-page">
        <SwapWidget />
      </main>
    </>
  );
}
