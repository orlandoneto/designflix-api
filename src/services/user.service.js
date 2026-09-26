const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-handlebars");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { User, UserMainGrid, UserPartners, Partners, ContributorApplication, sequelize, Sequelize } = require("../models");
const { sendEmail } = require("../utils/emailService");
const { ok, notFound, serverError, badRequest } = require("../utils/httpResponse");
const { mapAccount } = require("./contributor/contributor-rules");
const { commissionPerDownloadReais } = require("./contributor/contributor-earnings-rules");
const {
  mapAdminUserListItem,
  matchesRoleFilter,
  matchesSearch,
} = require("./user/admin-user-list");

const jwt = require("jsonwebtoken");
const fs = require("fs");

class UserServices {
  async getAll(req, res) {
    try {
      const role = String(req.query.role || "all").trim();
      const allowedRoles = ["all", "contributor", "customer_only"];
      if (!allowedRoles.includes(role)) {
        return badRequest(res, "role inválido. Use all, contributor ou customer_only");
      }

      const users = await User.findAll({
        attributes: { exclude: ["password"] },
        order: [["id", "DESC"]],
      });

      const mapped = users
        .map((row) => mapAdminUserListItem(row))
        .filter(Boolean)
        .filter((item) => matchesRoleFilter(item, role))
        .filter((item) => matchesSearch(item, req.query.q));

      return ok(res, {
        message: "Usuários listados",
        data: mapped,
        meta: {
          total: mapped.length,
          role,
          q: String(req.query.q || "").trim() || null,
        },
      });
    } catch (err) {
      console.error("[admin/users]", err.message);
      return serverError(res, "Erro ao listar usuários");
    }
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
          [Sequelize.Op.or]: [{ contributorStatus: "active" }, { contributor: 1 }],
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

  async get(req, res) {
    try {
      const id = req.params.id;
      const user = await User.findByPk(id);
      if (!user) {
        return notFound(res, "Usuário não encontrado");
      }
      const application = await ContributorApplication.findOne({
        where: { userId: id },
        order: [["createdAt", "DESC"]],
      });
      return ok(res, {
        message: "Conta carregada",
        data: mapAccount(user, application),
      });
    } catch (err) {
      console.error("[user/get]", err);
      return serverError(res, "Erro ao carregar a conta");
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
  /**
   * Credita uma comissão no saldo do colaborador.
   *
   * Nunca cria usuário: id sem cadastro é erro do chamador, e inventar a
   * linha faria dinheiro parar numa conta que ninguém opera.
   */
  async _updateBalance(userId) {
    const amount = commissionPerDownloadReais();

    try {
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["id", "balance"],
      });

      if (!user) {
        return {
          success: false,
          message: "Usuário não encontrado para creditar saldo",
        };
      }

      // `increment` em coluna NULL continua NULL no MySQL — daí o set direto.
      if (user.balance === null) {
        await User.update({ balance: amount }, { where: { id: userId } });
        return { success: true, message: "Saldo inicializado com sucesso" };
      }

      await User.increment("balance", {
        by: amount,
        where: { id: userId },
      });
      return { success: true, message: "Saldo atualizado com sucesso" };
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

  async removeUserPhoto(req, res) {
    const userId = req.params.userId;
    try {
      await User.update({ photo: null }, { where: { id: userId } });
      return ok(res, { message: "Foto removida com sucesso", data: { photo: null } });
    } catch (err) {
      console.error("[user/removePhoto]", err.message);
      return serverError(res, "Erro ao remover a foto");
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
