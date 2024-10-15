const { format } = require("path");
const {
  UserMainGrid,
  UserMainGridCategories,
  UserMainGridTags,
  Category,
  Tags,
  Sequelize,
  sequelize,
} = require("../models");

module.exports = class UserMainGridController {
  async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        admin_id,
        name,
        format,
        url_cover,
        url,
        categories,
        tags,
        terms,
      } = req.body;

      const userMainGrid = await UserMainGrid.create(
        {
          admin_id,
          name,
          format,
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

      res.status(200).send({ data: { ...userMainGrid } });
    } catch (err) {
      await transaction.rollback();

      console.log(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const { searchTerm, format } = req.query;

      const whereCondition = {};

      if (searchTerm) {
        whereCondition.terms = {
          [Sequelize.Op.like]: `%${searchTerm}%`,
        };
      }

      if (format) {
        whereCondition.format = format;
      }

      const userMainGrids = await UserMainGrid.findAll({
        where: whereCondition,
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
        order: [
          ["createdAt", "DESC"],
          ["updatedAt", "DESC"],
        ],
      });

      const result = userMainGrids.map((grid) => ({
        id: grid.id,
        name: grid.name,
        format: grid.format,
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
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getAllByCategory(req, res) {
    try {
      const searchTerm = req.query.searchTerm;
      const categoryId = req.query.categoryId; // Captura o id da categoria, se enviado

      const whereCondition = searchTerm
        ? {
            terms: {
              [Sequelize.Op.like]: `%${searchTerm}%`,
            },
          }
        : {};

      // Condição para filtrar pelas categorias, se categoryId for enviado
      const categoryCondition = categoryId
        ? {
            id: categoryId,
          }
        : {};

      const userMainGrids = await UserMainGrid.findAll({
        where: whereCondition,
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "name", "active"],
                where: categoryCondition, // Adiciona a condição de categoria aqui
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
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getOne(req, res) {
    try {
      const userMainGrid = await UserMainGrid.findOne({
        where: { id: req.params.id },
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
      console.log(err);
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

      res.status(200).send({ status: "ok", data: updatedUserMainGrid });
    } catch (err) {
      console.log(err);
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

      res.status(200).send({ status: "ok", data: userMainGrid });
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }
};
