import { getNonce, verify } from './api';

const TOKEN_KEY = 'unknown0.token';

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

/**
 * Full Sign-in with Ethereum flow: nonce -> sign -> verify.
 * `signMessage` returns the wallet's 0x-prefixed signature over the message.
 * Persists the JWT (so it works across pages) and returns it.
 */
export async function requestSignIn(
  wallet: string,
  signMessage: (message: string) => Promise<string>,
): Promise<string> {
  const { message } = await getNonce(wallet);
  const signature = await signMessage(message);
  const { token } = await verify(wallet, message, signature);
  saveToken(token);
  return token;
}
