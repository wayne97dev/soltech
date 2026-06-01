import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import nacl from 'tweetnacl';
import { prisma } from './db';
import { config } from './config';

const sh = promisify(exec);

// ----- Chiavi -----

export interface WgKeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Genera una coppia di chiavi WireGuard (Curve25519/X25519).
 * tweetnacl produce chiavi compatibili con WireGuard.
 */
export function generateKeyPair(): WgKeyPair {
  const kp = nacl.box.keyPair();
  return {
    privateKey: Buffer.from(kp.secretKey).toString('base64'),
    publicKey: Buffer.from(kp.publicKey).toString('base64'),
  };
}

/** Una chiave WireGuard valida = 32 byte in base64 (44 char, termina con '='). */
function assertWgKey(key: string): void {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key)) {
    throw new Error('Invalid WireGuard key format');
  }
}

// ----- Allocazione IP (IPAM minimale per un /24) -----

export async function allocateAddress(): Promise<string> {
  const base = config.wireguard.clientSubnet.split('/')[0].split('.').slice(0, 3).join('.'); // es. "10.8.0"
  const peers = await prisma.vpnPeer.findMany({ select: { address: true } });
  const used = new Set(peers.map((p) => p.address.split('/')[0]));

  for (let host = 2; host <= 254; host++) {
    const ip = `${base}.${host}`;
    if (!used.has(ip)) return `${ip}/32`;
  }
  throw new Error('No free IP addresses in client subnet');
}

// ----- Provider: aggiunge/rimuove peer sul server WireGuard -----

export interface WireGuardProvider {
  addPeer(publicKey: string, address: string): Promise<void>;
  removePeer(publicKey: string): Promise<void>;
}

/** Sviluppo locale: non tocca nessun server, logga e basta. */
class MockWireGuard implements WireGuardProvider {
  async addPeer(publicKey: string, address: string): Promise<void> {
    console.log(`[wg:mock] addPeer ${publicKey.slice(0, 10)}… -> ${address}`);
  }
  async removePeer(publicKey: string): Promise<void> {
    console.log(`[wg:mock] removePeer ${publicKey.slice(0, 10)}…`);
  }
}

/** Produzione: esegue `wg` sull'host (il backend gira sul server WireGuard). */
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

// ----- Generazione del file .conf per il client -----

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
