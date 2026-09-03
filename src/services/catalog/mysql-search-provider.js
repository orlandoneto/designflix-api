const {
  UserMainGrid,
  UserMainGridCategories,
  UserMainGridTags,
  Category,
  Tags,
  User,
  Sequelize,
  sequelize,
} = require('../../models');
const {
  appendFormatFilter,
  mapGridItemFields,
} = require('../../utils/grid-item');
const { mapBrowserAssetUrls } = require('../../utils/objectStorage');
const {
  normalizeCatalogSearchParams,
  buildBooleanQuery,
  buildOrderSql,
} = require('./catalog-query');

async function resolveCategoryId(params) {
  if (params.categoryId) return params.categoryId;
  if (!params.categorySlug) return null;

  try {
    const rows = await sequelize.query(
      `SELECT id FROM categories
       WHERE slug = :slug
          OR LOWER(REPLACE(name, ' ', '-')) = :slug
          OR LOWER(name) LIKE :nameLike
       LIMIT 1`,
      {
        replacements: {
          slug: params.categorySlug.toLowerCase(),
          nameLike: `%${params.categorySlug}%`,
        },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    return rows[0]?.id ?? null;
  } catch (err) {
    // slug column may not exist yet — fall back to name only
    if (String(err.message || '').includes('slug')) {
      const rows = await sequelize.query(
        `SELECT id FROM categories WHERE LOWER(name) LIKE :nameLike LIMIT 1`,
        {
          replacements: { nameLike: `%${params.categorySlug}%` },
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      return rows[0]?.id ?? null;
    }
    throw err;
  }
}

function mapLightRow(r) {
  let categories = [];
  try {
    categories = r.categories ? JSON.parse(`[${r.categories}]`) : [];
  } catch {
    categories = [];
  }

  return mapBrowserAssetUrls({
    id: r.id,
    name: r.name,
    ...mapGridItemFields(r),
    url_thumb: r.url_thumb,
    url_cover: r.url_cover,
    url: r.url,
    count_download: r.count_download,
    categories,
  });
}

async function search(rawQuery) {
  const params = normalizeCatalogSearchParams(rawQuery);
  const categoryId = await resolveCategoryId(params);

  const whereClauses = ['umg.activite = 0'];
  const replacements = {
    limit: params.limit,
    offset: params.offset,
  };

  if (categoryId) {
    whereClauses.push('umgc.category_id = :categoryId');
    replacements.categoryId = categoryId;
  }

  appendFormatFilter(whereClauses, replacements, params.format);

  if (params.availability) {
    whereClauses.push('umg.availability = :availability');
    replacements.availability = params.availability;
  }

  let hasSearch = false;
  let useFulltext = false;
  if (params.q) {
    hasSearch = true;
    const { booleanQuery, likeQuery, natQuery, hasBoolean } = buildBooleanQuery(params.q);
    replacements.search_nat = natQuery;
    replacements.phrase_like = likeQuery;
    if (hasBoolean) {
      useFulltext = true;
      whereClauses.push('MATCH (umg.terms) AGAINST (:search IN BOOLEAN MODE)');
      replacements.search = booleanQuery;
    } else {
      whereClauses.push('umg.terms LIKE :search_like');
      replacements.search_like = likeQuery;
    }
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;
  const needsCategoryJoin = Boolean(categoryId);
  const categoryJoin = needsCategoryJoin
    ? `INNER JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id`
    : `LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id`;

  const runSearch = async (forceLike) => {
    const localWhere = [...whereClauses];
    const localReplacements = { ...replacements };
    let localHasFulltext = useFulltext && !forceLike;

    if (forceLike && params.q) {
      // remove MATCH clause if present
      const idx = localWhere.findIndex((w) => w.includes('MATCH'));
      if (idx >= 0) {
        localWhere.splice(idx, 1);
        localWhere.push('umg.terms LIKE :search_like');
        localReplacements.search_like = replacements.phrase_like || `%${params.q}%`;
        delete localReplacements.search;
      }
      localHasFulltext = false;
    }

    const localWhereSQL = `WHERE ${localWhere.join(' AND ')}`;
    const countQuery = `
      SELECT COUNT(DISTINCT umg.id) AS total
      FROM user_main_grid umg
      ${needsCategoryJoin ? categoryJoin : ''}
      ${localWhereSQL}
    `;

    const totalResult = await sequelize.query(countQuery, {
      replacements: localReplacements,
      type: Sequelize.QueryTypes.SELECT,
    });
    const total = Number(totalResult[0]?.total || 0);
    const orderSql = buildOrderSql(params.sort, localHasFulltext);

    const query = `
      SELECT
        umg.id,
        umg.name,
        umg.format,
        umg.availability,
        umg.url_thumb,
        umg.url_cover,
        umg.url,
        umg.count_download,
        umg.created_at,
        umg.updated_at,
        ${localHasFulltext ? `MATCH (umg.terms) AGAINST (:search_nat IN NATURAL LANGUAGE MODE) AS score,` : '0 AS score,'}
        ${localHasFulltext ? `CASE WHEN umg.terms LIKE :phrase_like THEN 1 ELSE 0 END AS phrase_hit,` : '0 AS phrase_hit,'}
        GROUP_CONCAT(DISTINCT JSON_OBJECT(
          'id', c.id,
          'name', c.name
        )) AS categories
      FROM user_main_grid umg
      ${categoryJoin}
      LEFT JOIN categories c ON c.id = umgc.category_id
      ${localWhereSQL}
      GROUP BY umg.id
      ORDER BY ${orderSql}
      LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(query, {
      replacements: localReplacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return { total, results };
  };

  let total;
  let results;
  try {
    ({ total, results } = await runSearch(false));
  } catch (err) {
    // FULLTEXT ainda não migrado → fallback LIKE
    if (String(err.message || '').includes("Can't find FULLTEXT") || String(err.message || '').includes('MATCH')) {
      ({ total, results } = await runSearch(true));
    } else {
      throw err;
    }
  }

  return {
    data: results.map(mapLightRow),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit) || 1),
    },
    meta: {
      provider: 'mysql',
      filters: { ...params, categoryId },
    },
  };
}

async function facets(rawQuery) {
  const params = normalizeCatalogSearchParams(rawQuery);
  const categoryId = await resolveCategoryId(params);

  const whereClauses = ['umg.activite = 0'];
  const replacements = {};

  if (categoryId) {
    whereClauses.push(
      `EXISTS (
        SELECT 1 FROM user_main_grid_categories umgc2
        WHERE umgc2.user_main_grid_id = umg.id AND umgc2.category_id = :categoryId
      )`
    );
    replacements.categoryId = categoryId;
  }

  appendFormatFilter(whereClauses, replacements, params.format);

  if (params.availability) {
    whereClauses.push('umg.availability = :availability');
    replacements.availability = params.availability;
  }

  if (params.q) {
    const { booleanQuery, likeQuery, hasBoolean } = buildBooleanQuery(params.q);
    if (hasBoolean) {
      whereClauses.push('MATCH (umg.terms) AGAINST (:search IN BOOLEAN MODE)');
      replacements.search = booleanQuery;
    } else {
      whereClauses.push('umg.terms LIKE :search_like');
      replacements.search_like = likeQuery;
    }
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

  const formats = await sequelize.query(
    `SELECT UPPER(umg.format) AS value, COUNT(*) AS count
     FROM user_main_grid umg
     ${whereSQL}
     AND umg.format IS NOT NULL AND TRIM(umg.format) <> ''
     AND UPPER(umg.format) NOT IN ('GRATIS', 'FILE')
     GROUP BY UPPER(umg.format)
     ORDER BY count DESC
     LIMIT 30`,
    { replacements, type: Sequelize.QueryTypes.SELECT }
  );

  const availability = await sequelize.query(
    `SELECT umg.availability AS value, COUNT(*) AS count
     FROM user_main_grid umg
     ${whereSQL}
     GROUP BY umg.availability
     ORDER BY value ASC`,
    { replacements, type: Sequelize.QueryTypes.SELECT }
  );

  let categories = [];
  try {
    categories = await sequelize.query(
      `SELECT c.id, c.name, c.slug, COUNT(DISTINCT umg.id) AS count
       FROM user_main_grid umg
       INNER JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
       INNER JOIN categories c ON c.id = umgc.category_id
       ${whereSQL}
       GROUP BY c.id, c.name, c.slug
       ORDER BY count DESC
       LIMIT 40`,
      { replacements, type: Sequelize.QueryTypes.SELECT }
    );
  } catch (err) {
    if (String(err.message || '').includes('slug')) {
      categories = await sequelize.query(
        `SELECT c.id, c.name, NULL AS slug, COUNT(DISTINCT umg.id) AS count
         FROM user_main_grid umg
         INNER JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
         INNER JOIN categories c ON c.id = umgc.category_id
         ${whereSQL}
         GROUP BY c.id, c.name
         ORDER BY count DESC
         LIMIT 40`,
        { replacements, type: Sequelize.QueryTypes.SELECT }
      );
    } else {
      throw err;
    }
  }

  return {
    formats: formats.map((r) => ({ value: r.value, count: Number(r.count) })),
    availability: availability.map((r) => ({
      value: r.value,
      count: Number(r.count),
    })),
    categories: categories.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug || null,
      count: Number(r.count),
    })),
  };
}

async function getById(id) {
  const userMainGrid = await UserMainGrid.findOne({
    where: { id, activite: 0 },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'photo', 'partnerCode', 'couponCode'],
      },
      {
        model: UserMainGridCategories,
        as: 'user_main_grid_categories',
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'active'],
          },
        ],
      },
      {
        model: UserMainGridTags,
        as: 'user_main_grid_tags',
        include: [
          {
            model: Tags,
            as: 'tag',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  if (!userMainGrid) return null;

  const plain = userMainGrid.get({ plain: true });
  return mapBrowserAssetUrls({
    id: plain.id,
    contributor_id: plain.user_id,
    contributor_admin_id: plain.admin_id,
    name: plain.name,
    ...mapGridItemFields(plain),
    url_thumb: plain.url_thumb,
    url_cover: plain.url_cover,
    url: plain.url,
    count_download: plain.count_download,
    user: plain.user
      ? {
          id: plain.user.id,
          name: plain.user.name,
          photo: plain.user.photo,
          partnerCode: plain.user.partnerCode,
          couponCode: plain.user.couponCode,
        }
      : null,
    categories: (plain.user_main_grid_categories || []).map((row) => ({
      id: row.category?.id,
      name: row.category?.name,
      active: row.category?.active,
    })),
    tags: (plain.user_main_grid_tags || []).map((row) => ({
      id: row.tag?.id,
      name: row.tag?.name,
    })),
  });
}

module.exports = {
  search,
  facets,
  getById,
  resolveCategoryId,
  mapLightRow,
};
