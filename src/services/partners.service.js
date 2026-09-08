const { Partners } = require("../models");

/**
 * Só a verificação de código sobrou: é o que o cadastro do site consome
 * (`features/auth/api.ts` → `GET /partners/verify-code/:code`). O CRUD de
 * parceiros e as parcerias de usuário não tinham consumidor.
 */
module.exports = class PartnersController {
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
