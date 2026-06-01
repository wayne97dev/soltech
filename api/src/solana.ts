import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './config';

const connection = new Connection(config.solanaRpcUrl, 'confirmed');

export interface BalanceResult {
  amount: number; // quantità in token interi (UI amount)
  decimals: number;
  raw: string; // intero grezzo come stringa
}

/** Somma il saldo di un dato mint su tutti i token account del wallet. */
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

/** Regola centrale: questo wallet ha diritto alla VPN gratis? */
export async function checkEligibility(wallet: string): Promise<Eligibility> {
  const required = config.minTokenBalance;

  // Scorciatoia per lo sviluppo prima che il token esista.
  if (config.devBypassTokenGate) {
    return { eligible: true, balance: required, required, reason: 'dev-bypass' };
  }
  if (!config.tokenMint) {
    return { eligible: false, balance: 0, required, reason: 'token-not-configured' };
  }

  const { amount } = await getTokenBalance(wallet, config.tokenMint);
  return { eligible: amount >= required, balance: amount, required };
}
