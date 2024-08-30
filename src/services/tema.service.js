
const { Tema, Tema_categories, TemaRequisito} = require("../models");

const db = require("../models");

module.exports = class {
  
  async create(req, res) {

    const temaData = req.body.data;
    const t = await db.sequelize.transaction();

    try {
      const tema = await Tema.create(temaData, {transaction: t});

      for(const categoryId of req.body.categories){
        await Tema_categories.create({
          id_tema: tema.id,
          id_category: categoryId
        }, {transaction: t});
      }

      for (const temaId of req.body.pre_requisito_obrigatorio) {
        await TemaRequisito.create({
          id_tema: tema.id,
          id_tema_requisito: temaId
        }, {transaction: t});
      }

      await t.commit();

      const resultData = await Tema.findOne({
        where : {id: tema.id},
        include: [
          {
            model: Tema_categories
          },{
            model: TemaRequisito
          }
        ]
      });

      return res.status(200).send({ data: resultData });

    } catch (error) {

      await t.rollback();
      return res.status(500).send({ message: error.message });

    }

  }

  async getAll(req, res) {
    const tema = await Tema.findAll({
      include: [{
        model: Tema_categories,
        attributes:['id_category']
      },{
        model: TemaRequisito,
        attributes:['id_tema_requisito'],
        include: [
          {
            as: 'tema_req',
            model: Tema
          }
        ]
      }
    ]});

    return res.status(200).send({ data: tema });
  }

  async getOne(req, res) {
    const tema = await Tema.findOne({
      include: [{
        model: Tema_categories,
        attributes:['id_category']
      },{
        model: TemaRequisito
      }
    ],
      where: { id: req.params.id },
    });

    return res.status(200).send({ data: tema });
  }

  async updateById(req, res) {
    try{
      const where = { id: Number(req.params.id) };

      await Tema.update(req.body, { where });

      await Tema_categories.destroy({ where: {
        id_tema : Number(req.params.id)
      }});

      req.body.categories.forEach(async categoryId => {
        try{
          await Tema_categories.create({
            id_tema: Number(req.params.id),
            id_category: categoryId
          });
        }
        catch(err){
          res.status(400).send({ message: err.message });
        }
      });

      res.status(200).send({ status: "ok" });

    }catch(err){
      res.status(500).send({ message: err.message });
    }
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    await Tema.destroy({ where });
    await Tema_categories.destroy({ where: {
      id_tema : req.params.id
    }})

    res.status(200).send({ status: "ok" });
  }
};
