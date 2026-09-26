/**
 * Chave RSA dos JWT da API (RS256).
 *
 * Fonte (nesta ordem):
 *   1. JWT_PRIVATE_KEY      — PEM RSA; aceita quebras de linha reais ou "\n" escapado
 *                             (formato usado no .env: uma linha entre aspas duplas).
 *   2. JWT_PRIVATE_KEY_PATH — caminho de um arquivo PEM fora do Git.
 *
 * Produção (NODE_ENV=production) sem chave => erro na inicialização (fail fast).
 * Dev/test sem chave => chave efêmera em memória (tokens invalidam ao reiniciar).
 * A chave pública (verificação) é derivada da privada.
 *
 * Nunca commitar a chave. Ver docs/pentest/2026-09-26-chave-jwt-exposta.md.
 */
const crypto = require("crypto");
const fs = require("fs");

const JWT_ALGORITHM = "RS256";

let cache = null;

function normalizePem(value) {
  let pem = String(value || "").trim();
  if (
    pem.length >= 2 &&
    ((pem.startsWith('"') && pem.endsWith('"')) ||
      (pem.startsWith("'") && pem.endsWith("'")))
  ) {
    pem = pem.slice(1, -1);
  }
  return `${pem.replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "").trim()}\n`;
}

function readConfiguredPem() {
  const inline = process.env.JWT_PRIVATE_KEY;
  if (inline && inline.trim()) {
    return { pem: normalizePem(inline), source: "JWT_PRIVATE_KEY" };
  }
  const keyPath = process.env.JWT_PRIVATE_KEY_PATH;
  if (keyPath && keyPath.trim()) {
    let content;
    try {
      content = fs.readFileSync(keyPath.trim(), "utf8");
    } catch (err) {
      throw new Error(`[JWT] Não foi possível ler JWT_PRIVATE_KEY_PATH (${keyPath}): ${err.code || err.message}`);
    }
    return { pem: normalizePem(content), source: "JWT_PRIVATE_KEY_PATH" };
  }
  return null;
}

function loadKeys() {
  const configured = readConfiguredPem();

  if (configured) {
    let privateKey;
    try {
      privateKey = crypto.createPrivateKey(configured.pem);
    } catch (err) {
      throw new Error(`[JWT] ${configured.source} inválida (esperado PEM de chave privada RSA).`);
    }
    if (privateKey.asymmetricKeyType !== "rsa") {
      throw new Error(`[JWT] ${configured.source} precisa ser uma chave RSA (${JWT_ALGORITHM}).`);
    }
    return {
      privateKey,
      publicKey: crypto.createPublicKey(privateKey),
      source: configured.source,
      ephemeral: false,
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[JWT] JWT_PRIVATE_KEY não configurada. Em produção a chave RSA é obrigatória (ver docs/deploy-oracle.md)."
    );
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[JWT] JWT_PRIVATE_KEY ausente — usando chave efêmera (tokens invalidam ao reiniciar). Veja docs/deploy-oracle.md para gerar uma."
    );
  }
  return { privateKey, publicKey, source: "ephemeral", ephemeral: true };
}

function getKeys() {
  if (!cache) cache = loadKeys();
  return cache;
}

function getJwtPrivateKey() {
  return getKeys().privateKey;
}

function getJwtPublicKey() {
  return getKeys().publicKey;
}

/** Chamado no boot (src/main.js): em produção derruba o processo se a chave faltar. */
function assertJwtKeyConfigured() {
  const { source, ephemeral } = getKeys();
  return { source, ephemeral };
}

/** Só para testes. */
function resetJwtKeysCache() {
  cache = null;
}

module.exports = {
  JWT_ALGORITHM,
  getJwtPrivateKey,
  getJwtPublicKey,
  assertJwtKeyConfigured,
  resetJwtKeysCache,
  normalizePem,
};