const { Treinamento, Treinamento_categories, ProductCategory, Inscricao_treinamento, Installer, Tema, Tema_categories, TemaRequisito, Treinamento_requisito } = require("../models");
const config = require("../config/config.js");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(config);
const moment = require("moment");

const db = require("../models");

module.exports = class {
  async create(req, res) {

    const t = await db.sequelize.transaction();
    
    try {
      const treinamentoData = req.body.data;

      let dataInicio = moment(treinamentoData.inicio).utcOffset(0).set({hour:0,minute:0,second:0,millisecond:0});
      let dataFim = moment(treinamentoData.inicio).utcOffset(0).set({hour:0,minute:0,second:0,millisecond:0}).add(1, 'y');

      const tema = await Tema.findOne({where: {id: treinamentoData.id_tema}},  {transaction: t});

      const treinamentoDataAdd = {...treinamentoData, inicio:dataInicio, fim:dataFim, name: tema.name+' - '+treinamentoData.name};
      
      const treinamento = await Treinamento.create(treinamentoDataAdd, {transaction: t});

      const temaCategories = await Tema_categories.findAll({where: {id_tema: tema.id}},  {transaction: t});

      const temaReqs = await TemaRequisito.findAll({where: {id_tema: tema.id}},  {transaction: t});

      for (const cat of temaCategories) {
        await Treinamento_categories.create({
          id_treinamento: treinamento.id,
          id_category: cat.id_category
        }, {transaction: t} );
      }

      for (const reqOb of temaReqs) {
        await Treinamento_requisito.create({
          id_treinamento: treinamento.id,
          id_tema_requisito: reqOb.id_tema_requisito
        }, {transaction: t} );
      }
     
      await t.commit();

      const resultData = await Treinamento.findOne({
        where : {id: treinamento.id},
        include: [
          {
            model: Treinamento_categories
          },
          {
            model: Treinamento_requisito
          }
        ]
      });

      return res.status(200).send({ data: resultData });
    }  catch (error) {

      await t.rollback();
      return res.status(500).send({ message: error.message });

    }
    
  }

  async getAll(req, res) {
    const treinamento = await Treinamento.findAll({
      include: [{
        model: Treinamento_categories,
        attributes: ['id_category'],
        include: [{
          model: ProductCategory,
          attributes: ['name', 'url_icon'],          
        }]
      },
      {
        model: Treinamento_requisito,
        attributes: ['id_tema_requisito'],
        include:[
          {
            model: Tema,
            attributes: ['name'],
          }
        ] 
      }
    ]});

    return res.status(200).send({ data: treinamento });
  }

  async getByDate(req, res) {    
    try{
      const installer = await Installer.findOne({
        where: { id: parseInt(req.params.installerId) },
        attributes: { exclude: ["password"] },
      });
  
      let Op = Sequelize.Op;
      let andOp = Op.and;
      const filterData = req.body;
  
      let filterTime;
  
      if(!filterData.month){
        filterTime = {[andOp]:[
          sequelize.where(sequelize.fn('YEAR', sequelize.col('inicio')), filterData.year),
        ], inicio: {[Op.gte]: new Date()}}
      }
      else{
        filterTime = {[andOp]:[
          sequelize.where(sequelize.fn('YEAR', sequelize.col('inicio')), filterData.year),
          sequelize.where(sequelize.fn('MONTH', sequelize.col('inicio')), filterData.month)
        ], inicio: {[Op.gte]: new Date()}}
      }
  
      const treinamentos = await Treinamento.findAll({
        where: filterTime,
        include: [{
          model: Treinamento_categories,
          attributes: ['id_category'],
          include: [
            {
              model: ProductCategory,
              attributes: ['name'],
            },
          ]
        },
        {
          model: Treinamento_requisito,
          attributes: ['id_tema_requisito'],
          include:[{
            model: Tema,
            attributes: ['name']
          }]
        }
      ]});
      
      const treinamentosArray = [];
  
      for (let i = 0; i < treinamentos.length; i++) {
        const el = treinamentos[i].dataValues;
        const inscricoes = await Inscricao_treinamento.findAll({
          where: { id_treinamento: el.id, status: 'Inscrito' }
        });
  
        const inscricao = await Inscricao_treinamento.findOne({
          where: { id_instalador : installer.id, id_treinamento: el.id },
          attributes: ['status']
        });
        let treinamentoObj = {};
        if(inscricao && inscricao.status === "Inscrito"){
          treinamentoObj = {...el, status: inscricao.status};
        }
        else{
          if(inscricoes.length < el.n_vagas){
            treinamentoObj = {...el, status: "Não inscrito"};
          }
        }
        treinamentosArray.push(treinamentoObj);
      }
  
      let responseData = {
        treinamentos: treinamentosArray,
      };
  
      return res.status(200).send({ data: responseData });
    }catch(err){
      res.status(500).send({ message: err.message });
    }
    
  }

  async getDoneByDate(req, res) {    
    try{
      const installer = await Installer.findOne({
        where: { id: parseInt(req.params.installerId) },
        attributes: { exclude: ["password"] },
      });
  
      let Op = Sequelize.Op;
      let andOp = Op.and;
      const filterData = req.body;
  
      let filterTime;
  
      if(!filterData.month){
        filterTime = {[andOp]:[
          sequelize.where(sequelize.fn('YEAR', sequelize.col('inicio')), filterData.year),
        ], inicio: {[Op.lte]: new Date()}}
      }
      else{
        filterTime = {[andOp]:[
          sequelize.where(sequelize.fn('YEAR', sequelize.col('inicio')), filterData.year),
          sequelize.where(sequelize.fn('MONTH', sequelize.col('inicio')), filterData.month)
        ], inicio: {[Op.lte]: new Date()}}
      }
  
      const treinamentos = await Treinamento.findAll({
        where: filterTime,
        include: [{
          model: Treinamento_categories,
          attributes: ['id_category'],
          include: [
            {
              model: ProductCategory,
              attributes: ['name', 'url_icon'],
            },
          ]
        },
        {
          model: Treinamento_requisito
        }
      ]});
      
      const treinamentosArray = [];
  
      for (let i = 0; i < treinamentos.length; i++) {
        const el = treinamentos[i].dataValues;
  
        const inscricao = await Inscricao_treinamento.findOne({
          where: { id_instalador : installer.id, id_treinamento: el.id },
          attributes: ['status']
        });
        let treinamentoObj = {};

        if(inscricao){
          treinamentoObj = {...el, status: inscricao.status};
        }
        treinamentosArray.push(treinamentoObj);
      }
  
      let responseData = {
        treinamentos: treinamentosArray,
      };
  
      return res.status(200).send({ data: responseData });
    }catch(err){
      res.status(500).send({ message: err.message });
    }
    
  }
  

  async getOne(req, res) {
    const treinamento = await Treinamento.findOne({
      where: { id: req.params.id },
      include: [{
          model: Treinamento_categories,
          attributes: ['id_category'],
          include: [
            {
              model: ProductCategory,
              attributes: ['name'],
            },
          ]
        },
        {
          model: Treinamento_requisito
        }]
    });

    return res.status(200).send({ data: treinamento });
  }

  async updateById(req, res) {
    try {

      const where = { id: Number(req.params.id) };

      const oldTreinamento = await Treinamento.findOne({where: where});

      const timeNow = new Date();

      if(oldTreinamento.inicio > timeNow){
        const treinamentoData = req.body.data;

        await Treinamento.update(treinamentoData, { where });
        await Treinamento_categories.destroy({ where: {
          id_treinamento : oldTreinamento.id
        }});

        let uniq = a => [...new Set(a)];

        const cats = uniq(req.body.categories);

        cats.forEach(async categoryId => {
          if(typeof categoryId === 'number'){
            try{
              await Treinamento_categories.create({
                id_treinamento: oldTreinamento.id,
                id_category: categoryId
              });
            }
            catch(err){
              return res.status(400).send({ message: err.message });
            }
          }
          else{
            return res.status(500).send({ message: 'Invalid categories' });
          }
        });

        const treinamento = await Treinamento.findOne({where});

        return res.status(200).send({ data: treinamento });
      }
      else{
        return res.status(400).send({ message: 'Treinamento já iniciado! Não é possível editar.' });
      }

    } catch (err) {
      return res.status(500).send({ message: err.message });
    }
  }

  async deleteById(req, res) {
    try{
      const where = { id: Number(req.params.id) };

      const oldTreinamento = await Treinamento.findOne({where: where});

      const timeNow = new Date();

      if(oldTreinamento.inicio > timeNow){
        const where = { id: req.params.id };

        await Treinamento.destroy({ where });
        await Treinamento_categories.destroy({ where: {
          id_treinamento : req.params.id
        }});
        await Treinamento_requisito.destroy({ where: {
          id_treinamento : req.params.id
        }});
        await Inscricao_treinamento.destroy({ where: {
          id_treinamento : req.params.id
        }});

        res.status(200).send({ status: "ok" });
      }
      else{
        res.status(400).send({ message: 'Treinamento já iniciado! Não é possível deletar.' });
      }
    }
    catch(err){
      res.status(500).send({ message: err.message });
    }
  }

  async getInscritos(req, res) {
    try{
      let Op = Sequelize.Op;
      const treinamentoId = Number(req.params.id);

      const treinamento = await Treinamento.findOne({
        where: {
          id : treinamentoId,
        },
        include:[{
          model: Treinamento_requisito,
          include:[{
            model: Tema
          }]
        }]
      });      

      if(treinamento){
        const inscricoes = await Inscricao_treinamento.findAll({
          where: {
            id_treinamento: Number(req.params.id), [Op.or]: [
              {status: 'Inscrito'},
              {status: 'Aprovado'},
              {status: 'Reprovado'},
              {status: 'Expirado'}
            ]
          },
          attributes: [ 'status' ],
          include: [{
            model: Installer,
            attributes: { exclude: ["password"] }
          }]
        });
  
        const responseData = {
          treinamento: treinamento,
          inscricoes: inscricoes,
        }
  
        return res.status(200).send({ data: responseData });
      }
      else{
        return res.status(400).send({ message: 'Treinamento inválido!' });
      }
    }
    catch(err){
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }
};