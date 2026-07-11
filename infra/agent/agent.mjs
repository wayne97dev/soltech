#!/usr/bin/env node
// unknown0 region agent — a tiny, dependency-free HTTP service that runs on a
// remote VPN node. The central API calls it to add/remove WireGuard peers on
// this node. It never talks to the chain or the DB; it only manages `wg`.
//
// Security: every /peer call must carry `Authorization: Bearer $AGENT_SECRET`.
// Inputs are strictly validated and `wg` is invoked via execFile (argv, no
// shell) so a peer key can never inject a command. Lock it down further with
// ufw so only the API server's IP can reach AGENT_PORT.
//
// Env: AGENT_SECRET (required), AGENT_PORT (default 8787), WG_INTERFACE (wg0).

import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const SECRET = process.env.AGENT_SECRET || '';
const PORT = parseInt(process.env.AGENT_PORT || '8787', 10);
const IFACE = process.env.WG_INTERFACE || 'wg0';

if (!SECRET || SECRET.length < 16) {
  console.error('[agent] refusing to start: set AGENT_SECRET to a long random string');
  process.exit(1);
}

const WG_KEY = /^[A-Za-z0-9+/]{43}=$/;
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;

function send(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => {
      buf += c;
      if (buf.length > 4096) req.destroy(); // no huge bodies
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

async function addPeer(publicKey, address) {
  const ip = String(address).split('/')[0];
  if (!IPV4.test(ip)) throw new Error('bad address');
  await run('wg', ['set', IFACE, 'peer', publicKey, 'allowed-ips', `${ip}/32`]);
  await run('wg-quick', ['save', IFACE]).catch(() => {});
}

async function removePeer(publicKey) {
  await run('wg', ['set', IFACE, 'peer', publicKey, 'remove']);
  await run('wg-quick', ['save', IFACE]).catch(() => {});
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, iface: IFACE });
  }

  if (req.url !== '/peer') return send(res, 404, { error: 'not-found' });

  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${SECRET}`) return send(res, 401, { error: 'unauthorized' });

  const body = await readJson(req);
  if (!body || typeof body.publicKey !== 'string' || !WG_KEY.test(body.publicKey)) {
    return send(res, 400, { error: 'bad-public-key' });
  }

  try {
    if (req.method === 'POST') {
      await addPeer(body.publicKey, body.address);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      await removePeer(body.publicKey);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method-not-allowed' });
  } catch (e) {
    console.error('[agent] error:', e.message);
    return send(res, 500, { error: 'wg-failed' });
  }
});

server.listen(PORT, () => {
  console.log(`[agent] unknown0 region agent on :${PORT} (iface ${IFACE})`);
});
