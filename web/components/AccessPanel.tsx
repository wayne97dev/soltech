'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { status, provision, type AccessStatus } from '../lib/api';
import { requestSignIn } from '../lib/auth';

export default function AccessPanel() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<AccessStatus | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const t = await requestSignIn(address, (message) => signMessageAsync({ message }));
      setToken(t);
      setInfo(await status(t));
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
    a.download = 'unknown0-vpn.conf';
    a.click();
    URL.revokeObjectURL(url);
  }

  const short = info ? `${info.wallet.slice(0, 6)}…${info.wallet.slice(-4)}` : '';

  return (
    <div className="terminal">
      <div className="terminal-bar">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="terminal-title">unknown0 — secure shell</span>
      </div>

      <div className="terminal-body">
        <p className="line">
          <span className="prompt">unknown0@vpn</span>
          <span className="sep">:</span>
          <span className="path">~</span>
          <span className="sep">$</span> ./connect
        </p>

        {!isConnected && (
          <p className="line muted">
            <span className="caret">▏</span> waiting for wallet…
          </p>
        )}

        <div className="terminal-actions">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          {isConnected && !token && (
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
