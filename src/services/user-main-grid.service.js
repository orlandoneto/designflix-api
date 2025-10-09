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
        reason,
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
          reason,
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
      const { searchTerm, format, page = 1, limit = 40 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Gerar chave de cache única
      const cacheKey = RedisCache.generateCacheKey('user_main_grid', searchTerm, format, page, limit);

      // Tentar buscar do cache
      const cachedData = await RedisCache.getFromCache(req.redis, cacheKey);
      if (cachedData && cachedData.data.length > 0) {
        logRedis('Retornando dados do cache Redis (não consultando banco)');
        return res.status(200).send(cachedData);
      }

      // Monta consulta FULLTEXT mais precisa em BOOLEAN MODE com prefixo
      const buildBooleanQuery = (input) => {
        const raw = String(input || '').trim();
        const normalized = raw
          .replace(/\s+/g, ' ')
          .replace(/["'`]+/g, '');
        const stopwords = new Set(['a', 'o', 'as', 'os', 'e', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'para', 'por', 'no', 'na', 'nos', 'nas', 'em', 'com', 'sem', 'ao', 'à', 'às', 'aos']);
        const tokens = normalized.split(' ').filter(Boolean);
        const booleanTokens = [];
        for (const t of tokens) {
          const token = t.toLowerCase();
          if (stopwords.has(token)) continue;
          if (token.length >= 4) booleanTokens.push(`+${token}*`);
        }
        const booleanQuery = booleanTokens.join(' ');
        const likeQuery = `%${normalized}%`;
        const natQuery = normalized;
        return { booleanQuery, likeQuery, natQuery, hasBoolean: booleanQuery.length > 0 };
      };

      if (searchTerm && searchTerm !== 'null' && format && format !== 'null') {
        let whereClauses = [];
        let replacements = {};

        const { booleanQuery, likeQuery, natQuery, hasBoolean } = buildBooleanQuery(searchTerm);
        if (hasBoolean) {
          whereClauses.push(`MATCH (umg.terms) AGAINST (:search IN BOOLEAN MODE)`);
          replacements.search = booleanQuery;
        } else {
          whereClauses.push(`umg.terms LIKE :search_like`);
          replacements.search_like = likeQuery;
        }
        // parâmetros auxiliares para ranking
        replacements.search_nat = natQuery;
        replacements.phrase_like = likeQuery;
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
            u.id as user_id, u.name as user_name, u.photo as user_photo, u.partner_code as user_partner_code, u.coupon_code as user_coupon_code,
            (SELECT COUNT(*) FROM user_main_grid umg2 WHERE umg2.user_id = umg.user_id AND umg2.activite = 0) AS countFiles,
            MATCH (umg.terms) AGAINST (:search_nat IN NATURAL LANGUAGE MODE) AS score,
            CASE WHEN umg.terms LIKE :phrase_like THEN 1 ELSE 0 END AS phrase_hit,
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
          ORDER BY CASE WHEN umg.format = 'PSD' THEN 0 ELSE 1 END, phrase_hit DESC, score DESC, umg.created_at DESC, umg.updated_at DESC
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
          reason: r.reason,
          countFiles: r.countFiles,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
            partnerCode: r.user_partner_code,
            couponCode: r.user_coupon_code,
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

        const { booleanQuery, likeQuery, natQuery, hasBoolean } = buildBooleanQuery(searchTerm);
        if (hasBoolean) {
          whereClauses.push(`MATCH (umg.terms) AGAINST (:search IN BOOLEAN MODE)`);
          replacements.search = booleanQuery;
        } else {
          whereClauses.push(`umg.terms LIKE :search_like`);
          replacements.search_like = likeQuery;
        }
        // parâmetros auxiliares para ranking
        replacements.search_nat = natQuery;
        replacements.phrase_like = likeQuery;
        whereClauses.push(`umg.activite = 0`);

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
            u.id as user_id, u.name as user_name, u.photo as user_photo, u.partner_code as user_partner_code, u.coupon_code as user_coupon_code,
            (SELECT COUNT(*) FROM user_main_grid umg2 WHERE umg2.user_id = umg.user_id AND umg2.activite = 0) AS countFiles,
            MATCH (umg.terms) AGAINST (:search_nat IN NATURAL LANGUAGE MODE) AS score,
            CASE WHEN umg.terms LIKE :phrase_like THEN 1 ELSE 0 END AS phrase_hit,
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
          ORDER BY CASE WHEN umg.format = 'PSD' THEN 0 ELSE 1 END, phrase_hit DESC, score DESC, umg.created_at DESC, umg.updated_at DESC
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
          reason: r.reason,
          countFiles: r.countFiles,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
            partnerCode: r.user_partner_code,
            couponCode: r.user_coupon_code,
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
            u.id as user_id, u.name as user_name, u.photo as user_photo, u.partner_code as user_partner_code, u.coupon_code as user_coupon_code,
            (SELECT COUNT(*) FROM user_main_grid umg2 WHERE umg2.user_id = umg.user_id AND umg2.activite = 0) AS countFiles,
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
          ORDER BY CASE WHEN umg.format = 'PSD' THEN 0 ELSE 1 END, umg.created_at DESC, umg.updated_at DESC
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
          reason: r.reason,
          countFiles: r.countFiles,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
            partnerCode: r.user_partner_code,
            couponCode: r.user_coupon_code,
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
              attributes: ["id", "name", "photo", "partnerCode", "couponCode"],
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
            sequelize.literal("CASE WHEN format = 'PSD' THEN 0 ELSE 1 END ASC"),
            ["created_at", "DESC"],
            ["updated_at", "DESC"],
          ],
          limit: parseInt(limit),
          offset,
        });
        // Calcular countFiles por usuário em uma única consulta
        const userIds = Array.from(new Set(userMainGrids.map((g) => g.user_id).filter(Boolean)));
        let countsByUserId = {};
        if (userIds.length > 0) {
          const countRows = await sequelize.query(
            `SELECT user_id, COUNT(*) AS countFiles FROM user_main_grid WHERE activite = 0 AND user_id IN (:userIds) GROUP BY user_id`,
            { replacements: { userIds }, type: Sequelize.QueryTypes.SELECT }
          );
          countsByUserId = countRows.reduce((acc, r) => {
            acc[r.user_id] = Number(r.countFiles) || 0;
            return acc;
          }, {});
        }

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
          reason: grid.reason,
          countFiles: countsByUserId[grid.user_id] || 0,
          user: {
            id: grid.user?.id,
            name: grid.user?.name,
            photo: grid.user?.photo,
            partnerCode: grid.user?.partnerCode,
            couponCode: grid.user?.couponCode,
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
      const { page = 1, limit = 40 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Se houver termo de busca, aplicar a mesma lógica de relevância
      if (searchTerm && searchTerm !== 'null') {
        const buildBooleanQuery = (input) => {
          const raw = String(input || '').trim();
          const normalized = raw
            .replace(/\s+/g, ' ')
            .replace(/["'`]+/g, '');
          const stopwords = new Set(['a', 'o', 'as', 'os', 'e', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'para', 'por', 'no', 'na', 'nos', 'nas', 'em', 'com', 'sem', 'ao', 'à', 'às', 'aos']);
          const tokens = normalized.split(' ').filter(Boolean);
          const booleanTokens = [];
          for (const t of tokens) {
            const token = t.toLowerCase();
            if (stopwords.has(token)) continue;
            if (token.length >= 4) booleanTokens.push(`+${token}*`);
          }
          const booleanQuery = booleanTokens.join(' ');
          const likeQuery = `%${normalized}%`;
          const natQuery = normalized;
          return { booleanQuery, likeQuery, natQuery, hasBoolean: booleanQuery.length > 0 };
        };

        let whereClauses = [];
        let replacements = {};

        const { booleanQuery, likeQuery, natQuery, hasBoolean } = buildBooleanQuery(searchTerm);
        if (hasBoolean) {
          whereClauses.push(`MATCH (umg.terms) AGAINST (:search IN BOOLEAN MODE)`);
          replacements.search = booleanQuery;
        } else {
          whereClauses.push(`umg.terms LIKE :search_like`);
          replacements.search_like = likeQuery;
        }
        replacements.search_nat = natQuery;
        replacements.phrase_like = likeQuery;

        whereClauses.push(`umg.user_id = :userId`);
        replacements.userId = userId;
        // ✅ BUSCA TAMBÉM MOSTRA TODAS: Remover filtro activite = 0
        // whereClauses.push(`umg.activite = 0`); // ← REMOVIDO para mostrar todas
        if (format && format !== 'null') {
          whereClauses.push(`umg.format = :format`);
          replacements.format = format;
        }

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
            u.id as user_id, u.name as user_name, u.photo as user_photo, u.partner_code as user_partner_code, u.coupon_code as user_coupon_code,
            MATCH (umg.terms) AGAINST (:search_nat IN NATURAL LANGUAGE MODE) AS score,
            CASE WHEN umg.terms LIKE :phrase_like THEN 1 ELSE 0 END AS phrase_hit,
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
          ORDER BY phrase_hit DESC, score DESC, umg.created_at DESC, umg.updated_at DESC
          LIMIT :limit OFFSET :offset
        `;

        const results = await sequelize.query(query, {
          replacements: { ...replacements, limit: parseInt(limit), offset },
          type: Sequelize.QueryTypes.SELECT,
        });

        const data = results.map((r) => ({
          id: r.id,
          name: r.name,
          format: r.format,
          url_thumb: r.url_thumb,
          url_cover: r.url_cover,
          url: r.url,
          activite: r.activite,
          reason: r.reason,
          user: {
            id: r.user_id,
            name: r.user_name,
            photo: r.user_photo,
            partnerCode: r.user_partner_code,
            couponCode: r.user_coupon_code,
          },
          categories: r.categories ? JSON.parse(`[${r.categories}]`) : [],
          tags: r.tags ? JSON.parse(`[${r.tags}]`) : [],
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

        return res.status(200).send(responseData);
      }

      // ✅ CORREÇÃO PRINCIPAL: Sem termo de busca - usar consulta SQL direta para paginação correta
      const whereCondition = {};
      if (format && format !== 'null') {
        whereCondition.format = format;
      }
      if (userId) {
        whereCondition.user_id = userId;
      }
      // ✅ MOSTRAR TODAS: Não filtrar por activite - mostrar ativas E inativas
      // whereCondition.activite = 0; // ← REMOVIDO para mostrar todas

      const { count, rows: userMainGrids } = await UserMainGrid.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "photo", "partnerCode", "couponCode"],
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
        limit: parseInt(limit),
        offset, // ✅ CORREÇÃO: Usar offset calculado corretamente
        distinct: true, // ✅ CRÍTICO: Evitar contagem duplicada por causa dos JOINs
      });

      const data = userMainGrids.map((grid) => ({
        id: grid.id,
        name: grid.name,
        format: grid.format,
        url_thumb: grid.url_thumb,
        url_cover: grid.url_cover,
        url: grid.url,
        activite: grid.activite,
        reason: grid.reason,
        user: {
          id: grid.user?.id,
          name: grid.user?.name,
          photo: grid.user?.photo,
          partnerCode: grid.user?.partnerCode,
          couponCode: grid.user?.couponCode,
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
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      };

      return res.status(200).send(responseData);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getAllByCategory(req, res) {
    try {
      const { categoryId, page = 1, limit = 40 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const whereCondition = { activite: 0 };
      let includeWhereCondition = {};
      if (categoryId) {
        includeWhereCondition.category_id = categoryId;
      }

      const { count, rows: userMainGrids } = await UserMainGrid.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "photo", "partnerCode", "couponCode"],
          },
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            required: !!categoryId,
            where: includeWhereCondition,
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
        limit: parseInt(limit),
        offset,
      });

      const data = userMainGrids.map((grid) => ({
        id: grid.id,
        name: grid.name,
        format: grid.format,
        url_thumb: grid.url_thumb,
        url_cover: grid.url_cover,
        url: grid.url,
        user: {
          id: grid.user?.id,
          name: grid.user?.name,
          photo: grid.user?.photo,
          partnerCode: grid.user?.partnerCode,
          couponCode: grid.user?.couponCode,
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
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      };

      res.status(200).send(responseData);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getOne(req, res) {
    try {
      const { id } = req.params;
      const userMainGrid = await UserMainGrid.findOne({
        where: { id, activite: 0 },
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
        return res.status(403).send({ message: "Registro encontra-se inativo" });
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

      const body = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(body, 'reason') && (body.reason === '' || body.reason === null || typeof body.reason === 'undefined')) {
        body.reason = 0;
      }

      const [updated] = await UserMainGrid.update(body, { where });

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
