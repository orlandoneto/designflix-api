
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");

const Sequelize = require("sequelize");

const { ProductManual, ProductVideo, ProductCategory, Tema_categories } = require("../models");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

const schedule = require('node-schedule');

module.exports = class {
  async create(req, res) {
    try {
      const productCategory = await ProductCategory.create(req.body);

      res.status(200).send({ data: productCategory });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    const productCategories = await ProductCategory.findAll({
      include:[{
        model: ProductManual
      },
      {
        model: ProductVideo
      }]
    });

    return res.status(200).send({ data: productCategories });
  }

  async getOne(req, res) {


    const productCategory = await ProductCategory.findOne({
      where: { id: req.params.id },
      include:[{
        model: ProductManual
      },
      {
        model: ProductVideo
      }]
    });


    return res.status(200).send({ data: productCategory });
  }

  async updateById(req, res) {
    const where = { id: Number(req.params.id) };

    await ProductCategory.update(req.body, { where });

    res.status(200).send({ status: "ok" });
  }

  async deleteById(req, res) {
    try{
      const temaCategory = await Tema_categories.findOne({ where: { id_category: req.params.id }});
      const treinamentoCategory = await Treinamento_categories.findOne({ where: { id_category: req.params.id }});

      if(!temaCategory && !treinamentoCategory){
        const where = { id: req.params.id };
        await ProductCategory.destroy({ where });
        res.status(200).send({ status: "ok" });
      }
      else{
        res.status(400).send({ message: "Categoria associada, não pode ser deletada!" });
      }
    }
    catch(e){
      res.status(500).send({ message: e.message });
    }

  }
};
