/**
 * Saque do colaborador — Pix via Asaas.
 *
 * O dinheiro nasce em `user_commissions` (livro-caixa, tudo `pending`) e é
 * cacheado em `user.balance`. O saque é o único ponto que fecha o ciclo:
 * transfere no Asaas, promove as comissões liquidadas para `paid` e debita a
 * carteira. Sem isso a mesma comissão poderia ser paga de novo no mês seguinte.
 *
 * @see docs/contextos/colaborador-ganhos.md
 */

const { User, UserPayout, UserCommission } = require('../models');
const {
  ok,
  badRequest,
  notFound,
  serverError,
} = require('../utils/httpResponse');
const {
  buildTransferPayloadAsaas,
  valueToCentsAsaas,
} = require('./payments/gateways/asaas/asaas-rules');
const { createTransferAsaas } = require('./payments/gateways/asaas/asaas-api');
const { AsaasError } = require('./payments/gateways/asaas/asaas-client');
const { isConfiguredAsaas } = require('./payments/gateways/asaas/asaas-config');
const {
  resolveWalletBalance,
  toMoney,
} = require('./contributor/contributor-earnings-rules');
const {
  validatePayoutRequest,
  resolveCommissionsToSettle,
  netPayoutAmount,
  formatReais,
} = require('./payouts/payout-rules');

const PAYOUT_STATUS_PAID = 'paid';
const COMMISSION_STATUS_PENDING = 'pending';
const COMMISSION_STATUS_PAID = 'paid';

class UserPayoutsServices {
  /**
   * POST /request-payout
   * body: { amount } — valor em reais.
   */
  async requestPayout(req, res) {
    // O usuário vem do token (`req.params.userId`, injetado por
    // `AuthenticateRoute(['user'])`). Aceitar id do corpo deixava qualquer
    // autenticado sacar o saldo de outro.
    const userId = Number(req.params && req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return badRequest(res, 'Usuário inválido');
    }

    try {
      const user = await User.findOne({
        where: { id: userId },
        attributes: ['id', 'balance', 'chavePix', 'lastPayout'],
      });
      if (!user) {
        return notFound(res, 'Usuário não encontrado');
      }

      const validation = validatePayoutRequest({
        amountReais: req.body && req.body.amount,
        balanceReais: user.balance,
        lastPayoutAt: user.lastPayout,
        pixKey: user.chavePix,
        now: new Date(),
      });
      if (!validation.ok) {
        return badRequest(res, validation.message);
      }

      const { amountReais } = validation.value;

      if (!isConfiguredAsaas()) {
        // Falta de chave é erro de operação nossa, não do colaborador.
        console.error('Saque bloqueado: Asaas sem chave de API configurada.');
        return serverError(res, 'Saque indisponível no momento');
      }

      const transferPayload = buildTransferPayloadAsaas({
        valueCents: valueToCentsAsaas(netPayoutAmount(amountReais)),
        pixKey: user.chavePix,
        description: `Saque Designflix - colaborador ${userId}`,
      });
      if (!transferPayload.ok) {
        return badRequest(res, transferPayload.message);
      }

      // Nenhuma escrita antes daqui: transfer que falha não pode consumir saldo
      // nem quitar comissão.
      const asaasTransfer = await createTransferAsaas(transferPayload.payload);

      const paidAt = new Date();
      const payout = await UserPayout.create({
        userId,
        amount: amountReais,
        requestedAt: paidAt,
        paidAt,
        status: PAYOUT_STATUS_PAID,
      });

      const settlement = await this.settlePendingCommissions(
        userId,
        amountReais
      );

      const remainingBalance = toMoney(
        Math.max(resolveWalletBalance(user.balance) - amountReais, 0)
      );
      await User.update(
        { balance: remainingBalance, lastPayout: paidAt },
        { where: { id: userId } }
      );

      return ok(res, {
        message: `Saque de R$ ${formatReais(amountReais)} enviado via Pix.`,
        data: {
          payoutId: payout && payout.id,
          amount: amountReais,
          status: PAYOUT_STATUS_PAID,
          paidAt,
          balance: remainingBalance,
          transferId: (asaasTransfer && asaasTransfer.id) || null,
          transferStatus: (asaasTransfer && asaasTransfer.status) || null,
          settledCommissions: settlement.ids.length,
          settledTotal: settlement.settledTotal,
        },
      });
    } catch (error) {
      if (error instanceof AsaasError) {
        console.error('Erro do Asaas ao transferir saque:', error.message);
        return badRequest(res, error.message);
      }
      console.error('Erro ao processar saque:', error && error.message);
      return serverError(res, 'Erro ao processar saque');
    }
  }

  /**
   * POST /user/:userId/update-payout-method
   *
   * Com Pix não há método a escolher no gateway: o destino do saque é a chave
   * Pix do próprio usuário. O endpoint sobrevive só para cadastrá-la.
   */
  async choosePayoutMethod(req, res) {
    const userId = Number(req.params && req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return badRequest(res, 'Usuário inválido');
    }

    const body = req.body || {};
    const pixKey = String(body.pixKey || body.chavePix || '').trim();
    if (!pixKey) {
      return badRequest(res, 'Informe a chave Pix para receber o saque.');
    }

    try {
      const user = await User.findOne({
        where: { id: userId },
        attributes: ['id'],
      });
      if (!user) {
        return notFound(res, 'Usuário não encontrado');
      }

      await User.update({ chavePix: pixKey }, { where: { id: userId } });

      return ok(res, {
        message: 'Chave Pix atualizada.',
        data: { pixKey },
      });
    } catch (error) {
      console.error('Erro ao atualizar a chave Pix:', error && error.message);
      return serverError(res, 'Erro ao atualizar a chave Pix');
    }
  }

  /**
   * Promove para `paid` as comissões cobertas pelo valor sacado.
   *
   * Da mais antiga para a mais nova, para o resto que sobra `pending` ser
   * sempre o mais recente.
   */
  async settlePendingCommissions(userId, amountReais) {
    const pendingCommissions = await UserCommission.findAll({
      where: { user_id: userId, status: COMMISSION_STATUS_PENDING },
      attributes: ['id', 'amount'],
      order: [['created_at', 'ASC']],
      raw: true,
    });

    const settlement = resolveCommissionsToSettle(
      pendingCommissions,
      amountReais
    );
    if (settlement.ids.length) {
      await UserCommission.update(
        { status: COMMISSION_STATUS_PAID },
        { where: { id: settlement.ids } }
      );
    }

    return settlement;
  }
}

module.exports = new UserPayoutsServices();
module.exports.PAYOUT_STATUS_PAID = PAYOUT_STATUS_PAID;
module.exports.COMMISSION_STATUS_PAID = COMMISSION_STATUS_PAID;
