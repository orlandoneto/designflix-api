const { Product } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const product = await Product.create(req.body);
      res.status(200).send({ data: product });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    const products = await Product.findAll();

    return res.status(200).send({ data: products });
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    await Product.update(req.body, { where });

    res.status(200).send({ status: "ok" });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    await Product.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
