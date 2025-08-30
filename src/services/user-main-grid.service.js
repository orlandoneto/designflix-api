const {
  UserMainGrid,
  UserMainGridCategories,
  UserMainGridTags,
  Category,
  Tags,
  User,
  Sequelize,
  sequelize,
} = require("../models");

const RedisCache = require("../utils/redisCache");
const { logRedis } = require("../config/testingLogs");

module.exports = class UserMainGridController {
  async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        admin_id,
        user_id,
        name,
        format,
        url_thumb,
        url_cover,
        url,
        categories,
        tags,
        terms,
      } = req.body;

      const userMainGrid = await UserMainGrid.create(
        {
          admin_id,
          user_id,
          name,
          format,
          url_thumb,
          url_cover,
          url,
          terms,
        },
        { transaction }
      );

      if (categories && categories.length > 0) {
        for (const category of categories) {
          await UserMainGridCategories.create(
            {
              user_main_grid_id: userMainGrid.id,
              category_id: category.value,
            },
            { transaction }
          );
        }
      }

      if (tags && tags.length > 0) {
        for (const t of tags) {
          const tag = await Tags.create(
            {
              name: t,
            },
            { transaction }
          );

          await UserMainGridTags.create(
            {
              user_main_grid_id: userMainGrid.id,
              tag_id: tag.id,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      // Limpar cache relacionado após criar novo registro
      if (req.redis) {
        try {
          // Remove todas as chaves de cache relacionadas ao user_main_grid
          await RedisCache.removePatternFromCache(req.redis, 'user_main_grid:*');
          logRedis('Cache limpo após criar novo registro');
        } catch (cacheError) {
          logRedis('Erro ao limpar cache (não crítico):', cacheError.message);
        }
      }

      res.status(200).send({ data: { ...userMainGrid } });
    } catch (err) {
      await transaction.rollback();

      console.error(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const { searchTerm, format, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Gerar chave de cache única
      const cacheKey = RedisCache.generateCacheKey('user_main_grid', searchTerm, format, page, limit);

      // Tentar buscar do cache
      const cachedData = await RedisCache.getFromCache(req.redis, cacheKey);
      if (cachedData && cachedData.data.length > 0) {
        logRedis('Retornando dados do cache Redis (não consultando banco)');
        return res.status(200).send(cachedData);
      }

      if (searchTerm && searchTerm !== 'null' && format && format !== 'null') {
        let whereClauses = [];
        let replacements = {};

        whereClauses.push(`MATCH (umg.terms) AGAINST (:search IN NATURAL LANGUAGE MODE)`);
        whereClauses.push(`umg.format = :format`);
        whereClauses.push(`umg.activite = 0`);
        replacements.search = searchTerm;
        replacements.format = format;

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query para contar total de registros
        const countQuery = `
          SELECT COUNT(DISTINCT umg.id) as total
          FROM user_main_grid umg
          LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
          LEFT JOIN categories c ON c.id = umgc.category_id
          LEFT JOIN user_main_grid_tags umgt ON umgt.user_main_grid_id = umg.id
          LEFT JOIN tags t ON t.id = umgt.tag_id
          ${whereSQL}
        `;

        const totalResult = await sequelize.query(countQuery, {
          replacements,
          type: Sequelize.QueryTypes.SELECT,
        });

        const total = totalResult[0].total;

        // Query principal com paginação
        const query = `
          SELECT
            umg.*,
            u.id as user_id, u.name as user_name, u.photo as user_photo,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', c.id, 'name', c.name, 'active', c.active)) AS categories,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', t.id, 'name', t.name)) AS tags
          FROM user_main_grid umg
          LEFT JOIN user u ON umg.user_id = u.id
          LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
          LEFT JOIN categories c ON c.id = umgc.category_id
          LEFT JOIN user_main_grid_tags umgt ON umgt.user_main_grid_id = umg.id
          LEFT JOIN tags t ON t.id = umgt.tag_id
          ${whereSQL}
          GROUP BY umg.id
          ORDER BY umg.created_at DESC, umg.updated_at DESC
          LIMIT :limit OFFSET :offset
        `;

        const results = await sequelize.query(query, {
          replacements: { ...replacements, limit: parseInt(limit), offset },
          type: Sequelize.QueryTypes.SELECT,
        });

        const data = results.map((r) => ({
          id: r.id,
          contributor_id: r.user_id,
          contributor_admin_id: r.admin_id,
          name: r.name,
          format: r.format,
          url_thumb: r.url_thumb,
          url_cover: r.url_cover,
          url: r.url,
          activite: r.activite,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
          },
          categories: r.categories
            ? JSON.parse(`[${r.categories}]`)
            : [],
          tags: r.tags
            ? JSON.parse(`[${r.tags}]`)
            : [],
        }));

        const responseData = {
          data,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        };

        // Salvar no cache de forma assíncrona (não bloqueia a resposta)
        RedisCache.saveToCache(req.redis, cacheKey, responseData);

        return res.status(200).send(responseData);
      }
      // Se apenas searchTerm tem valor (format é null ou undefined)
      else if (searchTerm && searchTerm !== 'null') {
        let whereClauses = [];
        let replacements = {};

        whereClauses.push(`MATCH (umg.terms) AGAINST (:search IN NATURAL LANGUAGE MODE)`);
        whereClauses.push(`umg.activite = 0`);
        replacements.search = searchTerm;

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query para contar total de registros
        const countQuery = `
          SELECT COUNT(DISTINCT umg.id) as total
          FROM user_main_grid umg
          LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
          LEFT JOIN categories c ON c.id = umgc.category_id
          LEFT JOIN user_main_grid_tags umgt ON umgt.user_main_grid_id = umg.id
          LEFT JOIN tags t ON t.id = umgt.tag_id
          ${whereSQL}
        `;

        const totalResult = await sequelize.query(countQuery, {
          replacements,
          type: Sequelize.QueryTypes.SELECT,
        });

        const total = totalResult[0].total;

        // Query principal com paginação
        const query = `
          SELECT
            umg.*,
            u.id as user_id, u.name as user_name, u.photo as user_photo,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', c.id, 'name', c.name, 'active', c.active)) AS categories,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', t.id, 'name', t.name)) AS tags
          FROM user_main_grid umg
          LEFT JOIN user u ON umg.user_id = u.id
          LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
          LEFT JOIN categories c ON c.id = umgc.category_id
          LEFT JOIN user_main_grid_tags umgt ON umgt.user_main_grid_id = umg.id
          LEFT JOIN tags t ON t.id = umgt.tag_id
          ${whereSQL}
          GROUP BY umg.id
          ORDER BY umg.created_at DESC, umg.updated_at DESC
          LIMIT :limit OFFSET :offset
        `;

        const results = await sequelize.query(query, {
          replacements: { ...replacements, limit: parseInt(limit), offset },
          type: Sequelize.QueryTypes.SELECT,
        });

        const data = results.map((r) => ({
          id: r.id,
          contributor_id: r.user_id,
          contributor_admin_id: r.admin_id,
          name: r.name,
          format: r.format,
          url_thumb: r.url_thumb,
          url_cover: r.url_cover,
          url: r.url,
          activite: r.activite,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
          },
          categories: r.categories
            ? JSON.parse(`[${r.categories}]`)
            : [],
          tags: r.tags
            ? JSON.parse(`[${r.tags}]`)
            : [],
        }));

        const responseData = {
          data,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        };

        // Salvar no cache de forma assíncrona (não bloqueia a resposta)
        RedisCache.saveToCache(req.redis, cacheKey, responseData);

        return res.status(200).send(responseData);
      }
      // Se apenas format tem valor (searchTerm é null ou undefined)
      else if (format && format !== 'null') {
        let whereClauses = [];
        let replacements = {};

        whereClauses.push(`umg.format = :format`);
        whereClauses.push(`umg.activite = 0`);
        replacements.format = format;

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query para contar total de registros
        const countQuery = `
          SELECT COUNT(DISTINCT umg.id) as total
          FROM user_main_grid umg
          LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
          LEFT JOIN categories c ON c.id = umgc.category_id
          LEFT JOIN user_main_grid_tags umgt ON umgt.user_main_grid_id = umg.id
          LEFT JOIN tags t ON t.id = umgt.tag_id
          ${whereSQL}
        `;

        const totalResult = await sequelize.query(countQuery, {
          replacements,
          type: Sequelize.QueryTypes.SELECT,
        });

        const total = totalResult[0].total;

        // Query principal com paginação
        const query = `
          SELECT
            umg.*,
            u.id as user_id, u.name as user_name, u.photo as user_photo,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', c.id, 'name', c.name, 'active', c.active)) AS categories,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', t.id, 'name', t.name)) AS tags
          FROM user_main_grid umg
          LEFT JOIN user u ON umg.user_id = u.id
          LEFT JOIN user_main_grid_categories umgc ON umgc.user_main_grid_id = umg.id
          LEFT JOIN categories c ON c.id = umgc.category_id
          LEFT JOIN user_main_grid_tags umgt ON umgt.user_main_grid_id = umg.id
          LEFT JOIN tags t ON t.id = umgt.tag_id
          ${whereSQL}
          GROUP BY umg.id
          ORDER BY umg.created_at DESC, umg.updated_at DESC
          LIMIT :limit OFFSET :offset
        `;

        const results = await sequelize.query(query, {
          replacements: { ...replacements, limit: parseInt(limit), offset },
          type: Sequelize.QueryTypes.SELECT,
        });

        const data = results.map((r) => ({
          id: r.id,
          contributor_id: r.user_id,
          contributor_admin_id: r.admin_id,
          name: r.name,
          format: r.format,
          url_thumb: r.url_thumb,
          url_cover: r.url_cover,
          url: r.url,
          activite: r.activite,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
          },
          categories: r.categories
            ? JSON.parse(`[${r.categories}]`)
            : [],
          tags: r.tags
            ? JSON.parse(`[${r.tags}]`)
            : [],
        }));

        const responseData = {
          data,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        };

        // Salvar no cache de forma assíncrona (não bloqueia a resposta)
        RedisCache.saveToCache(req.redis, cacheKey, responseData);

        return res.status(200).send(responseData);
      }
      // Se nenhum filtro (ambos são null/undefined ou 'null')
      else {
        const { count, rows: userMainGrids } = await UserMainGrid.findAndCountAll({
          where: { activite: 0 },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "photo"],
            },
            {
              model: UserMainGridCategories,
              as: "user_main_grid_categories",
              include: [
                {
                  model: Category,
                  as: "category",
                  attributes: ["id", "name", "active"],
                },
              ],
            },
            {
              model: UserMainGridTags,
              as: "user_main_grid_tags",
              include: [
                {
                  model: Tags,
                  as: "tag",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
          order: [
            ["created_at", "DESC"],
            ["updated_at", "DESC"],
          ],
          limit: parseInt(limit),
          offset,
        });

        const result = userMainGrids.map((grid) => ({
          id: grid.id,
          contributor_id: grid.user_id,
          contributor_admin_id: grid.admin_id,
          name: grid.name,
          format: grid.format,
          url_thumb: grid.url_thumb,
          url_cover: grid.url_cover,
          url: grid.url,
          activite: grid.activite,
          user: {
            id: grid.user?.id,
            name: grid.user?.name,
            photo: grid.user?.photo,
          },
          categories: grid.user_main_grid_categories.map((item) => ({
            id: item.category.id,
            name: item.category.name,
            active: item.category.active,
          })),
          tags: grid.user_main_grid_tags.map((item) => ({
            id: item.tag.id,
            name: item.tag.name,
          })),
        }));

        const responseData = {
          data: result,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit))
          }
        };

        // Salvar no cache de forma assíncrona (não bloqueia a resposta)
        RedisCache.saveToCache(req.redis, cacheKey, responseData);

        return res.status(200).send(responseData);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getAllByUserId(req, res) {
    try {
      const { searchTerm, format, userId } = req.params;

      const whereCondition = {};
      if (searchTerm) {
        whereCondition.terms = {
          [Sequelize.Op.like]: `%${searchTerm}%`,
        };
      }

      if (format) {
        whereCondition.format = format;
      }

      if (userId) {
        whereCondition.user_id = userId;
      }

      const userMainGrids = await UserMainGrid.findAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "photo"],
          },
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        order: [
          ["createdAt", "DESC"],
          ["updatedAt", "DESC"],
        ],
      });

      const result = userMainGrids.map((grid) => ({
        id: grid.id,
        name: grid.name,
        format: grid.format,
        url_thumb: grid.url_thumb,
        url_cover: grid.url_cover,
        url: grid.url,
        activite: grid.activite,
        user: {
          id: grid.user?.id,
          name: grid.user?.name,
          photo: grid.user?.photo,
        },
        categories: grid.user_main_grid_categories.map((item) => ({
          id: item.category.id,
          name: item.category.name,
          active: item.category.active,
        })),
        tags: grid.user_main_grid_tags.map((item) => ({
          id: item.tag.id,
          name: item.tag.name,
        })),
      }));

      res.status(200).send({ data: result });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getAllByCategory(req, res) {
    try {
      const { categoryId } = req.query;

      const whereCondition = { activite: 0 };
      if (categoryId) {
        whereCondition["$user_main_grid_categories.category_id$"] = categoryId;
      }

      const userMainGrids = await UserMainGrid.findAll({
        where: whereCondition,
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            required: !!categoryId,
            where: whereCondition.user_main_grid_categories,
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        order: [
          ["createdAt", "DESC"],
          ["updatedAt", "DESC"],
        ],
      });

      const result = userMainGrids.map((grid) => ({
        id: grid.id,
        name: grid.name,
        format: grid.format,
        url_thumb: grid.url_thumb,
        url_cover: grid.url_cover,
        url: grid.url,
        categories: grid.user_main_grid_categories.map((item) => ({
          id: item.category.id,
          name: item.category.name,
          active: item.category.active,
        })),
        tags: grid.user_main_grid_tags.map((item) => ({
          id: item.tag.id,
          name: item.tag.name,
        })),
      }));

      res.status(200).send({ data: result });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getOne(req, res) {
    try {
      const userMainGrid = await UserMainGrid.findOne({
        where: { id: req.params.id, activite: 0 },
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      if (!userMainGrid) {
        return res.status(404).send({ message: "Registro não encontrado" });
      }

      res.status(200).send({ data: userMainGrid });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async updateById(req, res) {
    try {
      const where = { id: Number(req.params.id) };

      const [updated] = await UserMainGrid.update(req.body, { where });

      if (updated === 0) {
        return res.status(404).send({ message: "Registro não encontrado" });
      }

      const updatedUserMainGrid = await UserMainGrid.findOne({
        where,
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      // Limpar cache relacionado após atualizar registro
      if (req.redis) {
        try {
          await RedisCache.removePatternFromCache(req.redis, 'user_main_grid:*');
          logRedis('Cache limpo após atualizar registro');
        } catch (cacheError) {
          logRedis('Erro ao limpar cache (não crítico):', cacheError.message);
        }
      }

      res.status(200).send({ status: "ok", data: updatedUserMainGrid });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async deleteById(req, res) {
    try {
      const where = { id: req.params.id };

      const userMainGrid = await UserMainGrid.findOne({
        where,
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
              },
            ],
          },
          {
            model: UserMainGridTags,
            as: "user_main_grid_tags",
            include: [
              {
                model: Tags,
                as: "tag",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      if (!userMainGrid) {
        return res.status(404).send({ message: "Registro não encontrado" });
      }

      await UserMainGrid.destroy({ where });

      // Limpar cache relacionado após deletar registro
      if (req.redis) {
        try {
          await RedisCache.removePatternFromCache(req.redis, 'user_main_grid:*');
          logRedis('Cache limpo após deletar registro');
        } catch (cacheError) {
          logRedis('Erro ao limpar cache (não crítico):', cacheError.message);
        }
      }

      res.status(200).send({ status: "ok", data: userMainGrid });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async countByUserId(req, res) {
    try {
      const { user_id } = req.params;
      if (!user_id) {
        return res.status(400).json({ message: "user_id é obrigatório" });
      }
      const count = await UserMainGrid.count({ where: { user_id, activite: 0 } });
      return res.status(200).json({ count });
    } catch (err) {
      res.status(500).json({ message: "Erro ao contar registros", error: err.message });
    }
  }
};
