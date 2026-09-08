/**
 * Regras de saque do colaborador — funções puras, sem banco e sem rede.
 *
 * O saque paga em Pix pelo Asaas e quita comissões `pending` do livro-caixa
 * (`user_commissions`). Toda a matemática e as guardas ficam aqui para o
 * service só orquestrar I/O.
 *
 * @see docs/contextos/colaborador-ganhos.md
 */

const {
  payoutMinimumReais,
  resolveWalletBalance,
  toMoney,
} = require('../contributor/contributor-earnings-rules');

/**
 * Gancho para taxa de saque, zerado por default.
 *
 * A taxa de 1,49% + R$ 0,25 que existia era da Stripe e foi embora com ela:
 * hoje o colaborador recebe exatamente o valor pedido.
 */
const PAYOUT_FEE_REAIS = 0;

/** Dinheiro em pt-BR para mensagem de usuário final. */
function formatReais(value) {
  return toMoney(value).toFixed(2).replace('.', ',');
}

/**
 * Um saque por mês.
 *
 * Compara mês **e** ano: só o mês fazia um saque de setembro/2025 bloquear
 * setembro/2026.
 */
function hasPayoutInCurrentMonth(lastPayoutAt, now = new Date()) {
  if (!lastPayoutAt) return false;

  const last =
    lastPayoutAt instanceof Date ? lastPayoutAt : new Date(lastPayoutAt);
  if (Number.isNaN(last.getTime())) return false;

  const reference = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(reference.getTime())) return false;

  return (
    last.getFullYear() === reference.getFullYear() &&
    last.getMonth() === reference.getMonth()
  );
}

/**
 * Valida a solicitação de saque contra saldo, mínimo, janela mensal e destino.
 *
 * @returns {{ ok: true, value: { amountReais: number } } | { ok: false, message: string }}
 */
function validatePayoutRequest({
  amountReais,
  balanceReais,
  minimumReais = payoutMinimumReais(),
  lastPayoutAt = null,
  now = new Date(),
  pixKey,
} = {}) {
  const parsedAmount = Number(amountReais);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { ok: false, message: 'Informe um valor de saque válido.' };
  }

  const requested = toMoney(parsedAmount);
  const minimum = toMoney(minimumReais);
  if (requested < minimum) {
    return {
      ok: false,
      message: `O valor mínimo para saque é R$ ${formatReais(minimum)}.`,
    };
  }

  const balance = resolveWalletBalance(balanceReais);
  if (requested > balance) {
    return { ok: false, message: 'Saldo insuficiente para saque.' };
  }

  if (hasPayoutInCurrentMonth(lastPayoutAt, now)) {
    return { ok: false, message: 'Você já solicitou um saque este mês.' };
  }

  if (!String(pixKey || '').trim()) {
    return {
      ok: false,
      message: 'Cadastre uma chave Pix antes de solicitar o saque.',
    };
  }

  return { ok: true, value: { amountReais: requested } };
}

/** Valor que sai de fato para o colaborador, já descontada a taxa (hoje zero). */
function netPayoutAmount(amountReais, feeReais = PAYOUT_FEE_REAIS) {
  const net = toMoney(amountReais) - toMoney(feeReais);
  return net > 0 ? toMoney(net) : 0;
}

/**
 * Decide quais comissões `pending` este saque quita.
 *
 * @param {Array<{ id: number, amount: number|string }>} pendingCommissions da mais antiga para a mais nova
 * @param {number} amountReais valor pago no saque
 * @returns {{ ids: number[], settledTotal: number }}
 */
function resolveCommissionsToSettle(pendingCommissions, amountReais) {
  const limit = toMoney(amountReais);
  const settlement = { ids: [], settledTotal: 0 };
  if (!Array.isArray(pendingCommissions) || limit <= 0) return settlement;

  let total = 0;
  for (const commission of pendingCommissions) {
    const id = Number(commission && commission.id);
    const amount = toMoney(commission && commission.amount);
    if (!Number.isInteger(id) || id < 1 || amount <= 0) continue;

    const next = toMoney(total + amount);
    // Comissão é indivisível: quando a próxima linha estoura o valor pago ela
    // continua `pending` para o saque seguinte, em vez de virar quitação
    // parcial que ninguém consegue reconciliar depois.
    if (next > limit) break;

    total = next;
    settlement.ids.push(id);
  }

  settlement.settledTotal = total;
  return settlement;
}

module.exports = {
  PAYOUT_FEE_REAIS,
  formatReais,
  hasPayoutInCurrentMonth,
  validatePayoutRequest,
  netPayoutAmount,
  resolveCommissionsToSettle,
};
