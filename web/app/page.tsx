import BackgroundFX from '../components/BackgroundFX';
import Globe from '../components/Globe';
import AccessPanel from '../components/AccessPanel';

const FEATURES = [
  { n: '01', t: 'TOKEN-GATED', d: 'Accesso legato al possesso del token. Niente carte, niente abbonamenti.' },
  { n: '02', t: 'ZERO LOG', d: 'Nessun registro del traffico. La tua attività resta soltanto tua.' },
  { n: '03', t: 'WIREGUARD', d: 'Protocollo moderno: veloce, leggero, cifrato end-to-end.' },
  { n: '04', t: 'ON-CHAIN', d: 'Verifica del saldo direttamente su Solana ad ogni accesso.' },
];

const STEPS = [
  { n: '01', t: 'Connetti il wallet', d: 'Phantom, Solflare o Backpack. Un click.' },
  { n: '02', t: 'Firma', d: 'Un messaggio per provare che il wallet è tuo. Gratis, zero gas.' },
  { n: '03', t: 'Tieni il token', d: 'Finché resti sopra la soglia, la rete è tua.' },
  { n: '04', t: 'Connettiti', d: 'Scarica la config WireGuard e naviga protetto.' },
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
          <a href="#how">come funziona</a>
          <a href="#app">accedi</a>
          <a className="nav-cta" href="#app">[ launch app ]</a>
        </nav>
      </header>

      <main id="top" className="page">
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">// VPN ON-CHAIN · SOLANA</p>
            <h1 className="title">
              La rete privata
              <br />
              che <span className="under">possiedi</span>.
            </h1>
            <p className="lead">
              VPN veloce, cifrata e senza log — gratuita per gli holder del token SolTech.
              Niente abbonamenti: tieni il token, hai la rete.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="#app">[ connetti wallet ]</a>
              <a className="btn" href="#how">come funziona →</a>
            </div>
            <p className="statusline">
              <span className="blink">●</span> rete: 12 nodi online &nbsp;·&nbsp; protocollo: wireguard
              &nbsp;·&nbsp; log: 0
            </p>
          </div>

          <div className="hero-globe">
            <Globe />
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="features">
          <p className="section-label">// perché SolTech</p>
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
          <p className="section-label">// come funziona</p>
          <h2 className="section-title">Dal wallet alla rete in quattro passi.</h2>
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
            <p className="section-label">// accedi alla rete</p>
            <h2 className="section-title">Connetti il wallet e attiva la VPN.</h2>
            <p className="lead">
              L'idoneità viene verificata on-chain. Se tieni il token, ottieni subito la tua
              configurazione WireGuard pronta da importare.
            </p>
            <ul className="access-notes">
              <li>→ la firma non costa gas e non genera transazioni</li>
              <li>→ se vendi il token, l'accesso viene revocato in automatico</li>
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
            <a href="#app">accedi</a>
          </span>
          <span className="footer-meta">costruito su Solana · © 2026</span>
        </div>
      </footer>
    </>
  );
}
