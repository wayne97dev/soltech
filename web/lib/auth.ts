import { getNonce, verify } from './api';

const TOKEN_KEY = 'soltech.token';

export function loadToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Full Sign-in with Solana flow: nonce -> sign -> verify.
 * Persists the JWT (so it works across pages) and returns it.
 */
export async function requestSignIn(
  wallet: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<string> {
  const { message } = await getNonce(wallet);
  const signature = await signMessage(new TextEncoder().encode(message));
  const { token } = await verify(wallet, message, toBase64(signature));
  saveToken(token);
  return token;
}
