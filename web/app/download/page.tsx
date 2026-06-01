import Link from 'next/link';
import type { Metadata } from 'next';
import BackgroundFX from '../../components/BackgroundFX';
import DownloadApp from '../../components/DownloadApp';
import Socials from '../../components/Socials';

export const metadata: Metadata = {
  title: 'Download — unknown0 browser',
  description: 'Download the unknown0 private browser. Free for $UNK0 holders.',
};

export default function DownloadPage() {
  return (
    <>
      <BackgroundFX />

      <header className="nav">
        <Link className="brand" href="/">
          <img src="/logo.svg" alt="" className="brand-logo" width={26} height={26} />UNKNOWN0
          <span className="brand-cursor">█</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">home</Link>
          <Link href="/search">search</Link>
          <Socials />
          <span className="nav-cta nav-current">download</span>
        </nav>
      </header>

      <main className="page download-page">
        <p className="eyebrow">// DESKTOP BROWSER · FOR HOLDERS</p>
        <h1 className="search-heading">
          Download <span className="under">unknown0</span>
        </h1>
        <p className="lead search-lead">
          A privacy browser with VPN and private search built in. Free for $UNK0 holders — connect
          your wallet to unlock the download.
        </p>
        <DownloadApp />
      </main>
    </>
  );
}
