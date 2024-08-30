const { ProductProblem } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const productProblem = await ProductProblem.create(req.body);
      res.status(200).send({ data: productProblem });
    } catch (err) {
      console.log(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    const productProblems = await ProductProblem.findAll();

    return res.status(200).send({ data: productProblems });
  }

  
  async getOne(req, res) {
    try{
      const productProblems = await ProductProblem.findOne({
        where: { id: req.params.id },
      });
  
      return res.status(200).send({ data: productProblems });
    }
    catch(err){
      return res.status(500).send({ data: err.message });
    }
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    const productProblem = await ProductProblem.findOne({ where });

    if (!productProblem || Number(productProblem.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "Problema não encontrado" });
      return;
    }

    await ProductProblem.update(req.body, { where });

    const resData = await ProductProblem.findOne({ where });

    res.status(200).send({ status: "ok", data: resData });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const productProblem = await ProductProblem.findOne({ where });

    if (!productProblem || Number(productProblem.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "Problema não encontrado" });
      return;
    }

    await ProductProblem.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
