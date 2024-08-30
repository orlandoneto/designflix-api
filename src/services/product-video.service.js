const { ProductVideo } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const productVideo = await ProductVideo.create(req.body);
      res.status(200).send({ data: productVideo });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAllByProductId(req, res) {
    const where = { product_id: req.params.product_id };

    const productVideo = await ProductVideo.findAll({ where });

    return res.status(200).send({ data: productVideo });
  }

  async getAll(req, res) {

    const productVideo = await ProductVideo.findAll();

    return res.status(200).send({ data: productVideo });
  }

  async getOne(req, res) {
    const where = { id: Number(req.params.id) };
    const productVideo = await ProductVideo.findOne({where});

    return res.status(200).send({ data: productVideo });
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    const productVideo = await ProductVideo.findOne({ where });

    if (!productVideo || Number(productVideo.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "Video não encontrado" });
      return;
    }

    await ProductVideo.update(req.body, { where });

    res.status(200).send({ status: "ok" });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const productVideo = await ProductVideo.findOne({ where });

    if (!productVideo || Number(productVideo.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "Video não encontrado" });
      return;
    }

    await ProductVideo.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
