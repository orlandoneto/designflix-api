const { UserMainGrid } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const userMainGrid = await UserMainGrid.create(req.body);
      res.status(200).send({ data: userMainGrid });
    } catch (err) {
      console.log(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    const userMainGrids = await UserMainGrid.findAll();

    return res.status(200).send({ data: userMainGrids });
  }

  
  async getOne(req, res) {
    try{
      const userMainGrids = await UserMainGrid.findOne({
        where: { id: req.params.id },
      });
  
      return res.status(200).send({ data: userMainGrids });
    }
    catch(err){
      return res.status(500).send({ data: err.message });
    }
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    const userMainGrid = await UserMainGrid.findOne({ where });

    if (!userMainGrid || Number(userMainGrid.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "Problema não encontrado" });
      return;
    }

    await UserMainGrid.update(req.body, { where });

    const resData = await UserMainGrid.findOne({ where });

    res.status(200).send({ status: "ok", data: resData });
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const userMainGrid = await UserMainGrid.findOne({ where });

    if (!userMainGrid || Number(userMainGrid.id) !== Number(req.params.id)) {
      res.status(400).send({ message: "Problema não encontrado" });
      return;
    }

    await UserMainGrid.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
