import Link from 'next/link';
import type { Metadata } from 'next';
import BackgroundFX from '../../components/BackgroundFX';
import SearchApp from '../../components/SearchApp';

export const metadata: Metadata = {
  title: 'SolTech Search — private, no-logs search',
  description: 'Private metasearch for SolTech holders. No tracking, no ads, no logs.',
};

export default function SearchPage() {
  return (
    <>
      <BackgroundFX />

      <header className="nav">
        <Link className="brand" href="/">
          <span className="brand-mark">◢◣</span> SOLTECH<span className="brand-cursor">█</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">home</Link>
          <Link href="/#app">vpn</Link>
          <span className="nav-cta nav-current">search</span>
        </nav>
      </header>

      <main className="page search-page">
        <p className="eyebrow">// PRIVATE SEARCH · NO LOGS</p>
        <h1 className="search-heading">
          SolTech <span className="under">Search</span>
        </h1>
        <p className="lead search-lead">
          Private metasearch, aggregated from 70+ sources. No tracking, no ads, no logs — free for
          SolTech holders.
        </p>
        <SearchApp />
      </main>
    </>
  );
}
