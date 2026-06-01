/**
 * Smoke test end-to-end del backend.
 * Genera un wallet Solana (ed25519), esegue nonce -> firma -> verifica -> status -> provision,
 * e controlla che una firma sbagliata venga rifiutata.
 *
 *   node scripts/smoke.cjs        (con il server avviato su :4000)
 *
 * Dipende solo da tweetnacl (CommonJS puro), senza @solana/web3.js.
 */
const nacl = require('tweetnacl');

const API = process.env.API ?? 'http://127.0.0.1:4000';

// Encoder base58 (stesso alfabeto usato dagli indirizzi Solana).
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
  if (!verifyRes.token) throw new Error('verify fallita: ' + JSON.stringify(verifyRes));
  const token = verifyRes.token;
  console.log('login OK, token ricevuto');

  const auth = { authorization: `Bearer ${token}` };
  console.log('status:', await (await fetch(`${API}/access/status`, { headers: auth })).json());

  const prov = await (await post('/access/provision', null, auth)).json();
  if (!prov.config) throw new Error('provision non ha restituito una config: ' + JSON.stringify(prov));
  console.log('\n--- config WireGuard generata ---\n' + prov.config);

  // Negativo: firma di un messaggio diverso ma con un nonce valido -> deve fallire (401).
  const { message: m2 } = await (await post('/auth/nonce', { wallet })).json();
  const badSig = Buffer.from(
    nacl.sign.detached(new TextEncoder().encode('messaggio diverso'), kp.secretKey),
  ).toString('base64');
  const bad = await post('/auth/verify', { wallet, message: m2, signature: badSig });
  console.log(`\nfirma errata -> HTTP ${bad.status} (atteso 401)`);
  if (bad.status !== 401) throw new Error('la firma errata NON e stata rifiutata!');

  console.log('\n✅ SMOKE TEST PASSATO');
}

main().catch((e) => {
  console.error('❌ SMOKE TEST FALLITO:', e);
  process.exit(1);
});
