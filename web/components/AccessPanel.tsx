'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getNonce, verify, status, provision, type AccessStatus } from '../lib/api';

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export default function AccessPanel() {
  const { publicKey, signMessage, connected } = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<AccessStatus | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      const wallet = publicKey.toBase58();
      const { message } = await getNonce(wallet);
      const signature = await signMessage(new TextEncoder().encode(message));
      const res = await verify(wallet, message, toBase64(signature));
      setToken(res.token);
      setInfo(await status(res.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in error');
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await provision(token);
      setConfig(res.config);
      setInfo(await status(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation error');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!config) return;
    const url = URL.createObjectURL(new Blob([config], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soltech-vpn.conf';
    a.click();
    URL.revokeObjectURL(url);
  }

  const short = info ? `${info.wallet.slice(0, 4)}…${info.wallet.slice(-4)}` : '';

  return (
    <div className="terminal">
      <div className="terminal-bar">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="terminal-title">soltech — secure shell</span>
      </div>

      <div className="terminal-body">
        <p className="line">
          <span className="prompt">soltech@vpn</span>
          <span className="sep">:</span>
          <span className="path">~</span>
          <span className="sep">$</span> ./connect
        </p>

        {!connected && (
          <p className="line muted">
            <span className="caret">▏</span> waiting for wallet…
          </p>
        )}

        <div className="terminal-actions">
          <WalletMultiButton />
          {connected && !token && (
            <button className="btn" disabled={busy} onClick={signIn}>
              {busy ? 'signing…' : '[ sign in ]'}
            </button>
          )}
        </div>

        {info && (
          <div className="readout">
            <p className="line">
              <span className="ok">✔</span> wallet&nbsp;&nbsp;&nbsp;&nbsp;<span className="val">{short}</span>
            </p>
            <p className="line">
              <span className="ok">✔</span> balance&nbsp;&nbsp;&nbsp;
              <span className="val">{info.balance}</span> / {info.required} required
            </p>
            <p className="line">
              {info.eligible ? <span className="ok">✔</span> : <span className="no">✘</span>} eligible&nbsp;&nbsp;
              <span className="val">{info.eligible ? 'yes' : 'no'}</span>
            </p>
            <p className="line">
              {info.vpnActive ? <span className="ok">●</span> : <span className="no">○</span>} vpn&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span className="val">{info.vpnActive ? 'active' : 'inactive'}</span>
            </p>

            {info.eligible && !config && (
              <button className="btn primary" disabled={busy} onClick={activate}>
                {busy ? 'provisioning…' : '[ activate vpn ]'}
              </button>
            )}
            {!info.eligible && (
              <p className="line warn">
                ! hold at least {info.required} tokens to unlock the network
              </p>
            )}
          </div>
        )}

        {config && (
          <div className="readout">
            <p className="line muted"># wireguard.conf — import into your client</p>
            <pre className="config">{config}</pre>
            <button className="btn primary" onClick={download}>
              [ download .conf ]
            </button>
          </div>
        )}

        {error && <p className="line err">✘ {error}</p>}
      </div>
    </div>
  );
}
