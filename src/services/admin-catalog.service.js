/**
 * Catálogo admin: listar / desabilitar / remover itens do grid.
 * Desabilitar → activite=1 (some da Flix, arquivos no R2 ficam).
 * Remover → hard delete MySQL + Meili + objetos R2.
 *
 * @see docs/contextos/admin-catalog.md
 */

const { Op } = require('sequelize');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const {
  UserMainGrid,
  User,
  UserFavorites,
  UserLikes,
  UserDownloads,
  UserFileRatings,
} = require('../models');
const {
  ok,
  badRequest,
  notFound,
  serverError,
} = require('../utils/httpResponse');
const {
  createObjectStorageClient,
  getBucketName,
  extractObjectKeyFromUrl,
  rewriteBrowserAssetUrl,
  assertObjectStorageConfigured,
} = require('../utils/objectStorage');
const {
  syncCatalogDocument,
  removeCatalogDocument,
} = require('./catalog/catalog-sync');
const RedisCache = require('../utils/redisCache');

const STATUS_VALUES = new Set(['all', 'active', 'disabled']);

function isDisabledActivite(activite) {
  return activite === true || activite === 1 || activite === '1';
}

function mapCatalogItem(row) {
  const plain = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
  const user = plain.user || null;
  return {
    id: plain.id,
    name: plain.name,
    format: plain.format,
    availability: plain.availability,
    disabled: isDisabledActivite(plain.activite),
    url_thumb: rewriteBrowserAssetUrl(plain.url_thumb) || plain.url_thumb,
    url_cover: rewriteBrowserAssetUrl(plain.url_cover) || plain.url_cover,
    user_id: plain.user_id ?? null,
    contributor: user
      ? {
          id: user.id,
          name: user.name || null,
          email: user.email || null,
        }
      : null,
    createdAt: plain.createdAt || plain.created_at || null,
  };
}

async function deleteStorageUrl(url, s3, bucket) {
  if (!url || typeof url !== 'string') return;
  try {
    const key = extractObjectKeyFromUrl(url);
    if (!key) return;
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.warn('[admin-catalog] R2 delete skip:', err.message);
  }
}

async function deleteGridStorageObjects(plain) {
  try {
    assertObjectStorageConfigured();
  } catch {
    // STORAGE_TYPE=local or missing creds — skip object delete
    return;
  }
  const s3 = createObjectStorageClient();
  const bucket = getBucketName();
  if (!bucket) return;
  await deleteStorageUrl(plain.url_thumb, s3, bucket);
  await deleteStorageUrl(plain.url_cover, s3, bucket);
  await deleteStorageUrl(plain.url, s3, bucket);
}

async function clearCatalogCaches(redis) {
  if (!redis) return;
  try {
    await RedisCache.removePatternFromCache(redis, 'user_main_grid:*');
    await RedisCache.removePatternFromCache(redis, 'catalog_search:*');
    await RedisCache.removePatternFromCache(redis, 'catalog_facets:*');
  } catch (err) {
    console.warn('[admin-catalog] cache clear:', err.message);
  }
}

class AdminCatalogService {
  /** GET /admin/catalog */
  async list(req, res) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
      const offset = (page - 1) * limit;
      const q = String(req.query.q || '').trim();
      const status = String(req.query.status || 'all').toLowerCase();

      if (!STATUS_VALUES.has(status)) {
        return badRequest(res, 'status inválido (use all, active ou disabled)');
      }

      const where = {};
      if (status === 'active') where.activite = false;
      if (status === 'disabled') where.activite = true;
      if (q) {
        where[Op.or] = [
          { name: { [Op.like]: `%${q}%` } },
          { format: { [Op.like]: `%${q}%` } },
        ];
      }

      const { rows, count } = await UserMainGrid.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
            required: false,
          },
        ],
        order: [['id', 'DESC']],
        limit,
        offset,
      });

      const totalPages = Math.max(1, Math.ceil(count / limit));

      return ok(res, {
        message: 'Catálogo listado',
        data: rows.map(mapCatalogItem),
        pagination: { page, limit, total: count, totalPages },
        meta: { status, q: q || null },
      });
    } catch (error) {
      console.error('Erro ao listar catálogo (admin):', error);
      return serverError(res, 'Erro ao listar catálogo');
    }
  }

  /** PATCH /admin/catalog/:id  body { disabled: boolean } */
  async setDisabled(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return badRequest(res, 'Id inválido');
      }

      if (typeof req.body?.disabled !== 'boolean') {
        return badRequest(res, 'Informe disabled: true ou false');
      }

      const row = await UserMainGrid.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
            required: false,
          },
        ],
      });
      if (!row) {
        return notFound(res, 'Item não encontrado');
      }

      const activite = req.body.disabled;
      await row.update({ activite });

      const plain = row.get({ plain: true });
      plain.activite = activite;
      await syncCatalogDocument(plain);
      await clearCatalogCaches(req.redis);

      return ok(res, {
        message: activite
          ? 'Item desabilitado — oculto na Flix'
          : 'Item habilitado — visível na Flix',
        data: mapCatalogItem(row),
      });
    } catch (error) {
      console.error('Erro ao atualizar catálogo (admin):', error);
      return serverError(res, 'Erro ao atualizar item');
    }
  }

  /** DELETE /admin/catalog/:id */
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return badRequest(res, 'Id inválido');
      }

      const row = await UserMainGrid.findByPk(id);
      if (!row) {
        return notFound(res, 'Item não encontrado');
      }

      const plain = row.get({ plain: true });

      await deleteGridStorageObjects(plain);

      await UserFavorites.destroy({ where: { user_main_grid_id: id } }).catch(
        () => {}
      );
      await UserLikes.destroy({ where: { user_main_grid_id: id } }).catch(
        () => {}
      );
      await UserDownloads.destroy({ where: { user_main_grid_id: id } }).catch(
        () => {}
      );
      await UserFileRatings.destroy({ where: { user_main_grid_id: id } }).catch(
        () => {}
      );

      await UserMainGrid.destroy({ where: { id } });
      await removeCatalogDocument(id);
      await clearCatalogCaches(req.redis);

      return ok(res, {
        message: 'Item removido da API e do storage',
        data: { id },
      });
    } catch (error) {
      console.error('Erro ao remover catálogo (admin):', error);
      return serverError(res, 'Erro ao remover item');
    }
  }
}

module.exports = new AdminCatalogService();
module.exports.mapCatalogItem = mapCatalogItem;
module.exports.deleteGridStorageObjects = deleteGridStorageObjects;
