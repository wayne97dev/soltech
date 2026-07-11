import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import nacl from 'tweetnacl';
import { prisma } from './db';
import { config } from './config';
import type { Region } from './regions';

const sh = promisify(exec);

// ----- Keys -----

export interface WgKeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Generates a WireGuard key pair (Curve25519/X25519).
 * tweetnacl produces keys that are compatible with WireGuard.
 */
export function generateKeyPair(): WgKeyPair {
  const kp = nacl.box.keyPair();
  return {
    privateKey: Buffer.from(kp.secretKey).toString('base64'),
    publicKey: Buffer.from(kp.publicKey).toString('base64'),
  };
}

/** A valid WireGuard key = 32 bytes in base64 (44 chars, ends with '='). */
function assertWgKey(key: string): void {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key)) {
    throw new Error('Invalid WireGuard key format');
  }
}

// ----- IP allocation (minimal IPAM, per region /24) -----

export async function allocateAddress(region: Region): Promise<string> {
  const base = region.clientSubnet.split('/')[0].split('.').slice(0, 3).join('.'); // e.g. "10.8.0"
  const peers = await prisma.vpnPeer.findMany({
    where: { region: region.id },
    select: { address: true },
  });
  const used = new Set(peers.map((p) => p.address.split('/')[0]));

  for (let host = 2; host <= 254; host++) {
    const ip = `${base}.${host}`;
    if (!used.has(ip)) return `${ip}/32`;
  }
  throw new Error(`No free IP addresses in region ${region.id} (${region.clientSubnet})`);
}

// ----- Providers: add/remove peers on a region's WireGuard node -----

export interface WireGuardProvider {
  addPeer(publicKey: string, address: string): Promise<void>;
  removePeer(publicKey: string): Promise<void>;
}

/** Local development / unconfigured region: touches no server, just logs. */
class MockWireGuard implements WireGuardProvider {
  async addPeer(publicKey: string, address: string): Promise<void> {
    console.log(`[wg:mock] addPeer ${publicKey.slice(0, 10)}… -> ${address}`);
  }
  async removePeer(publicKey: string): Promise<void> {
    console.log(`[wg:mock] removePeer ${publicKey.slice(0, 10)}…`);
  }
}

/** The node co-located with the API: run `wg` directly on this host. */
class LocalWireGuard implements WireGuardProvider {
  constructor(private iface: string) {}
  async addPeer(publicKey: string, address: string): Promise<void> {
    assertWgKey(publicKey);
    const ip = address.split('/')[0];
    await sh(`wg set ${this.iface} peer ${publicKey} allowed-ips ${ip}/32`);
    await sh(`wg-quick save ${this.iface}`).catch(() => {});
  }
  async removePeer(publicKey: string): Promise<void> {
    assertWgKey(publicKey);
    await sh(`wg set ${this.iface} peer ${publicKey} remove`);
    await sh(`wg-quick save ${this.iface}`).catch(() => {});
  }
}

/** A remote region node: drive its unknown0-agent over HTTP. */
class AgentWireGuard implements WireGuardProvider {
  constructor(private url: string, private secret: string) {}
  async addPeer(publicKey: string, address: string): Promise<void> {
    assertWgKey(publicKey);
    await this.call('POST', { publicKey, address });
  }
  async removePeer(publicKey: string): Promise<void> {
    assertWgKey(publicKey);
    await this.call('DELETE', { publicKey });
  }
  private async call(method: 'POST' | 'DELETE', body: unknown): Promise<void> {
    const res = await fetch(`${this.url.replace(/\/$/, '')}/peer`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`region agent ${this.url} responded ${res.status}`);
    }
  }
}

export function providerForRegion(region: Region): WireGuardProvider {
  switch (region.control.kind) {
    case 'local':
      return new LocalWireGuard(region.control.iface ?? config.wireguard.iface);
    case 'agent':
      if (!region.control.url || !region.control.secret) {
        throw new Error(`region ${region.id}: agent control needs url + secret`);
      }
      return new AgentWireGuard(region.control.url, region.control.secret);
    default:
      return new MockWireGuard();
  }
}

// ----- Client .conf generation -----

export function buildClientConfig(region: Region, privateKey: string, address: string): string {
  return [
    `# unknown0 VPN — ${region.name}`,
    '[Interface]',
    `PrivateKey = ${privateKey}`,
    `Address = ${address}`,
    `DNS = ${region.dns}`,
    '',
    '[Peer]',
    `PublicKey = ${region.serverPublicKey}`,
    `Endpoint = ${region.endpoint}`,
    'AllowedIPs = 0.0.0.0/0, ::/0',
    'PersistentKeepalive = 25',
  ].join('\n');
}
