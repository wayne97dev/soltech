import { config } from './config';

// A VPN region = one WireGuard exit node. The API (the "brain") stays central;
// each region is either the local node (runs `wg` on this host) or a remote
// node reached through a small agent over HTTP.
export interface RegionControl {
  kind: 'local' | 'agent' | 'mock';
  url?: string; // agent base URL, e.g. http://1.2.3.4:8787 (kind: agent)
  secret?: string; // agent bearer token (kind: agent)
  iface?: string; // local WireGuard interface (kind: local; default WG_INTERFACE)
}

export interface Region {
  id: string; // short slug, e.g. "de", "us"
  name: string; // "Germany"
  flag: string; // "🇩🇪"
  city: string; // "Frankfurt"
  endpoint: string; // host:port the client connects to
  serverPublicKey: string; // node's WireGuard public key
  clientSubnet: string; // e.g. "10.8.0.0/24" — MUST be unique per region
  dns: string;
  control: RegionControl;
}

// Only the safe, client-facing fields (no secrets).
export interface PublicRegion {
  id: string;
  name: string;
  flag: string;
  city: string;
}

function normalize(r: Region): Region {
  if (!r.id || !r.clientSubnet || !r.endpoint) {
    throw new Error(`Region "${r.id ?? '?'}" is missing id/endpoint/clientSubnet`);
  }
  return {
    ...r,
    name: r.name ?? r.id,
    flag: r.flag ?? '',
    city: r.city ?? '',
    dns: r.dns ?? '1.1.1.1',
    serverPublicKey: r.serverPublicKey ?? '',
    control: r.control ?? { kind: 'mock' },
  };
}

function load(): Region[] {
  const raw = process.env.REGIONS_JSON?.trim();
  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`REGIONS_JSON is not valid JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('REGIONS_JSON must be a non-empty array of regions');
    }
    const list = (parsed as Region[]).map(normalize);
    const subnets = new Set<string>();
    for (const r of list) {
      if (subnets.has(r.clientSubnet)) {
        throw new Error(`Two regions share clientSubnet ${r.clientSubnet} — each region needs its own`);
      }
      subnets.add(r.clientSubnet);
    }
    return list;
  }

  // Backward-compatible fallback: a single region synthesized from the legacy
  // WG_* config, so an unchanged deployment behaves exactly as before.
  const control: RegionControl =
    config.wireguard.provider === 'local'
      ? { kind: 'local', iface: config.wireguard.iface }
      : { kind: 'mock' };
  return [
    {
      id: process.env.PRIMARY_REGION_ID ?? 'de',
      name: process.env.PRIMARY_REGION_NAME ?? 'Germany',
      flag: process.env.PRIMARY_REGION_FLAG ?? '🇩🇪',
      city: process.env.PRIMARY_REGION_CITY ?? 'Frankfurt',
      endpoint: config.wireguard.endpoint,
      serverPublicKey: config.wireguard.serverPublicKey,
      clientSubnet: config.wireguard.clientSubnet,
      dns: config.wireguard.dns,
      control,
    },
  ];
}

let cached: Region[] | null = null;

export function regions(): Region[] {
  if (!cached) cached = load();
  return cached;
}

export function getRegion(id: string): Region | undefined {
  return regions().find((r) => r.id === id);
}

export function defaultRegion(): Region {
  return regions()[0];
}

export function publicRegions(): PublicRegion[] {
  return regions().map(({ id, name, flag, city }) => ({ id, name, flag, city }));
}
