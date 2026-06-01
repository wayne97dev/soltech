import Link from 'next/link';
import BackgroundFX from '../components/BackgroundFX';
import Globe from '../components/Globe';
import AccessPanel from '../components/AccessPanel';

const FEATURES = [
  { n: '01', t: 'TOKEN-GATED', d: 'Access tied to token ownership. No cards, no subscriptions.' },
  { n: '02', t: 'ZERO LOG', d: 'No traffic logs. Your activity stays yours alone.' },
  { n: '03', t: 'WIREGUARD', d: 'Modern protocol: fast, lightweight, end-to-end encrypted.' },
  { n: '04', t: 'ON-CHAIN', d: 'Balance verified directly on Solana on every access.' },
];

const STEPS = [
  { n: '01', t: 'Connect your wallet', d: 'Phantom, Solflare or Backpack. One click.' },
  { n: '02', t: 'Sign', d: 'A message proving the wallet is yours. Free, zero gas.' },
  { n: '03', t: 'Hold the token', d: 'As long as you stay above the threshold, the network is yours.' },
  { n: '04', t: 'Connect', d: 'Download the WireGuard config and browse protected.' },
];

export default function Home() {
  return (
    <>
      <BackgroundFX />

      <header className="nav">
        <a className="brand" href="#top">
          <span className="brand-mark">◢◣</span> SOLTECH<span className="brand-cursor">█</span>
        </a>
        <nav className="nav-links">
          <a href="#features">features</a>
          <a href="#how">how it works</a>
          <Link href="/search">search</Link>
          <a className="nav-cta" href="#app">[ launch app ]</a>
        </nav>
      </header>

      <main id="top" className="page">
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">// VPN ON-CHAIN · SOLANA</p>
            <h1 className="title">
              The private network
              <br />
              you <span className="under">own</span>.
            </h1>
            <p className="lead">
              Fast, encrypted, no-logs VPN — free for SolTech token holders.
              No subscriptions: hold the token, own the network.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="#app">[ connect wallet ]</a>
              <a className="btn" href="#how">how it works →</a>
            </div>
            <p className="statusline">
              <span className="blink">●</span> network: 12 nodes online &nbsp;·&nbsp; protocol: wireguard
              &nbsp;·&nbsp; logs: 0
            </p>
          </div>

          <div className="hero-globe">
            <Globe />
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="features">
          <p className="section-label">// why SolTech</p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.n} className="feature">
                <span className="feature-n">{f.n}</span>
                <h3 className="feature-t">{f.t}</h3>
                <p className="feature-d">{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="how">
          <p className="section-label">// how it works</p>
          <h2 className="section-title">From wallet to network in four steps.</h2>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.n} className="step">
                <span className="step-n">{s.n}</span>
                <div>
                  <h3 className="step-t">{s.t}</h3>
                  <p className="step-d">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* APP / ACCESS */}
        <section id="app" className="access">
          <div className="access-copy">
            <p className="section-label">// access the network</p>
            <h2 className="section-title">Connect your wallet and activate the VPN.</h2>
            <p className="lead">
              Eligibility is verified on-chain. If you hold the token, you immediately get your
              WireGuard configuration, ready to import.
            </p>
            <ul className="access-notes">
              <li>→ signing costs no gas and creates no transaction</li>
              <li>→ if you sell the token, access is revoked automatically</li>
            </ul>
          </div>
          <AccessPanel />
        </section>
      </main>

      <footer className="footer">
        <div className="footer-rule">
          {'// ──────────────────────────────────────────────────────────────'}
        </div>
        <div className="footer-row">
          <span className="brand">
            <span className="brand-mark">◢◣</span> SOLTECH
          </span>
          <span className="footer-links">
            <a href="https://github.com/wayne97dev/soltech" target="_blank" rel="noreferrer">
              github
            </a>
            <a href="#features">features</a>
            <a href="#app">access</a>
          </span>
          <span className="footer-meta">built on Solana · © 2026</span>
        </div>
      </footer>
    </>
  );
}
