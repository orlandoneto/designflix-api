const { ProductFaq } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const productFaq = await ProductFaq.create(req.body);
      res.status(200).send({ data: productFaq });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    const productFaqs = await ProductFaq.findAll();

    return res.status(200).send({ data: productFaqs });
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    const productFaq = await ProductFaq.findOne({ where });

    if (!productFaq || Number(productFaq.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "FAQ não encontrado" });
      return;
    }

    await ProductFaq.update(req.body, { where });

    res.status(200).send({ status: "ok" });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const productFaq = await ProductFaq.findOne({ where });

    if (!productFaq || Number(productFaq.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "FAQ não encontrado" });
      return;
    }

    await ProductFaq.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
