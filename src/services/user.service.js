const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { User, UserMainGrid, UserPartners, Partners, sequelize } = require("../models");
const { sendEmail } = require("../utils/emailService");
const { PALN_COMMISSION } = require("../utils/constants/constants");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const DIR_key = path.join(__dirname, "../middleware/private.key");
const privateKey = fs.readFileSync(DIR_key);

class UserServices {
  async getAll(req, res) {
    const users = await User.findAll({ attributes: { exclude: ["password"] } });
    res.status(200).send({ data: users });
  }

  async getAllAvatars(req, res) {
    try {
      const users = await User.findAll({
        attributes: [
          "id",
          "name",
          "photo",
          "createdAt",
          [Sequelize.fn("COUNT", Sequelize.col("UserMainGrids.id")), "totalFiles"]
        ],
        where: {
          contributor: 1,
          acceptTerms: 1,
        },
        include: [
          {
            model: UserMainGrid,
            attributes: [],
            required: false,
            where: { activite: 0 },
          }
        ],
        having: Sequelize.where(
          Sequelize.fn("COUNT", Sequelize.col("UserMainGrids.id")),
          ">",
          0
        ),
        group: ["User.id"],
        order: [
          [Sequelize.literal("totalFiles"), "DESC"],
          ["createdAt", "DESC"]
        ]
      });

      // Converter para formato simples
      const formattedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        photo: user.photo,
        createdAt: user.createdAt,
        totalFiles: parseInt(user.dataValues.totalFiles) || 0
      }));

      res.status(200).send({ data: formattedUsers });
    } catch (err) {
      console.error("Erro em getAllAvatars:", err);
      res.status(500).send({ message: "Erro ao buscar fotos dos usuários.", error: err.message });
    }
  }

  async getAllUserContributor(req, res) {
    const acceptTerms = 0;
    const contributor = 1;
    const users = await User.findAll({
      where: { contributor: contributor, accept_terms: acceptTerms },
      attributes: { exclude: ["password"] },
    });
    res.status(200).send({ data: users });
  }

  async get(req, res) {
    const id = req.params.id;
    const user = await User.findOne({
      where: { id: id }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const simplifiedUser = this.simplifyUserData(user);
    res.status(200).send({ data: simplifiedUser });
  }

  async getUserByEmail(req, res) {
    const { email } = req.params;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email é obrigatório" });
    }

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res
          .status(200)
          .json({ success: false, message: "Usuário não encontrado" });
      }

      return res.status(200).json({ success: true, message: "Usuário encontrado" });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Erro interno do servidor" });
    }
  }

  // FIXME: Criar um service único que reunina todos os metodo da carteira.
  async userBalanceById(req, res) {
    const { userId } = req.params;
    try {
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["balance"],
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuário nao encontrado" });
      }
      const result = { success: true, data: user };
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao trazer balanço do usuário",
        error: error.message,
      });
    }
  }

  // FIXME: Criar um service único que reunina todos os metodo da carteira.
  async updateBalance(req, res) {
    const { userId } = req.params;
    try {
      const result = await this._updateBalance(userId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao atualizar o saldo",
        error: error.message,
      });
    }
  }

  // FIXME: Criar um service único que reunina todos os metodo da carteira.
  async _updateBalance(userId) {
    try {
      // Tenta encontrar o usuário
      const user = await User.findOne({ where: { id: userId } });

      if (user) {
        // Se o saldo for null, inicializa com 0.10
        if (user.balance === null) {
          await User.update({ balance: PALN_COMMISSION.comission_contributor / 100 }, { where: { id: userId } });
          return {
            success: true,
            message: "Saldo inicializado com sucesso",
          };
        } else {
          // Caso contrário, incrementa o saldo existente
          await User.increment("balance", {
            by: PALN_COMMISSION.comission_contributor / 100,
            where: { id: userId },
          });
          return {
            success: true,
            message: "Saldo atualizado com sucesso",
          };
        }
      } else {
        // Se o usuário não existir, cria um novo com saldo inicial 0.10
        await User.create({
          id: userId,
          balance: PALN_COMMISSION.comission_contributor / 100,
        });
        return {
          success: true,
          message: "Usuário criado e saldo inicial inserido com sucesso",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Erro ao atualizar o saldo",
        error: error.message,
      };
    }
  }

  // ✅ MÉTODO AUXILIAR: Simplificar dados do usuário com parcerias
  simplifyUserData(user) {
    const userData = user.dataValues;
    delete userData.password;

    // Simplificar parcerias
    if (userData.user_partners && userData.user_partners.length > 0) {
      userData.partners = userData.user_partners.map(partnership => ({
        id: partnership.id,
        startDate: partnership.startPartner,
        endDate: partnership.endPartner,
        active: partnership.active,
        partner: {
          id: partnership.partner?.id,
          name: partnership.partner?.name,
          code: partnership.partner?.code
        }
      }));
    } else {
      userData.partners = [];
    }

    // Remover array original
    delete userData.user_partners;

    return userData;
  }

  async getByEmail(email) {
    const user = await User.findOne({
      where: { email }
    });

    return user;
  }

  async create(req, res) {
    try {
      let {
        fullName,
        email,
        password,
        phone,
        countryCode,
        code_partner,
      } = req.body;

      const hasUserEmail = await this.getByEmail(email);
      if (hasUserEmail) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o e-mail informado" });
        return;
      }

      if (typeof password === "undefined") {
        let trimmedPhone = phone.replace(/\D/g, "");
        password = uuidv4() + trimmedPhone;
      }

      const status = "CACTIVE";

      const transaction = await sequelize.transaction();
      let user;

      try {
        let partnerId = null;
        if (code_partner && code_partner.trim() !== '') {
          const partner = await Partners.findOne({
            where: {
              code: code_partner.trim().toUpperCase(),
              active: 1
            },
            attributes: ['id', 'name', 'code']
          });

          if (!partner) {
            await transaction.rollback();
            res.status(400).json({
              success: false,
              message: "Código do parceiro inválido"
            });
            return;
          }

          partnerId = partner.id;
        }

        user = await User.create({
          name: fullName,
          email,
          password,
          phone,
          countryCode,
          status,
          partnerCode: code_partner || null,
        }, { transaction });

        if (partnerId) {
          await UserPartners.create({
            userId: user.id,
            partnerId: partnerId,
            startPartner: new Date(),
            endPartner: null,
            active: 1
          }, { transaction });
        }

        await transaction.commit();

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      const userData = user.dataValues;
      let getTokenData = await this.authenticateSync(email, password);
      delete userData.password;
      userData.token = getTokenData.token;

      const paramsEmail = {
        email: email,
        name: fullName,
        title: "FlixDesign - Usuário criado",
        description: "Sua conta foi criada com sucesso!",
      };

      const context = {
        name: paramsEmail.name,
        time: "Sua nova senha temporária é 123456",
        baseUrl: process.env.API_URL,
      };

      sendEmail(paramsEmail, "index", context)
        .then((response) => {
          console.log("Email enviado com sucesso:", response);
        })
        .catch((error) => {
          console.error("Erro ao enviar email:", error);
        });

      res.status(200).send({ user });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async createFromAdmin(req, res) {
    try {
      const { email, name, photo, phone, cpf } = req.body;

      let { password } = req.body;

      if (typeof password === "undefined") {
        let trimmedDoc = cpf.replace(/\D/g, "");
        let trimmedPhone = phone.replace(/\D/g, "");
        password = trimmedDoc + trimmedPhone;
      }

      const hasUserEmail = await this.getByEmail(email);

      if (hasUserEmail) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o e-mail informado" });
        return;
      }

      const hasUserCPF = await User.findOne({ where: { cpf } });
      if (hasUserCPF) {
        res
          .status(400)
          .send({ message: "Já existe um usuário com o cpf informado" });
        return;
      }

      const user = await User.create({
        email,
        password,
        name,
        photo,
        phone,
        cpf,
      });

      const userData = user.dataValues;

      delete userData.password;

      res.status(200).send({ user });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async authenticateSync(email, password) {
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return {
        status: 401,
        token: null,
        message: "Usuário não encontrado",
        userData: null,
      };
    }

    const validatePassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validatePassword) {
      return {
        status: 401,
        token: null,
        message: "E-mail ou senha incorreta",
        userData: null,
      };
    }

    let userData = user.dataValues;

    delete userData.password;

    userData.userType = "user";

    var token = jwt.sign(userData, privateKey, {
      algorithm: "RS256",
      expiresIn: 60 * 60 * 24 * 7 * 2,
    });

    return {
      status: 200,
      token: token,
      message: null,
      userData: userData,
    };
  }

  async authenticate(req, res) {
    try {
      const { email, password } = req.body;
      const user = await this.getByEmail(email);
      if (!user) {
        res.status(400).send({ message: "Usuário não encontrado" });
        return;
      }

      const validatePassword = await bcrypt.compare(
        password,
        user.password
      );

      if (!validatePassword) {
        res.status(400).send({ message: "E-mail ou Senha incorreta" });
        return;
      }

      let userData = user.dataValues;
      delete userData.password;
      userData.userType = "user";

      // ✅ SIMPLIFICAR: Usar método auxiliar para simplificar dados
      const simplifiedUserData = this.simplifyUserData(user);

      var token = jwt.sign(simplifiedUserData, privateKey, {
        algorithm: "RS256",
        expiresIn: 60 * 60 * 24 * 7 * 2,
      });

      res.status(200).send({ data: simplifiedUserData, token: token });
      return;
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async resetPasswordByEmail(req, res) {
    const scramble = (string) => {
      let a = string.split(""),
        n = a.length;

      for (let i = n - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a.join("");
    };

    if (!req.body.email) {
      res.status(400).send({ message: "Email é um parâmetro obrigatório" });
      return;
    }

    const time = scramble(String(new Date().getTime()).slice(2, 10));

    const encrypted = await bcrypt.hashSync(time, bcrypt.genSaltSync(10));
    const user = await this.getByEmail(req.body.email);

    if (!user) {
      res.status(400).send({ message: "Usuário não encontrado" });
    }

    await User.update(
      { password: encrypted, isResetPassword: 1 },
      {
        where: {
          id: user.id,
        },
      }
    );

    let transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST_SMTP,
      port: process.env.EMAIL_PORT_SMTP,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER_SMTP,
        pass: process.env.EMAIL_PASS_SMTP,
      },
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

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER_SMTP,
        to: user.email,
        subject: "Reset de Senha - FlixDesign",
        text: "",
        template: "index",
        context: {
          newPassword: time,
          name: user.name,
          baseUrl: process.env.API_URL,
        },
      };

      let sent = await transporter.sendMail(mailOptions);

      res
        .status(200)
        .send({ data: { message: "E-mail enviado com sucesso!", sent: sent } });
    } catch (err) {
      res
        .status(500)
        .send({ data: { message: "E-mail não enviado!", sent: err } });
    }
  }

  async updateUserProfile(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).send({ message: "userId é obrigatório" });
      }

      const where = { id: userId };
      const user = await User.findOne({ where });

      if (!user) {
        return res.status(404).send({ message: "Usuário não encontrado" });
      }

      //FIXME: Stripe com problema na conta conectada
      // Criar conta conectada no Stripe
      /* if (req.body.contributor) {
         const accountId = await stripeModule.createConnectedAccount(
           user.email
         );

         req.body.stripeAccountId = accountId;
       // Atualizar conta conectada para a chave pix
       if (req.body.chavePix) {
         await stripeModule.addPixKeyToAccount(
           user.stripeAccountId,
           req.body.chavePix
         );
       }*/

      let updatedUser = { ...user.dataValues, ...req.body };
      await User.update(updatedUser, { where });
      const userPublic = await User.findOne({ where, attributes: { exclude: ["password"] } });

      // Verifica se o usuário está solicitando ser contribuidor
      if (req.body.contributor === 1 && user.contributor !== 1) {
        const paramsEmail = {
          email: userPublic.email,
          name: userPublic.name,
          title: "Solicitação de Contribuidor - FlixDesign",
          description: "Recebemos sua solicitação para ser um contribuidor!",
        };

        const contextParams = {
          name: userPublic.name,
          requestDate: new Date().toLocaleDateString("pt-BR"),
          baseUrl: process.env.API_URL,
        };

        // Envia o email de confirmação para o usuário
        sendEmail(paramsEmail, "contributorRequest", contextParams)
          .then((response) => {
            console.log("Email de solicitação de contribuidor enviado com sucesso:", response);
          })
          .catch((error) => {
            console.error("Erro ao enviar email de solicitação de contribuidor:", error);
          });

        // Envia email para moderadores
        const moderators = [
          "orlandoneto23@gmail.com",
          "arlinofilho@gmail.com",
          "designflixs3@gmail.com"
        ];
        moderators.forEach((modEmail) => {
          const paramsMod = {
            email: modEmail,
            name: userPublic.name,
            title: "Nova Solicitação de Contribuidor - FlixDesign",
            description: `O usuário ${userPublic.name} (${userPublic.email}) solicitou ser contribuidor.`
          };
          sendEmail(paramsMod, "contributorRequestAdmin", {
            ...contextParams,
            email: userPublic.email
          })
            .then((response) => {
              console.log("Email de notificação para moderador enviado:", modEmail, response.messageId);
            })
            .catch((error) => {
              console.error("Erro ao enviar email para moderador:", modEmail, error);
            });
        });
      }

      res.status(200).send({
        data: userPublic,
        message: "Atualização concluída!",
      });
    } catch (err) {
      res.status(500).send({ message: "Ocorreu um erro." });
    }
  }

  async updateUserContributorInternal(req, res) {
    try {
      let idToUpdate = req.query.userId;

      const where = { id: idToUpdate };

      const oldUser = await User.findOne({ where });

      let updatedUser = { ...oldUser, ...req.body };

      await User.update(updatedUser, { where });

      const user = await User.findOne({ where });

      res.status(200).send({
        data: user,
        message: "Contributor Atualizado com sucesso!",
      });
    } catch (err) {
      res.status(500).send({ message: "Ocorreu um erro." });
    }
  }

  async removeUserPhoto(req, res) {
    const userId = req.params.userId;
    try {
      await User.update({ photo: null }, { where: { id: userId } });
      return res.status(200).json({ success: true, message: "Foto removida com sucesso" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteUser(req, res) {
    const userId = req.params.userId;

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado"
        });
      }

      await User.destroy({
        where: { id: userId }
      });

      return res.status(200).json({
        success: true,
        message: "Usuário excluído permanentemente com sucesso"
      });

    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor ao excluir usuário"
      });
    }
  }

  async updatePasswordById(req, res) {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Validações de entrada
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Senha atual, nova senha e confirmação são obrigatórias"
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Nova senha e confirmação não coincidem"
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Nova senha deve ter pelo menos 6 caracteres"
        });
      }

      // Buscar o usuário
      const user = await User.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado"
        });
      }

      // Verificar se a senha atual está correta
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Senha atual incorreta"
        });
      }

      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "A nova senha deve ser diferente da senha atual"
        });
      }

      // Criptografar a nova senha
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar a senha no banco
      await User.update(
        {
          password: hashedNewPassword,
          isResetPassword: 0, // Remove flag de reset de senha se existir
          lastPasswordChange: new Date() // Campo para invalidar tokens antigos
        },
        { where: { id: userId } }
      );

      // Log da alteração de senha
      console.log(`🔐 Senha alterada para usuário ID: ${userId} - Todos os tokens foram invalidados`);

      return res.status(200).json({
        success: true,
        message: "Senha alterada com sucesso. Faça login novamente.",
        requiresReauth: true // Flag para o frontend saber que precisa fazer login
      });

    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor ao alterar senha"
      });
    }
  }

}
module.exports = new UserServices();
