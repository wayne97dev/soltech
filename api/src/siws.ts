import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

const DOMAIN = 'SolTech VPN';

/** Costruisce il messaggio leggibile che l'utente firmerà nel wallet. */
export function buildSignInMessage(wallet: string, nonce: string, issuedAt: string): string {
  return [
    `${DOMAIN} wants you to sign in with your Solana account:`,
    wallet,
    '',
    'Firma questo messaggio per dimostrare che il wallet è tuo e sbloccare la VPN.',
    'Questa richiesta non genera transazioni e non ha alcun costo.',
    '',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

/**
 * Verifica una firma ed25519 (Solana) sul messaggio.
 * `signatureB64` è la firma codificata in base64 (vedi frontend).
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
