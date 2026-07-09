import { verifyMessage } from 'viem';

const DOMAIN = 'unknown0 VPN';

/** Builds the human-readable message the user will sign in their wallet. */
export function buildSignInMessage(wallet: string, nonce: string, issuedAt: string): string {
  return [
    `${DOMAIN} wants you to sign in with your Ethereum account:`,
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
 * Verifies an EVM personal_sign (EIP-191) signature over the message.
 * `signatureHex` is the 0x-prefixed signature the wallet returns (see the frontend).
 * Async because viem also validates smart-contract (EIP-1271) wallets.
 */
export async function verifySignature(
  message: string,
  signatureHex: string,
  wallet: string,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature: signatureHex as `0x${string}`,
    });
  } catch {
    return false;
  }
}
