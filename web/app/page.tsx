import Link from 'next/link';
import BackgroundFX from '../components/BackgroundFX';
import Globe from '../components/Globe';
import AccessPanel from '../components/AccessPanel';
import Socials from '../components/Socials';

// Small Robinhood feather mark (official glyph via Simple Icons), shown next
// to "Robinhood Chain" mentions. Colored via CSS (--accent green).
function RobinhoodMark({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="rh-mark"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.84 24h.53c.096 0 .192-.048.224-.128C7.591 13.696 11.94 8.656 14.67 5.638c.112-.128.064-.225-.096-.225h-4.88a.55.55 0 0 0-.45.225L5.746 9.972c-.514.642-.642 1.236-.642 2.086v4.43c-1.14 3.194-1.862 5.361-2.392 7.32-.032.125.016.192.129.192M20.447.646c-.754-.802-4.157-.834-5.73-.224a3 3 0 0 0-.786.465 41 41 0 0 0-3.323 3.178c-.112.113-.064.225.097.225h5.409c.497 0 .786.289.786.786v6.1c0 .16.128.208.225.064l3.258-4.254c.53-.69.69-.898.835-1.861.192-1.413.08-3.58-.77-4.479m-6.982 16.18 2.231-3.676a.7.7 0 0 0 .064-.29V6.73c0-.16-.112-.225-.224-.097-3.355 3.74-5.971 7.672-8.395 12.407-.06.12.016.225.16.177l5.009-1.54c.565-.174.882-.402 1.155-.852" />
    </svg>
  );
}

const PRODUCTS = [
  {
    n: '01',
    t: 'VPN',
    d: 'Encrypted WireGuard tunnel. Hold the token, get the network — no subscriptions.',
    href: '#app',
    cta: 'activate →',
  },
  {
    n: '02',
    t: 'SEARCH',
    d: 'Private metasearch across 70+ sources. No tracking, no ads, no logs.',
    href: '/search',
    cta: 'search →',
  },
  {
    n: '03',
    t: 'BROWSER',
    d: 'Our desktop browser: tracker blocking, unknown0 Search built in, one-click VPN. mac · win · linux.',
    href: '/download',
    cta: 'download →',
  },
];

const FEATURES = [
  { n: '01', t: 'TOKEN-GATED', d: 'Access tied to token ownership. No cards, no subscriptions.' },
  { n: '02', t: 'ZERO LOG', d: 'No traffic logs. Your activity stays yours alone.' },
  { n: '03', t: 'WIREGUARD', d: 'Modern protocol: fast, lightweight, end-to-end encrypted.' },
  { n: '04', t: 'ON-CHAIN', d: 'Balance verified directly on Robinhood Chain on every access.' },
];

const STEPS = [
  { n: '01', t: 'Connect your wallet', d: 'MetaMask, Rainbow or Robinhood Wallet. One click.' },
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
          <img src="/logo.svg" alt="" className="brand-logo" width={26} height={26} />UNKNOWN0<span className="brand-cursor">█</span>
        </a>
        <nav className="nav-links">
          <a href="#features">features</a>
          <a href="#how">how it works</a>
          <Link href="/search">search</Link>
          <Link href="/download">download</Link>
          <Socials />
          <a className="nav-cta" href="#app">[ launch<span className="cta-word"> app</span> ]</a>
        </nav>
      </header>

      <main id="top" className="page">
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              {'// VPN ON-CHAIN · $UNK0 · '}
              <RobinhoodMark /> ROBINHOOD CHAIN
            </p>
            <h1 className="title">
              The private network
              <br />
              you <span className="under">own</span>.
            </h1>
            <p className="lead">
              Fast, encrypted, no-logs VPN — free for $UNK0 holders.
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
          <p className="section-label">// why unknown0</p>
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

        {/* PRODUCTS */}
        <section id="products" className="products">
          <p className="section-label">// the suite</p>
          <h2 className="section-title">One token. The whole privacy stack.</h2>
          <div className="product-grid">
            {PRODUCTS.map((p) =>
              p.href.startsWith('/') ? (
                <Link key={p.n} className="product" href={p.href}>
                  <span className="feature-n">{p.n}</span>
                  <h3 className="feature-t">{p.t}</h3>
                  <p className="feature-d">{p.d}</p>
                  <span className="product-cta">{p.cta}</span>
                </Link>
              ) : (
                <a key={p.n} className="product" href={p.href}>
                  <span className="feature-n">{p.n}</span>
                  <h3 className="feature-t">{p.t}</h3>
                  <p className="feature-d">{p.d}</p>
                  <span className="product-cta">{p.cta}</span>
                </a>
              ),
            )}
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
            <img src="/logo.svg" alt="" className="brand-logo" width={22} height={22} />UNKNOWN0
          </span>
          <Socials />
          <span className="footer-meta">
            built on <RobinhoodMark size={11} /> Robinhood Chain · © 2026
          </span>
        </div>
      </footer>
    </>
  );
}
