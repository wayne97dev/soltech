import { createPublicClient, defineChain, erc20Abi, formatUnits, http } from 'viem';
import { config } from './config';

// Robinhood Chain — an Arbitrum-stack Ethereum L2. Defined inline so we don't
// depend on viem shipping this chain in its registry yet.
const robinhoodChain = defineChain({
  id: config.chainId,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

const client = createPublicClient({ chain: robinhoodChain, transport: http(config.rpcUrl) });

export interface BalanceResult {
  amount: number; // amount in whole tokens (UI amount)
  decimals: number;
  raw: string; // raw integer as a string
}

/** Reads the wallet's ERC-20 balance of the gate token. */
export async function getTokenBalance(wallet: string, token: string): Promise<BalanceResult> {
  const address = wallet as `0x${string}`;
  const tokenAddress = token as `0x${string}`;

  const [raw, decimals] = await Promise.all([
    client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
  ]);

  const rawBig = raw as bigint;
  const dec = Number(decimals);
  return { amount: Number(formatUnits(rawBig, dec)), decimals: dec, raw: rawBig.toString() };
}

export interface Eligibility {
  eligible: boolean;
  balance: number;
  required: number;
  reason?: string;
}

/** Core rule: is this wallet entitled to free VPN access? */
export async function checkEligibility(wallet: string): Promise<Eligibility> {
  const required = config.minTokenBalance;

  // Shortcut for development, before the token exists.
  if (config.devBypassTokenGate) {
    return { eligible: true, balance: required, required, reason: 'dev-bypass' };
  }
  if (!config.tokenAddress) {
    return { eligible: false, balance: 0, required, reason: 'token-not-configured' };
  }

  const { amount } = await getTokenBalance(wallet, config.tokenAddress);
  return { eligible: amount >= required, balance: amount, required };
}

// Short-lived cache so high-frequency endpoints don't hit the RPC on every
// request. Revocation latency is bounded by the TTL.
const eligibilityCache = new Map<string, { at: number; value: Eligibility }>();
const ELIGIBILITY_TTL_MS = 60_000;

export async function checkEligibilityCached(wallet: string): Promise<Eligibility> {
  const hit = eligibilityCache.get(wallet);
  if (hit && Date.now() - hit.at < ELIGIBILITY_TTL_MS) return hit.value;
  const value = await checkEligibility(wallet);
  eligibilityCache.set(wallet, { at: Date.now(), value });
  return value;
}
