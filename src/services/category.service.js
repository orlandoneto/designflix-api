const { where } = require("sequelize");
const { Category, UserMainGrid, UserMainGridCategories } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const category = await Category.create({
        name: req.body.name,
        active: req.body.active || 0,
      });
      console.log(category);

      res.status(201).send({ data: category });
    } catch (err) {
      console.log(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const categories = await Category.findAll();
      res.status(200).send({ data: categories });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getCategoriesInGroups(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4; // Número de categorias por grupo

      // Obter todas as categorias com UserMainGrid associado, apenas quando "user_main_grid_categories" estiver preenchido
      const categoriesWithGrids = await Category.findAll({
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            required: true, // Garante que só traga categorias que têm registros em "user_main_grid_categories"
            include: [
              {
                model: UserMainGrid,
                as: "user_main_grid",
                attributes: ["name", "format", "url"], // Campos que você quer trazer
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]], // Ordenar pelas categorias mais recentes
      });

      // Agrupar categorias de 4 em 4
      const categoriesInGroups = [];
      for (let i = 0; i < categoriesWithGrids.length; i += limit) {
        categoriesInGroups.push(categoriesWithGrids.slice(i, i + limit));
      }

      // Se a página solicitada for maior que o número de grupos, retornar erro
      if (page > categoriesInGroups.length) {
        return res.status(404).send({ message: "Página não encontrada" });
      }

      res.status(200).json({
        data: categoriesInGroups,
        totalGroups: categoriesInGroups.length,
        currentPage: page,
        hasMore: page < categoriesInGroups.length,
      });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getCategoriesInGroupsFilter(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4; // Número de categorias por grupo
      console.log(req.query.categoryName);
      const categoryName = req.query.categoryName; // Parâmetro opcional de nome da categoria

      const whereCondition = categoryName ? { name: categoryName } : {}; // Condição para filtrar pelo nome da categoria
      console.log(whereCondition);
      // Obter todas as categorias com UserMainGrid associado, apenas quando "user_main_grid_categories" estiver preenchido
      const categoriesWithGrids = await Category.findAll({
        where: whereCondition, // Filtra se o nome da categoria for passado
        include: [
          {
            model: UserMainGridCategories,
            as: "user_main_grid_categories",
            required: true, // Garante que só traga categorias que têm registros em "user_main_grid_categories"
            include: [
              {
                model: UserMainGrid,
                as: "user_main_grid",
                attributes: ["name", "format", "url"], // Campos que você quer trazer
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]], // Ordenar pelas categorias mais recentes
      });

      if (categoriesWithGrids.length === 0) {
        // Se não houver categorias com "user_main_grid_categories", retorna um array vazio
        return res.status(200).json({
          data: [],
          totalGroups: 0,
          currentPage: page,
          hasMore: false,
        });
      }

      // Agrupar categorias de 4 em 4
      const categoriesInGroups = [];
      for (let i = 0; i < categoriesWithGrids.length; i += limit) {
        categoriesInGroups.push(categoriesWithGrids.slice(i, i + limit));
      }

      // Se a página solicitada for maior que o número de grupos, retornar erro
      if (page > categoriesInGroups.length) {
        return res.status(404).send({ message: "Página não encontrada" });
      }

      res.status(200).json({
        data: categoriesInGroups,
        totalGroups: categoriesInGroups.length,
        currentPage: page,
        hasMore: page < categoriesInGroups.length,
      });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async updateById(req, res) {
    try {
      const category = await Category.findOne({ where: { id: req.params.id } });

      if (!category) {
        res.status(404).send({ message: "Categoria não encontrada" });
        return;
      }

      await Category.update(req.body, { where: { id: req.params.id } });

      res.status(200).send({ status: "ok" });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async deleteById(req, res) {
    try {
      const category = await Category.findOne({ where: { id: req.params.id } });

      if (!category) {
        res.status(404).send({ message: "Categoria não encontrada" });
        return;
      }

      await Category.destroy({ where: { id: req.params.id } });

      res.status(200).send({ status: "ok" });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }
};
