const { Partners, UserPartners, User } = require("../models");

module.exports = class PartnersController {
  async create(req, res) {
    try {
      const { name, code } = req.body;

      const partner = await Partners.create({
        name,
        code,
      });

      res.status(200).send({ data: partner });
    } catch (err) {
      console.error(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const partners = await Partners.findAll({
        where: { active: 1 },
        order: [["createdAt", "DESC"]],
      });

      res.status(200).send({ data: partners });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async getOne(req, res) {
    try {
      const { id } = req.params;
      const partner = await Partners.findOne({
        where: { id, active: 1 },
        include: [
          {
            model: UserPartners,
            as: "user_partners",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "name", "email"],
              },
            ],
          },
        ],
      });

      if (!partner) {
        return res.status(404).send({ message: "Parceiro não encontrado" });
      }

      res.status(200).send({ data: partner });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async updateById(req, res) {
    try {
      const where = { id: Number(req.params.id) };
      const body = { ...req.body };

      const [updated] = await Partners.update(body, { where });

      if (updated === 0) {
        return res.status(404).send({ message: "Parceiro não encontrado" });
      }

      const updatedPartner = await Partners.findOne({ where });

      res.status(200).send({ status: "ok", data: updatedPartner });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async deleteById(req, res) {
    try {
      const where = { id: req.params.id };

      const partner = await Partners.findOne({ where });

      if (!partner) {
        return res.status(404).send({ message: "Parceiro não encontrado" });
      }

      // Soft delete - apenas marcar como inativo
      await Partners.update({ active: 0 }, { where });

      res.status(200).send({ status: "ok", data: partner });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  // Métodos para gerenciar parcerias de usuários
  async createUserPartnership(req, res) {
    try {
      const { userId, partnerId, startPartner, endPartner } = req.body;

      const userPartnership = await UserPartners.create({
        userId,
        partnerId,
        startPartner,
        endPartner,
      });

      // Buscar dados completos
      const partnership = await UserPartners.findOne({
        where: { id: userPartnership.id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Partners,
            as: "partner",
            attributes: ["id", "name", "code"],
          },
        ],
      });

      res.status(200).send({ data: partnership });
    } catch (err) {
      console.error(err);
      res.status(400).send({ message: err.message });
    }
  }

  async getUserPartnerships(req, res) {
    try {
      const { userId } = req.params;

      const partnerships = await UserPartners.findAll({
        where: { userId, active: 1 },
        include: [
          {
            model: Partners,
            as: "partner",
            attributes: ["id", "name", "code"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).send({ data: partnerships });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async updateUserPartnership(req, res) {
    try {
      const { id } = req.params;
      const body = { ...req.body };

      const [updated] = await UserPartners.update(body, { where: { id } });

      if (updated === 0) {
        return res.status(404).send({ message: "Parceria não encontrada" });
      }

      const updatedPartnership = await UserPartners.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Partners,
            as: "partner",
            attributes: ["id", "name", "code"],
          },
        ],
      });

      res.status(200).send({ status: "ok", data: updatedPartnership });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async endUserPartnership(req, res) {
    try {
      const { id } = req.params;
      const { endPartner } = req.body;

      const partnership = await UserPartners.findOne({ where: { id } });

      if (!partnership) {
        return res.status(404).send({ message: "Parceria não encontrada" });
      }

      // Marcar como inativa e definir data de fim
      await UserPartners.update(
        {
          active: 0,
          endPartner: endPartner || new Date()
        },
        { where: { id } }
      );

      res.status(200).send({
        status: "ok",
        message: "Parceria encerrada com sucesso"
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  }

  async verifyPartnerCode(req, res) {
    try {
      const { code } = req.params;

      if (!code || code.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Código do parceiro é obrigatório"
        });
      }

      const partner = await Partners.findOne({
        where: {
          code: code.trim().toUpperCase(),
          active: 1
        },
        attributes: ['id', 'name', 'code']
      });

      if (partner) {
        return res.status(200).json({
          success: true,
          message: "Código do parceiro existe",
          data: {
            id: partner.id,
            name: partner.name,
            code: partner.code
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Código do parceiro não existe"
        });
      }

    } catch (error) {
      console.error("Erro ao verificar código do parceiro:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor"
      });
    }
  }
};
