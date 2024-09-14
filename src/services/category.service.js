const { Category } = require("../models");

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
