const {
  UserMainGrid,
  UserMainGridCategories,
  UserMainGridTags,
  Category,
  UserUploads,
  Tags,
  User,
  Sequelize,
  sequelize,
} = require("../models");

module.exports = class UserMainGridController {
  async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        admin_id,
        user_id,
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
          user_id,
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
            model: User,
            as: "user",
            attributes: ["id", "name", "photo"],
            include: [
              {
                model: UserUploads,
                as: "user_uploads",
                attributes: ["total_uploads"],
              },
            ],
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
        contributor_id: grid.user_id,
        contributor_admin_id: grid.admin_id,
        name: grid.name,
        format: grid.format,
        url_cover: grid.url_cover,
        url: grid.url,
        user: {
          id: grid.user?.id,
          name: grid.user?.name,
          photo: grid.user?.photo,
          total_uploads: grid.user?.user_uploads?.total_uploads || 0,
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
      console.log(err);
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
        url_cover: grid.url_cover,
        url: grid.url,
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
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getAllByCategory(req, res) {
    try {
      const { categoryId } = req.query;

      const whereCondition = categoryId
        ? {
            user_main_grid_categories: {
              category_id: categoryId,
            },
          }
        : {};

      const userMainGrids = await UserMainGrid.findAll({
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
