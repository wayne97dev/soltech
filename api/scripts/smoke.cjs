/**
 * End-to-end smoke test for the backend.
 * Generates a Solana wallet (ed25519), runs nonce -> sign -> verify -> status -> provision,
 * and checks that a bad signature is rejected.
 *
 *   node scripts/smoke.cjs        (with the server running on :4000)
 *
 * Depends only on tweetnacl (pure CommonJS), no @solana/web3.js.
 */
const nacl = require('tweetnacl');

const API = process.env.API ?? 'http://127.0.0.1:4000';

// base58 encoder (same alphabet used by Solana addresses).
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) str += '1';
  for (let i = digits.length - 1; i >= 0; i--) str += B58[digits[i]];
  return str;
}

const post = (path, body, headers = {}) =>
  fetch(`${API}${path}`, {
    method: 'POST',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

async function main() {
  const kp = nacl.sign.keyPair();
  const wallet = base58(kp.publicKey);
  console.log('wallet:', wallet);

  console.log('health:', await (await fetch(`${API}/health`)).json());

  const { message } = await (await post('/auth/nonce', { wallet })).json();
  const signature = Buffer.from(
    nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey),
  ).toString('base64');

  const verifyRes = await (await post('/auth/verify', { wallet, message, signature })).json();
  if (!verifyRes.token) throw new Error('verify failed: ' + JSON.stringify(verifyRes));
  const token = verifyRes.token;
  console.log('login OK, token received');

  const auth = { authorization: `Bearer ${token}` };
  console.log('status:', await (await fetch(`${API}/access/status`, { headers: auth })).json());

  const prov = await (await post('/access/provision', null, auth)).json();
  if (!prov.config) throw new Error('provision did not return a config: ' + JSON.stringify(prov));
  console.log('\n--- generated WireGuard config ---\n' + prov.config);

  // Token-gated search (returns mock results unless SEARXNG_URL is set).
  const sr = await (await fetch(`${API}/search?q=wireguard`, { headers: auth })).json();
  if (!Array.isArray(sr.results)) throw new Error('search did not return results: ' + JSON.stringify(sr));
  console.log(`\nsearch "wireguard": ${sr.results.length} results (source: ${sr.source})`);

  // Negative case: sign a different message but with a valid nonce -> must fail (401).
  const { message: m2 } = await (await post('/auth/nonce', { wallet })).json();
  const badSig = Buffer.from(
    nacl.sign.detached(new TextEncoder().encode('different message'), kp.secretKey),
  ).toString('base64');
  const bad = await post('/auth/verify', { wallet, message: m2, signature: badSig });
  console.log(`\nbad signature -> HTTP ${bad.status} (expected 401)`);
  if (bad.status !== 401) throw new Error('the bad signature was NOT rejected!');

  console.log('\n✅ SMOKE TEST PASSED');
}

main().catch((e) => {
  console.error('❌ SMOKE TEST FAILED:', e);
  process.exit(1);
});
