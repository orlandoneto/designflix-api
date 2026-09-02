#!/usr/bin/env node
/**
 * Reindex full do catálogo no Meilisearch.
 *
 * Uso:
 *   npm run catalog:reindex
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

process.env.CATALOG_SEARCH_PROVIDER = process.env.CATALOG_SEARCH_PROVIDER || 'meilisearch';
process.env.MEILI_HOST = process.env.MEILI_HOST || 'http://127.0.0.1:7700';
process.env.MEILI_MASTER_KEY = process.env.MEILI_MASTER_KEY || 'masterKey';

const {
  UserMainGrid,
  UserMainGridCategories,
  UserMainGridTags,
  Category,
  Tags,
  sequelize,
} = require('../src/models');
const { mapGridToCatalogDocument } = require('../src/services/catalog/catalog-document');
const { ensureIndex, upsertDocuments, pingMeili } = require('../src/services/catalog/meili-client');

async function main() {
  const ok = await pingMeili();
  if (!ok) {
    console.error('Meilisearch indisponível. Rode: npm run meili:up');
    process.exit(1);
  }

  await ensureIndex();
  console.log('Index pronto. Lendo MySQL...');

  const batchSize = 200;
  let offset = 0;
  let total = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await UserMainGrid.findAll({
      where: { activite: 0 },
      include: [
        {
          model: UserMainGridCategories,
          as: 'user_main_grid_categories',
          include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
        },
        {
          model: UserMainGridTags,
          as: 'user_main_grid_tags',
          include: [{ model: Tags, as: 'tag', attributes: ['id', 'name'] }],
        },
      ],
      limit: batchSize,
      offset,
      order: [['id', 'ASC']],
    });

    if (!rows.length) break;

    const docs = rows.map((r) => {
      const doc = mapGridToCatalogDocument(r.get({ plain: true }));
      doc.activite = 0;
      return doc;
    });

    await upsertDocuments(docs);
    total += docs.length;
    offset += batchSize;
    console.log(`Indexed ${total}...`);
  }

  console.log(`Reindex completo: ${total} documentos`);
  await sequelize.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
