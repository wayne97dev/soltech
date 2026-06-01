import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './config';

const connection = new Connection(config.solanaRpcUrl, 'confirmed');

export interface BalanceResult {
  amount: number; // amount in whole tokens (UI amount)
  decimals: number;
  raw: string; // raw integer as a string
}

/** Sums the balance of a given mint across all of the wallet's token accounts. */
export async function getTokenBalance(wallet: string, mint: string): Promise<BalanceResult> {
  const owner = new PublicKey(wallet);
  const mintPk = new PublicKey(mint);
  const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint: mintPk });

  let amount = 0;
  let decimals = 0;
  let rawTotal = 0n;

  for (const { account } of resp.value) {
    const tokenAmount = (account.data as any).parsed.info.tokenAmount;
    decimals = tokenAmount.decimals;
    rawTotal += BigInt(tokenAmount.amount);
    amount += Number(tokenAmount.uiAmount ?? 0);
  }

  return { amount, decimals, raw: rawTotal.toString() };
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
  if (!config.tokenMint) {
    return { eligible: false, balance: 0, required, reason: 'token-not-configured' };
  }

  const { amount } = await getTokenBalance(wallet, config.tokenMint);
  return { eligible: amount >= required, balance: amount, required };
}

// Short-lived cache so high-frequency endpoints (e.g. search) don't hit the RPC
// on every request. Revocation latency is bounded by the TTL.
const eligibilityCache = new Map<string, { at: number; value: Eligibility }>();
const ELIGIBILITY_TTL_MS = 60_000;

export async function checkEligibilityCached(wallet: string): Promise<Eligibility> {
  const hit = eligibilityCache.get(wallet);
  if (hit && Date.now() - hit.at < ELIGIBILITY_TTL_MS) return hit.value;
  const value = await checkEligibility(wallet);
  eligibilityCache.set(wallet, { at: Date.now(), value });
  return value;
}
