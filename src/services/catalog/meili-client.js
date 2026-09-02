const axios = require('axios');
const { PT_SYNONYMS } = require('./catalog-document');

let indexReady = false;

function meiliConfig() {
  return {
    host: (process.env.MEILI_HOST || 'http://127.0.0.1:7700').replace(/\/$/, ''),
    apiKey: process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || 'masterKey',
    indexUid: process.env.MEILI_INDEX || 'catalog_items',
  };
}

function isMeiliEnabled() {
  const provider = String(process.env.CATALOG_SEARCH_PROVIDER || 'auto').toLowerCase();
  if (provider === 'mysql') return false;
  if (provider === 'meilisearch' || provider === 'meili' || provider === 'auto') {
    return true;
  }
  return Boolean(process.env.MEILI_HOST);
}

function http() {
  const { host, apiKey } = meiliConfig();
  return axios.create({
    baseURL: host,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 5000,
    validateStatus: (s) => s >= 200 && s < 500,
  });
}

async function pingMeili() {
  if (!isMeiliEnabled()) return false;
  try {
    const res = await http().get('/health');
    return res.status === 200 && res.data?.status === 'available';
  } catch {
    return false;
  }
}

async function ensureIndex() {
  if (!isMeiliEnabled()) return null;
  const { indexUid } = meiliConfig();
  const client = http();

  const get = await client.get(`/indexes/${indexUid}`);
  if (get.status === 404) {
    await client.post('/indexes', { uid: indexUid, primaryKey: 'id' });
  }

  if (!indexReady) {
    await client.patch(`/indexes/${indexUid}/settings`, {
      searchableAttributes: ['name', 'terms', 'tags', 'category_names', 'format'],
      filterableAttributes: [
        'format',
        'availability',
        'category_ids',
        'category_slugs',
        'primary_category_slug',
        'activite',
      ],
      sortableAttributes: ['count_download', 'created_at'],
      synonyms: PT_SYNONYMS,
    });
    indexReady = true;
  }

  return indexUid;
}

async function upsertDocuments(docs) {
  if (!docs?.length) return;
  const indexUid = await ensureIndex();
  if (!indexUid) return;
  await http().post(`/indexes/${indexUid}/documents`, docs);
}

async function deleteDocument(id) {
  const indexUid = await ensureIndex();
  if (!indexUid) return;
  await http().delete(`/indexes/${indexUid}/documents/${Number(id)}`);
}

async function searchIndex(query, options = {}) {
  const indexUid = await ensureIndex();
  if (!indexUid) throw new Error('Meili index unavailable');
  const res = await http().post(`/indexes/${indexUid}/search`, {
    q: query || '',
    ...options,
  });
  if (res.status >= 400) {
    throw new Error(res.data?.message || `Meili search HTTP ${res.status}`);
  }
  return res.data;
}

module.exports = {
  meiliConfig,
  isMeiliEnabled,
  ensureIndex,
  pingMeili,
  upsertDocuments,
  deleteDocument,
  searchIndex,
};
