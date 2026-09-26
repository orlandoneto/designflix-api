/**
 * Chave JWT via env — docs/pentest/2026-09-26-chave-jwt-exposta.md
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ENV_KEYS = ['JWT_PRIVATE_KEY', 'JWT_PRIVATE_KEY_PATH', 'NODE_ENV'];

function newPem() {
  return crypto
    .generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs8', format: 'pem' });
}

describe('jwtKeys', () => {
  let saved;
  let jwtKeys;

  beforeEach(() => {
    saved = {};
    ENV_KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    jwtKeys = require('../../src/utils/jwtKeys');
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('aceita PEM em uma linha com \\n escapado (formato do .env)', () => {
    const pem = newPem();
    process.env.JWT_PRIVATE_KEY = `"${pem.trim().replace(/\n/g, '\\n')}"`;

    const token = jwt.sign({ id: 1 }, jwtKeys.getJwtPrivateKey(), { algorithm: 'RS256' });
    const decoded = jwt.verify(token, jwtKeys.getJwtPublicKey(), { algorithms: ['RS256'] });

    expect(decoded.id).toBe(1);
    expect(jwtKeys.assertJwtKeyConfigured()).toEqual({ source: 'JWT_PRIVATE_KEY', ephemeral: false });
    // a chave derivada é a mesma do PEM configurado
    const expectedPub = crypto.createPublicKey(pem).export({ type: 'spki', format: 'pem' });
    expect(jwtKeys.getJwtPublicKey().export({ type: 'spki', format: 'pem' })).toBe(expectedPub);
  });

  it('aceita PEM com quebras de linha reais', () => {
    process.env.JWT_PRIVATE_KEY = newPem();
    expect(jwtKeys.assertJwtKeyConfigured().ephemeral).toBe(false);
  });

  it('produção sem chave falha com mensagem clara', () => {
    process.env.NODE_ENV = 'production';
    expect(() => jwtKeys.assertJwtKeyConfigured()).toThrow(/JWT_PRIVATE_KEY não configurada/);
  });

  it('chave inválida falha sem vazar o conteúdo', () => {
    process.env.JWT_PRIVATE_KEY = 'nao-e-um-pem-segredo123';
    let message = '';
    try {
      jwtKeys.assertJwtKeyConfigured();
    } catch (err) {
      message = err.message;
    }
    expect(message).toMatch(/JWT_PRIVATE_KEY inválida/);
    expect(message).not.toContain('segredo123');
  });

  it('dev/test sem chave usa chave efêmera', () => {
    expect(jwtKeys.assertJwtKeyConfigured()).toEqual({ source: 'ephemeral', ephemeral: true });
  });

  it('token assinado com outra chave é rejeitado', () => {
    process.env.JWT_PRIVATE_KEY = newPem();
    const forged = jwt.sign({ id: 1 }, crypto.createPrivateKey(newPem()), { algorithm: 'RS256' });
    expect(() => jwt.verify(forged, jwtKeys.getJwtPublicKey(), { algorithms: ['RS256'] })).toThrow();
  });
});