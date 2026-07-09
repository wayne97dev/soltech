/**
 * End-to-end smoke test for the backend (EVM / Robinhood Chain auth).
 * Generates an EVM wallet, runs nonce -> sign -> verify -> status -> provision,
 * and checks that a bad signature is rejected.
 *
 *   npm run smoke        (with the server running on :4000)
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const API = process.env.API ?? 'http://127.0.0.1:4000';

const post = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(`${API}${path}`, {
    method: 'POST',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

async function main() {
  const account = privateKeyToAccount(generatePrivateKey());
  const wallet = account.address;
  console.log('wallet:', wallet);

  console.log('health:', await (await fetch(`${API}/health`)).json());

  const { message } = await (await post('/auth/nonce', { wallet })).json();
  const signature = await account.signMessage({ message });

  const verifyRes = await (await post('/auth/verify', { wallet, message, signature })).json();
  if (!verifyRes.token) throw new Error('verify failed: ' + JSON.stringify(verifyRes));
  const token = verifyRes.token;
  console.log('login OK, token received');

  const auth = { authorization: `Bearer ${token}` };
  console.log('status:', await (await fetch(`${API}/access/status`, { headers: auth })).json());

  const prov = await (await post('/access/provision', null, auth)).json();
  if (!prov.config) throw new Error('provision did not return a config: ' + JSON.stringify(prov));
  console.log('\n--- generated WireGuard config ---\n' + prov.config);

  // Search is public (returns mock results unless SEARXNG_URL is set).
  const sr = await (await fetch(`${API}/search?q=wireguard`, { headers: auth })).json();
  if (!Array.isArray(sr.results)) throw new Error('search did not return results: ' + JSON.stringify(sr));
  console.log(`\nsearch "wireguard": ${sr.results.length} results (source: ${sr.source})`);

  // Negative case: sign a DIFFERENT message with the same key -> must fail (401).
  const { message: m2 } = await (await post('/auth/nonce', { wallet })).json();
  const badSig = await account.signMessage({ message: 'different message' });
  const bad = await post('/auth/verify', { wallet, message: m2, signature: badSig });
  console.log(`\nbad signature -> HTTP ${bad.status} (expected 401)`);
  if (bad.status !== 401) throw new Error('the bad signature was NOT rejected!');

  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((e) => {
  console.error('❌ SMOKE TEST FAILED:', e);
  process.exit(1);
});
