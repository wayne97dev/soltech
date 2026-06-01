import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import nacl from 'tweetnacl';
import { prisma } from './db';
import { config } from './config';

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

// ----- IP allocation (minimal IPAM for a /24) -----

export async function allocateAddress(): Promise<string> {
  const base = config.wireguard.clientSubnet.split('/')[0].split('.').slice(0, 3).join('.'); // e.g. "10.8.0"
  const peers = await prisma.vpnPeer.findMany({ select: { address: true } });
  const used = new Set(peers.map((p) => p.address.split('/')[0]));

  for (let host = 2; host <= 254; host++) {
    const ip = `${base}.${host}`;
    if (!used.has(ip)) return `${ip}/32`;
  }
  throw new Error('No free IP addresses in client subnet');
}

// ----- Provider: adds/removes peers on the WireGuard server -----

export interface WireGuardProvider {
  addPeer(publicKey: string, address: string): Promise<void>;
  removePeer(publicKey: string): Promise<void>;
}

/** Local development: touches no server, just logs. */
class MockWireGuard implements WireGuardProvider {
  async addPeer(publicKey: string, address: string): Promise<void> {
    console.log(`[wg:mock] addPeer ${publicKey.slice(0, 10)}… -> ${address}`);
  }
  async removePeer(publicKey: string): Promise<void> {
    console.log(`[wg:mock] removePeer ${publicKey.slice(0, 10)}…`);
  }
}

/** Production: runs `wg` on the host (the backend runs on the WireGuard server). */
class LocalWireGuard implements WireGuardProvider {
  async addPeer(publicKey: string, address: string): Promise<void> {
    assertWgKey(publicKey);
    const ip = address.split('/')[0];
    await sh(`wg set ${config.wireguard.iface} peer ${publicKey} allowed-ips ${ip}/32`);
    await sh(`wg-quick save ${config.wireguard.iface}`).catch(() => {});
  }
  async removePeer(publicKey: string): Promise<void> {
    assertWgKey(publicKey);
    await sh(`wg set ${config.wireguard.iface} peer ${publicKey} remove`);
    await sh(`wg-quick save ${config.wireguard.iface}`).catch(() => {});
  }
}

export const wireguard: WireGuardProvider =
  config.wireguard.provider === 'local' ? new LocalWireGuard() : new MockWireGuard();

// ----- Client .conf generation -----

export function buildClientConfig(privateKey: string, address: string): string {
  return [
    '[Interface]',
    `PrivateKey = ${privateKey}`,
    `Address = ${address}`,
    `DNS = ${config.wireguard.dns}`,
    '',
    '[Peer]',
    `PublicKey = ${config.wireguard.serverPublicKey}`,
    `Endpoint = ${config.wireguard.endpoint}`,
    'AllowedIPs = 0.0.0.0/0, ::/0',
    'PersistentKeepalive = 25',
  ].join('\n');
}
