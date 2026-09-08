/**
 * CRUD do catálogo de planos.
 *
 * É puramente local: o Asaas não tem catálogo remoto para espelhar (o preço
 * viaja em cada assinatura), então criar plano aqui não chama gateway nenhum.
 *
 * @see docs/contextos/plans.md
 */

const { Plans, UserPlans } = require('../models');
const {
  ok,
  badRequest,
  notFound,
  serverError,
} = require('../utils/httpResponse');
const {
  validatePlanBody,
  mapPlanAdmin,
  mapPlanPublic,
} = require('./plans/plans-rules');

const PLAN_ORDER = [
  ['sort_order', 'ASC'],
  ['price_cents', 'ASC'],
  ['id', 'ASC'],
];

class AdminPlansService {
  /** GET /admin/plans — inclui inativos e o legado da Stripe. */
  async listAdmin(req, res) {
    try {
      const plans = await Plans.findAll({ order: PLAN_ORDER });
      return ok(res, {
        message: 'Planos listados com sucesso',
        data: plans.map(mapPlanAdmin),
      });
    } catch (error) {
      console.error('Erro ao listar planos (admin):', error);
      return serverError(res, 'Erro ao listar planos');
    }
  }

  /** GET /plans — público, só o que está ativo. */
  async listPublic(req, res) {
    try {
      const plans = await Plans.findAll({
        where: { active: true },
        order: PLAN_ORDER,
      });
      return ok(res, {
        message: 'Planos disponíveis',
        data: plans.map(mapPlanPublic),
      });
    } catch (error) {
      console.error('Erro ao listar planos (público):', error);
      return serverError(res, 'Erro ao listar planos');
    }
  }

  /** GET /admin/plans/:id */
  async getById(req, res) {
    try {
      const planId = Number(req.params.id);
      if (!Number.isInteger(planId) || planId < 1) {
        return badRequest(res, 'Id de plano inválido');
      }

      const plan = await Plans.findByPk(planId);
      if (!plan) {
        return notFound(res, 'Plano não encontrado');
      }

      return ok(res, {
        message: 'Plano encontrado',
        data: mapPlanAdmin(plan),
      });
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      return serverError(res, 'Erro ao buscar plano');
    }
  }

  /** POST /admin/plans */
  async create(req, res) {
    try {
      const validation = validatePlanBody(req.body);
      if (!validation.ok) {
        return badRequest(res, validation.message);
      }

      const duplicated = await Plans.findOne({
        where: { plan_name: validation.value.plan_name },
      });
      if (duplicated) {
        return badRequest(res, 'Já existe um plano com esse plan_name');
      }

      const plan = await Plans.create(validation.value);
      return ok(res, {
        message: 'Plano criado com sucesso',
        data: mapPlanAdmin(plan),
      });
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      return serverError(res, 'Erro ao criar plano');
    }
  }

  /** PUT /admin/plans/:id */
  async update(req, res) {
    try {
      const planId = Number(req.params.id);
      if (!Number.isInteger(planId) || planId < 1) {
        return badRequest(res, 'Id de plano inválido');
      }

      const plan = await Plans.findByPk(planId);
      if (!plan) {
        return notFound(res, 'Plano não encontrado');
      }

      const validation = validatePlanBody(req.body);
      if (!validation.ok) {
        return badRequest(res, validation.message);
      }

      const duplicated = await Plans.findOne({
        where: { plan_name: validation.value.plan_name },
      });
      if (duplicated && duplicated.id !== plan.id) {
        return badRequest(res, 'Já existe um plano com esse plan_name');
      }

      await plan.update(validation.value);
      return ok(res, {
        message: 'Plano atualizado com sucesso',
        data: mapPlanAdmin(plan),
      });
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      return serverError(res, 'Erro ao atualizar plano');
    }
  }

  /**
   * DELETE /admin/plans/:id
   *
   * Plano com assinante não é apagado — vira inativo. Apagar quebraria o
   * histórico de quem já assinou e deixaria `user_plans.plan_id` órfão.
   */
  async remove(req, res) {
    try {
      const planId = Number(req.params.id);
      if (!Number.isInteger(planId) || planId < 1) {
        return badRequest(res, 'Id de plano inválido');
      }

      const plan = await Plans.findByPk(planId);
      if (!plan) {
        return notFound(res, 'Plano não encontrado');
      }

      const subscribersCount = await UserPlans.count({
        where: { plan_id: planId },
      });

      if (subscribersCount > 0) {
        await plan.update({ active: false });
        return ok(res, {
          message: 'Plano tem assinantes e foi arquivado em vez de removido',
          data: mapPlanAdmin(plan),
          meta: { archived: true, subscribersCount },
        });
      }

      await plan.destroy();
      return ok(res, {
        message: 'Plano removido com sucesso',
        meta: { archived: false, subscribersCount: 0 },
      });
    } catch (error) {
      console.error('Erro ao remover plano:', error);
      return serverError(res, 'Erro ao remover plano');
    }
  }
}

module.exports = new AdminPlansService();
