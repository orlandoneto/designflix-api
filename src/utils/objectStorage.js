/**
 * Object storage compartilhado: AWS S3 | Cloudflare R2.
 * Local continua no factory (`STORAGE_TYPE=local`).
 *
 * Env comum:
 *   STORAGE_TYPE / STORAGE_DRIVER = local | s3 | r2
 *
 * AWS S3:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION
 *
 * Cloudflare R2 (S3-compatible):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME (ou AWS_* como fallback)
 *   R2_ACCOUNT_ID e/ou R2_ENDPOINT
 *   R2_PUBLIC_URL — CDN / r2.dev (sem barra final)
 *   Sem R2_PUBLIC_URL → URLs via proxy da API `/storage/<key>` (browser consegue abrir)
 */

const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { isLocalUploadMode } = require('./isLocalUploadMode');

function rawDriver() {
  return String(
    process.env.STORAGE_DRIVER || process.env.STORAGE_TYPE || 's3'
  )
    .toLowerCase()
    .trim();
}

/** @returns {'local'|'s3'|'r2'} */
function getStorageDriver() {
  if (isLocalUploadMode()) return 'local';
  const d = rawDriver();
  if (d === 'r2' || d === 'cloudflare') return 'r2';
  return 's3';
}

function isR2Mode() {
  return getStorageDriver() === 'r2';
}

function getBucketName() {
  if (isR2Mode()) {
    return (
      process.env.R2_BUCKET_NAME ||
      process.env.AWS_BUCKET_NAME ||
      ''
    );
  }
  return process.env.AWS_BUCKET_NAME || '';
}

function getCredentials() {
  if (isR2Mode()) {
    return {
      accessKeyId:
        process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey:
        process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

function getR2Endpoint() {
  if (process.env.R2_ENDPOINT) {
    return String(process.env.R2_ENDPOINT).replace(/\/$/, '');
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) return null;
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getApiPublicBaseUrl() {
  if (process.env.LOCAL_STORAGE_PUBLIC_URL) {
    return String(process.env.LOCAL_STORAGE_PUBLIC_URL).replace(/\/$/, '');
  }
  if (process.env.API_URL) {
    return String(process.env.API_URL).replace(/\/$/, '');
  }
  const port = process.env.NODE_PORT || 3000;
  return `http://localhost:${port}`;
}

/** MIME a partir da extensão (upload de conteúdo / proxy). */
function guessContentType(filenameOrKey) {
  const ext = path.extname(String(filenameOrKey || '')).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',
    '.psd': 'image/vnd.adobe.photoshop',
    '.ai': 'application/postscript',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * URL pública do objeto (thumbs, covers, avatar, zip).
 * R2 sem CDN → proxy `/storage/<key>` para o browser conseguir carregar.
 * @param {string} key
 */
function buildPublicObjectUrl(key) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  if (isR2Mode()) {
    const pub = process.env.R2_PUBLIC_URL || process.env.CDN_PUBLIC_URL;
    if (pub) {
      return `${String(pub).replace(/\/$/, '')}/${cleanKey}`;
    }
    return `${getApiPublicBaseUrl()}/storage/${cleanKey}`;
  }
  const bucket = getBucketName();
  return `https://${bucket}.s3.amazonaws.com/${cleanKey}`;
}

/** Extrai a key a partir de URL S3, CDN R2 ou proxy /storage. */
function extractObjectKeyFromUrl(photoUrl) {
  const url = new URL(photoUrl);
  let key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (key.startsWith('storage/')) {
    key = key.slice('storage/'.length);
  }
  const bucket = getBucketName();
  if (bucket && key.startsWith(`${bucket}/`)) {
    key = key.slice(bucket.length + 1);
  }
  return key;
}

/**
 * Converte URL privada do R2 (endpoint S3) em URL que o browser abre.
 * Usado no catálogo / grid para registros já gravados sem R2_PUBLIC_URL.
 */
function rewriteBrowserAssetUrl(assetUrl) {
  if (!assetUrl || typeof assetUrl !== 'string') return assetUrl;
  if (!assetUrl.includes('.r2.cloudflarestorage.com/')) return assetUrl;
  try {
    const key = extractObjectKeyFromUrl(assetUrl);
    return buildPublicObjectUrl(key);
  } catch {
    return assetUrl;
  }
}

function mapBrowserAssetUrls(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    url_thumb: rewriteBrowserAssetUrl(row.url_thumb),
    url_cover: rewriteBrowserAssetUrl(row.url_cover),
    url: rewriteBrowserAssetUrl(row.url),
    photo: rewriteBrowserAssetUrl(row.photo),
  };
}

/**
 * ACL public-read: AWS S3 aceita; R2 rejeita (acesso via domínio público).
 */
function objectAclIfSupported() {
  return isR2Mode() ? undefined : 'public-read';
}

function assertObjectStorageConfigured() {
  const creds = getCredentials();
  const hasCreds = !!(creds.accessKeyId && creds.secretAccessKey);
  const bucket = getBucketName();
  if (!hasCreds || !bucket) {
    throw new Error(
      'Object storage não configurado (credentials / bucket)'
    );
  }
  if (isR2Mode() && !getR2Endpoint()) {
    throw new Error(
      'R2_ENDPOINT ou R2_ACCOUNT_ID obrigatório quando STORAGE_TYPE=r2'
    );
  }
  if (!isR2Mode()) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    if (!region) {
      throw new Error('AWS_REGION obrigatório quando STORAGE_TYPE=s3');
    }
  }
}

/**
 * Cliente S3-compatible (AWS ou R2).
 * @returns {import('@aws-sdk/client-s3').S3Client}
 */
function createObjectStorageClient(extra = {}) {
  assertObjectStorageConfigured();
  const credentials = getCredentials();
  const insecureTls =
    String(process.env.STORAGE_TLS_INSECURE || process.env.EMAIL_TLS_INSECURE || '')
      .toLowerCase()
      .trim() === 'true';

  let requestHandler;
  if (insecureTls) {
    // Dev Windows / antivírus com SSL inspection: "unable to verify the first certificate"
    const https = require('https');
    const { NodeHttpHandler } = require('@smithy/node-http-handler');
    requestHandler = new NodeHttpHandler({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
  }

  if (isR2Mode()) {
    return new S3Client({
      // R2 só aceita: auto | wnam | enam | weur | eeur | apac | oc
      // NÃO usar AWS_REGION (ex.: sa-east-1)
      region: process.env.R2_REGION || 'auto',
      endpoint: getR2Endpoint(),
      forcePathStyle: true,
      credentials,
      ...(requestHandler ? { requestHandler } : {}),
      ...extra,
    });
  }

  return new S3Client({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    credentials,
    defaultsMode: 'standard',
    ...(requestHandler ? { requestHandler } : {}),
    ...extra,
  });
}

function putObjectParams({ Key, Body, ContentType }) {
  const params = {
    Bucket: getBucketName(),
    Key,
    Body,
    ContentType,
  };
  const acl = objectAclIfSupported();
  if (acl) params.ACL = acl;
  return params;
}

module.exports = {
  getStorageDriver,
  isR2Mode,
  getBucketName,
  getCredentials,
  getR2Endpoint,
  getApiPublicBaseUrl,
  guessContentType,
  buildPublicObjectUrl,
  extractObjectKeyFromUrl,
  rewriteBrowserAssetUrl,
  mapBrowserAssetUrls,
  objectAclIfSupported,
  assertObjectStorageConfigured,
  createObjectStorageClient,
  putObjectParams,
};
