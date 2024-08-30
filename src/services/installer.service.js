const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");

const Sequelize = require("sequelize");

const {
  Tema,
  Treinamento,
  Installer,
  Inscricao_treinamento,
  Installer_categories,
  Treinamento_categories,
  ProductCategory,
  Treinamento_requisito
} = require("../models");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

const schedule = require('node-schedule');

const googleServices = require('./google.service');

const google = new googleServices();

class InstallerClass{
  async getByEmail(email) {
    const installer = await Installer.findOne({
      where: { email },
    });
    return installer;
  }

  async get(req, res) {
    const installer = await Installer.findOne({
      where: { id: parseInt(req.query.installerId) },
      attributes: { exclude: ["password"] },
    });

    res.status(200).send({ data: installer });
  }

  async getSelf(req, res) {
    try{
      const installer = await Installer.findOne({
        where: { id: parseInt(req.params.installerId) },
        attributes: { exclude: ["password"] },
        include:[{
          model: Installer_categories,
          attributes: ['id_category'],
          include:[{
            model: ProductCategory,
            attributes: ['name', 'url_icon']
          }]
        }]
      });

      const productCategories = await ProductCategory.findAll();

      const responseData = {
        data: installer,
        allCategories: productCategories
      };
  
      res.status(200).send(responseData);

    }catch(err){
      res.status(500).send({ message: err.message });
    }
  }


  async getAll(req, res) {
    const installers = await Installer.findAll({
      attributes: { exclude: ["password"] },
      order: [
        ["status", "ASC"],
        ["name", "ASC"],
      ],
    });

    res.status(200).send({ data: installers });
  }

  async authenticateSync(email, password)  {

    const installer = await Installer.findOne({
      where: { email },
    });

    if (!installer) {
      return {
        status: 401,
        token: null,
        message: "Usuário não encontrado",
        installerData: null
      }
    }

    const validatePassword = await bcrypt.compareSync(
      password,
      installer.password
    );

    if (!validatePassword) {
      return {
        status: 401,
        token: null,
        message: "E-mail ou senha incorreta",
        installerData: null
      }
    }

    let installerData = installer.dataValues;

    delete installerData.password;

    installerData.userType = 'installer';      

    var token = jwt.sign(
      installerData,
      privateKey,
      { algorithm: "RS256",
        expiresIn: 60 * 60 * 24 * 7 * 2 
      }
    );

    return {
      status: 200,
      token: token,
      message: null,
      installerData: installerData
    }
  }

  async authenticate(req, res) {
    try {
      const getTokenOrFail = await this.authenticateSync(req.body.email, req.body.password);

      if(getTokenOrFail.status === 200){
        res.status(200).send({ data: getTokenOrFail.installerData, token: getTokenOrFail.token });
      }
      else{
        res.status(getTokenOrFail.status).send({ data: getTokenOrFail.message, token: getTokenOrFail.token });
      }
      
      return;
    } catch (err) {      
      res.status(401).send({ message: err.message });
    }
  }

  async resetPassword(req, res) {

    const scramble = (string) =>  {
        let a = string.split(""),
            n = a.length;
    
        for(let i = n - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a.join("");
    }

    if (!req.body.email) {
      res.status(400).send({ message: "email é um parâmetro obrigatório" });
      return;
    }

    const time = scramble(String(new Date().getTime()).slice(2, 10));

    const encrypted = await bcrypt.hashSync(
      time,
      bcrypt.genSaltSync(10)
    );

    const installer = await this.getByEmail(req.body.email);

    if (!installer) {
      res.status(400).send({ message: "usuário não encontrado" });
    }

    await Installer.update(
      { password: encrypted, isResetPassword: 1 },
      {
        where: {
          id: installer.id,
        },
      }
    );

    let transporter = nodemailer.createTransport({
      host: "email-smtp.us-east-1.amazonaws.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER_SMTP,
        pass: process.env.EMAIL_PASS_SMTP
      }      
    });

    transporter.use(
      "compile",
      hbs({
        viewEngine: {
          extName: ".hbs",
          partialsDir: path.resolve(__dirname, "../views"),
          defaultLayout: false,
        },
        viewPath: path.resolve(__dirname, "../views"),
        extName: ".hbs",
      })
    );

    try{
      const mailOptions = {
        from: process.env.EMAIL_TO_SEND,
        to: installer.email,
        subject: "Reset de Senha - DesignFlix",
        text: "",
        template: "index",
        context: {
          newPassword: time,
          name: installer.name,
        },
      };
  
      let sent = await transporter.sendMail(mailOptions);
  
      res.status(200).send({ data: { message: "E-mail enviado com sucesso!", sent: sent } });
    }
    catch(err){
      res.status(500).send({ data: { message: "E-mail não enviado!", sent: err } });
    };
  }

  async create(req, res) {
    try {
      let {
        name, 
        fantasy, 
        razao_social, 
        photo, 
        documentPhoto,
        email,
        password,
        documento,
        phone,
        stateRegistration,
        isResetPassword, 
        postalCode, 
        street, 
        number, 
        complement,
        district,
        city, 
        state, 
        country, 
      } = req.body;

      let addressGetLatLong = street+', '+number+', '+city+', '+state+', '+country+', '+postalCode;

      const latLongResponse = await google.getLatLongService(addressGetLatLong);

      if(latLongResponse){

        const lat = latLongResponse.data.results[0].geometry.location.lat;
        const long = latLongResponse.data.results[0].geometry.location.lng;

        if(typeof password === 'undefined'){
          let trimmedDoc = documento.replace(/\D/g, "");
          let trimmedPhone = phone.replace(/\D/g, "");
          password = trimmedDoc+trimmedPhone;
        }
  
        if(email === ''){
          return res
            .status(400)
            .send({ message: "É necessário informar um e-mail!" });
          ;
        }
  
        const hasUserEmail = await Installer.findOne({ where: { email } });
        if (hasUserEmail) {
          return res
            .status(400)
            .send({ message: "Já existe um usuário com o e-mail informado" });
          ;
        }
  
        const hasUserDocumento = await Installer.findOne({
          where: { documento },
        });
        if (hasUserDocumento) {
          return res
            .status(400)
            .send({ message: "Já existe um usuário com o documento informado" });
          ;
        }
  
        const installer = await Installer.create({
          name, 
          fantasy, 
          razao_social, 
          photo, 
          documentPhoto,
          email,
          password,
          documento,
          phone,
          stateRegistration,
          isResetPassword, 
          postalCode, 
          street, 
          number, 
          complement,
          district,
          city, 
          state, 
          country, 
          status: "APEND",
          statusMessage: null,
          lat,
          long
        });
  
        const installerData = installer.dataValues;
  
        let getTokenData = await this.authenticateSync(email, password);
  
        delete installerData.password;
  
        installerData.token = getTokenData.token;
  
        return res.status(200).send({ data: installerData });
      }
      else{
        return res.status(400).send({ message: 'Endereço Inválido, não foi possível recuperar as coordenadas.' });
      }

      
    } catch (err) {
      console.log(err);
      return res.status(400).send({ message: err.message });
    }
  }

  async update(req, res) {
    let shouldUpdate = true;
    let idToUpdate;
    let self = false;

    if(req.params.userType === 'installer'){
      idToUpdate = req.params.installerId;
      self = true;
    }

    if(req.params.userType === 'admin' || req.params.userType === 'super_admin'){
      idToUpdate = req.query.installerId;
    }

    if(req.params.userType === 'user'){
      shouldUpdate = false;
    }

    if(shouldUpdate){
      const where = { id: idToUpdate };

      const oldInstaller = await Installer.findOne({ where });

      if(self && req.body.hasOwnProperty('status')){
        res.status(401).send({ message: 'Você não pode fazer isto!' });
      }
      else{
        let updatedInstaller = { ...oldInstaller, ...req.body  };

        if (req.body.password) {
          updatedInstaller.password = await bcrypt.hashSync(
            req.body.password,
            bcrypt.genSaltSync(10)
          );
        }

        await Installer.update(updatedInstaller, { where });

        const installer = await Installer.findOne({ where });

        res.status(200).send({ data: installer });
      }      
    }
    else{
      res.status(401).send({ message: 'Você não pode fazer isto!' });
    }
    
  }

  async approve(req, res) {
    try {
      const where = { id: req.query.installerId };

      await Installer.update(
        {
          status: "CACTIVE",
        },
        { where: where }
      );

      res.status(200).send({ success: true });
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }


  async inscricao(req, res) {
    try {
      const installer = await Installer.findOne({
        where: { id: parseInt(req.params.installerId) },
        attributes: { exclude: ["password"] },
      });

      const treinamento = await Treinamento.findOne({
        where: { id: parseInt(req.body.id_treinamento) }
      });

      const treinamento_requisitos = await Treinamento_requisito.findAll({
        where: {id_treinamento: treinamento.id}
      });

      const inscricao = await Inscricao_treinamento.findOne({
        where: { id_instalador:  installer.id, id_treinamento: treinamento.id}
      });

      const inscricoes = await Inscricao_treinamento.findAll({
        where: { id_treinamento: treinamento.id , status: 'Inscrito'}
      });      

      const action = req.body.action;

      let treinamentoOpen = false;

      let requisitosOk = false;

      const timeNow = new Date();

      if(action && (action === 'inscrever' || action === 'cancelar')){

        if(installer.status !== 'CACTIVE'){        
          return res.status(400).send({ message: 'Instalador não ativo!' });
        }

        if(treinamento.inicio > timeNow){
          if(action === 'inscrever'){
            if(inscricoes.length < treinamento.n_vagas){
              treinamentoOpen = true;
            }
            else{
              return res.status(400).send({ message: 'Número de vagas esgotado!' });
            }
          }
          else{
            treinamentoOpen = true;
          }
        }
        else{
          return res.status(400).send({ message: 'Período de inscrição finalizado' });
        }

        if(action === 'inscrever'){
          if(treinamentoOpen){
            if(treinamento_requisitos){
              let reqsOk = [];
              if(treinamento_requisitos.length === 0){
                requisitosOk = true;
              }
              else{
                for (const requisito of treinamento_requisitos) {
                  let reqOk = false;
    
                  const temaRequisito = await Tema.findOne({
                    where: { id: requisito.id_tema_requisito }
                  });
    
                  const treinamentosCumpreRequisito = await Treinamento.findAll({
                    where: { id_tema:  temaRequisito.id}
                  });
    
                  for (const treinamentoCumpreReq of treinamentosCumpreRequisito) {
    
                    const incricaoTreinamentosCumpreRequisito = await Inscricao_treinamento.findOne({
                      where: { id_instalador:  installer.id, id_treinamento: treinamentoCumpreReq.id, status: "Aprovado"}
                    });
    
                    if(incricaoTreinamentosCumpreRequisito){
                      reqOk = true;
                    }
                    
                  }
    
                  reqsOk.push(reqOk);
                  
                }
    
                if(reqsOk.length === treinamento_requisitos.length){
                  const checker = array => array.every(v => v === true);
                  if(checker(reqsOk)){
                    requisitosOk = true;
                  }
                  else{
                    return res.status(400).send({ message: 'Instalador não possui todos pré-requisitos!' });
                  }
                }
                else{
                  return res.status(500).send({ message: 'Erro!' });
                }
    
              }
            }
          }    
        }
        else{
          requisitosOk = true;
        }
            

        if(requisitosOk){
          if(action === 'inscrever'){
            if(!inscricao){
              await Inscricao_treinamento.create({
                id_instalador: installer.id, id_treinamento: treinamento.id, status: "Inscrito"
              });
            }
            else{
              if(inscricao.status === 'Cancelado'){
                await Inscricao_treinamento.update({
                  id_instalador: installer.id, 
                  id_treinamento: treinamento.id, 
                  status: "Inscrito"
                }, {where : {id: inscricao.id}});
              }
              else{
                return res.status(400).send({ message: "Só é possível se inscrever se o status da inscrição for 'Não inscrito' ou 'Cancelado'." });
              }
            }
          }
          if(action === 'cancelar'){
            if(!inscricao){
              return res.status(400).send({ message: 'Não é possível cancelar uma inscrição inexistente' });
            }
            else{
              if(inscricao.status === 'Inscrito'){
                await Inscricao_treinamento.update({
                  id_instalador: installer.id, 
                  id_treinamento: treinamento.id, 
                  status: "Cancelado"
                }, {where: {id: inscricao.id}});
              }
              else{              
                return res.status(400).send({ message: "Só é possível cancelar se for 'Inscrito'." });
              }
            }
          }
          const inscricaoUpdated = await Inscricao_treinamento.findOne({
            where: { id_instalador:  installer.id, id_treinamento: treinamento.id}
          });
          return res.status(200).send({ success: inscricaoUpdated }); 
        }
      }
      else{
        return res.status(400).send({ message: 'Ação inválida!' });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  }

  async atualiza_categorias(id){
    try{
      const installer = await Installer.findOne({
        where: { id: parseInt(id) },
        attributes: { exclude: ["password"] },
      });
      
      const old_installer_categories = await Installer_categories.findAll({
        where: { id_installer : installer.id }
      });

      const inscricoes_aprovadas = await Inscricao_treinamento.findAll({
        where: { id_instalador : installer.id, status: 'Aprovado' }
      });

      let treinamentosValidos = [];
      let inscricoesExpiradas = [];

      for (let i = 0; i < inscricoes_aprovadas.length; i++) {
        const inscricao = inscricoes_aprovadas[i];
        const timeNow = new Date();
        const treinamento = await Treinamento.findOne({where: {id: inscricao.id_treinamento}});
        const treinamentoObj = treinamento.dataValues;
        if(treinamentoObj.inicio < timeNow && timeNow < treinamentoObj.fim){          
          treinamentosValidos.push(treinamentoObj);
        }
        else{
          inscricoesExpiradas.push(inscricao);
        }
      }

      for (let j = 0; j < inscricoesExpiradas.length; j++) {
        const inscricao = inscricoesExpiradas[j];
        await Inscricao_treinamento.update({
          status: "Expirado"
        }, {where : {id: inscricao.id}});
      }

      const new_categories = [];

      for (let k = 0; k < treinamentosValidos.length; k++) {
        const treinamento_categories = await Treinamento_categories.findAll({
          where: { id_treinamento: treinamentosValidos[k].id}
        });
        for (let l = 0; l < treinamento_categories.length; l++) {
          const categoria = treinamento_categories[l];
          new_categories.push(categoria.id_category);
        }
      }

      const new_categories_unique = new_categories.filter((elem, pos) => {
        return new_categories.indexOf(elem) == pos;
      });

      await Installer_categories.destroy({where: { id_installer : installer.id}});

      for (let m = 0; m < new_categories_unique.length; m++) {
        const new_categorie = new_categories_unique[m];
        await Installer_categories.create({
          id_installer: installer.id,
          id_category: new_categorie
        });        
      }

      let lost_categories = [];

      for (let n = 0; n < old_installer_categories.length; n++) {
        const old_categorie = old_installer_categories[n].dataValues.id_category;
        if(!new_categories_unique.includes(old_categorie)){
          lost_categories.push(old_categorie);
        }
      }

      const dataReturn = {
        new_categories: new_categories_unique,
        lost_categories: lost_categories
      }

      return dataReturn;

    }catch(err){
      console.log(err);
      return err.message
    }
  }

  async aprovacao_treinamento(req, res) {
    try {

      const Op = Sequelize.Op;
      const installer = await Installer.findOne({
        where: { id: parseInt(req.params.id) },
        attributes: { exclude: ["password"] },
      });

      const treinamento = await Treinamento.findOne({
        where: { id: parseInt(req.body.id_treinamento) }
      });

      const inscricao = await Inscricao_treinamento.findOne({
        where: { id_instalador:  installer.id, id_treinamento: treinamento.id, [Op.or]: [
          { status: 'Inscrito' },
          { status: 'Aprovado' },
          { status: 'Reprovado' }
        ]}
      });

      const action = req.body.action;

      let treinamentoOpen = false;

      const timeNow = new Date();

      if(inscricao && action && (action === 'aprovar' || action === 'reprovar')){

        if(installer.status !== 'CACTIVE'){        
          return res.status(400).send({ message: 'Instalador não ativo!' });
        }

        if(treinamento.inicio < timeNow && timeNow < treinamento.fim){
          treinamentoOpen = true;
        }
        else{
          return res.status(400).send({ message: 'Treinamento fora do período de aprovação/reprovação.' });
        }

        if(treinamentoOpen){
          if(action === 'aprovar'){
            await Inscricao_treinamento.update({
              id_instalador: installer.id, 
              id_treinamento: treinamento.id, 
              status: "Aprovado"
            }, {where : {id: inscricao.id}});
          }
          if(action === 'reprovar'){
            await Inscricao_treinamento.update({
              id_instalador: installer.id, 
              id_treinamento: treinamento.id, 
              status: "Reprovado"
            }, {where : {id: inscricao.id}});
          }
          const inscricaoUpdated = await Inscricao_treinamento.findOne({
            where: { id_instalador:  installer.id, id_treinamento: treinamento.id}
          });
          
          const catChange = await this.atualiza_categorias(installer.id);

          return res.status(200).send({ success: inscricaoUpdated, categories: catChange }); 
        }
      }
      else{
        return res.status(400).send({ message: 'Ação inválida!' });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: err.message });
    }
  };

};

module.exports = InstallerClass;

const installerService = new InstallerClass();

schedule.scheduleJob('0 0 * * *', async () => { 
  const installers = await Installer.findAll();
  for (let index = 0; index < installers.length; index++) {
    const installer = installers[index];
    await installerService.atualiza_categorias(installer.id);
  }
});