import Link from 'next/link';
import type { Metadata } from 'next';
import BackgroundFX from '../../components/BackgroundFX';
import SearchApp from '../../components/SearchApp';
import Socials from '../../components/Socials';

export const metadata: Metadata = {
  title: 'unknown0 Search — private, no-logs search',
  description: 'Private metasearch for unknown0 holders. No tracking, no ads, no logs.',
};

export default function SearchPage() {
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
          <Link href="/download">download</Link>
          <Socials />
          <span className="nav-cta nav-current">search</span>
        </nav>
      </header>

      <main className="page search-page">
        <SearchApp />
      </main>
    </>
  );
}
