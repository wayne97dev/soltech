import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

const DOMAIN = 'SolTech VPN';

/** Builds the human-readable message the user will sign in their wallet. */
export function buildSignInMessage(wallet: string, nonce: string, issuedAt: string): string {
  return [
    `${DOMAIN} wants you to sign in with your Solana account:`,
    wallet,
    '',
    'Sign this message to prove you own this wallet and unlock token-gated VPN access.',
    'This request will not trigger a transaction or cost any fees.',
    '',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

/**
 * Verifies an ed25519 (Solana) signature over the message.
 * `signatureB64` is the signature encoded as base64 (see the frontend).
 */
export function verifySignature(message: string, signatureB64: string, wallet: string): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = Buffer.from(signatureB64, 'base64');
    const pubkeyBytes = new PublicKey(wallet).toBytes();
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
  } catch {
    return false;
  }
}
