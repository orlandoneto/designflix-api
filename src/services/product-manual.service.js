const { ProductManual } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const productManual = await ProductManual.create(req.body);
      res.status(200).send({ data: productManual });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getByProductId(req, res) {
    const where = { product_id: Number(req.params.product_id) };
    const productManual = await ProductManual.findAll({where});

    return res.status(200).send({ data: productManual });
  }

  async getAll(req, res) {
    const productManual = await ProductManual.findAll();

    return res.status(200).send({ data: productManual });
  }

  async getOne(req, res) {
    const where = { id: Number(req.params.id) };
    const productManual = await ProductManual.findOne({where});

    return res.status(200).send({ data: productManual });
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    await ProductManual.update(req.body, { where });

    res.status(200).send({ status: "ok" });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    await ProductManual.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
