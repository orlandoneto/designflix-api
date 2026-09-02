const { mapGridToCatalogDocument } = require('./catalog-document');
const { upsertDocuments, deleteDocument, isMeiliEnabled, pingMeili } = require('./meili-client');

/**
 * Sync assíncrono MySQL → Meilisearch (não bloqueia upload).
 */
async function syncCatalogDocument(plainOrInstance) {
  try {
    if (!isMeiliEnabled()) return;
    const ok = await pingMeili();
    if (!ok) return;

    const plain =
      typeof plainOrInstance?.get === 'function'
        ? plainOrInstance.get({ plain: true })
        : plainOrInstance;

    if (!plain?.id) return;

    // Só indexa ativos (activite = 0 / false)
    const inactive = plain.activite === true || plain.activite === 1 || plain.activite === '1';
    if (inactive) {
      await deleteDocument(plain.id);
      return;
    }

    const doc = mapGridToCatalogDocument(plain);
    doc.activite = 0;
    await upsertDocuments([doc]);
  } catch (err) {
    console.warn('[catalog-sync]', err.message);
  }
}

async function removeCatalogDocument(id) {
  try {
    if (!isMeiliEnabled()) return;
    if (!(await pingMeili())) return;
    await deleteDocument(id);
  } catch (err) {
    console.warn('[catalog-sync delete]', err.message);
  }
}

module.exports = {
  syncCatalogDocument,
  removeCatalogDocument,
};
