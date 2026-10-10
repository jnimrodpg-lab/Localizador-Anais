import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import cryptoModule, { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'functions/api/[[path]].js'), 'utf8');
let calls = 0;
const cryptoGuard = {
  getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  subtle: {
    importKey: (...args) => webcrypto.subtle.importKey(...args),
    deriveBits: (algorithm, ...args) => {
      calls += 1;
      assert.ok(algorithm.iterations <= 100000, 'Cloudflare WebCrypto max is 100000 iterations');
      return webcrypto.subtle.deriveBits(algorithm, ...args);
    },
    digest: (...args) => webcrypto.subtle.digest(...args),
  }
};
const context = vm.createContext({
  crypto: cryptoGuard, TextEncoder, Uint8Array, console,
});
vm.runInContext(source.replace('export async function onRequest', 'async function onRequest') + '\n;globalThis.authTest={hashPassword,verifyPassword,passwordHashExceedsRuntimeLimit,passwordHashNeedsUpgrade}', context);
const auth = context.authTest;
const secret = 'Prueba123!muy-segura';
const hash = await auth.hashPassword(secret);
assert.ok(hash.startsWith('pbkdf2-sha256$100000$'), 'Hashes nuevos deben tener 100 000 iteraciones');
assert.equal(await auth.verifyPassword(hash, secret), true);
assert.equal(await auth.verifyPassword(hash, secret + 'x'), false);
assert.equal(auth.passwordHashExceedsRuntimeLimit(hash), false);
assert.equal(auth.passwordHashNeedsUpgrade(hash), false);
// Viejos hashes 150 000: avisar que requieren reseteo, no lanzar excepción 500.
const legacyHigh = hash.replace('$100000$', '$150000$');
assert.equal(auth.passwordHashExceedsRuntimeLimit(legacyHigh), true);
assert.equal(await auth.verifyPassword(legacyHigh, secret), false);
// Compatibilidad con versión SHA-256 heredada y migración al iniciar sesión.
const salt = 'legacy-salt-1234';
const oldHash = cryptoModule.createHash('sha256').update(`${salt}:${secret}`).digest('hex');
assert.equal(await auth.verifyPassword(`${salt}$${oldHash}`, secret), true);
assert.equal(auth.passwordHashNeedsUpgrade(`${salt}$${oldHash}`), true);
assert.equal(auth.passwordHashExceedsRuntimeLimit(`${salt}$${oldHash}`), false);
assert.equal(calls, 3, 'Verificación incompatibles no debería derivar hashes de más de 100k');
console.log('OK autenticación Cloudflare: 100k, credenciales, hash heredado, límite de runtime y recuperación.');
