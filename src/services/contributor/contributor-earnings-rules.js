/**
 * Regras de ganhos do colaborador — funções puras, sem I/O.
 *
 * Três valores diferentes que o painel costumava confundir num só campo:
 *
 *   totalGeneral — histórico bruto de comissões, nunca diminui
 *   balance      — carteira atual, já descontados os saques pagos
 *   available    — quanto dá para sacar agora (0 abaixo do mínimo)
 *
 * @see docs/contextos/colaborador-ganhos.md
 */

const { PALN_COMMISSION } = require('../../utils/constants/constants');

/** Centavos inteiros → reais com 2 casas, sem lixo de float. */
function centsToReais(cents) {
  const parsed = Number(cents);
  if (!Number.isFinite(parsed)) return 0;
  return Number((Math.round(parsed) / 100).toFixed(2));
}

/** Arredonda para 2 casas — SUM() do MySQL volta string/decimal. */
function toMoney(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

/** Quanto o colaborador ganha por download. */
function commissionPerDownloadReais() {
  return centsToReais(PALN_COMMISSION.comission_contributor);
}

/** Piso para solicitar saque. */
function payoutMinimumReais() {
  return centsToReais(PALN_COMMISSION.payout_contributor);
}

/** Saldo da carteira normalizado — a coluna aceita null. */
function resolveWalletBalance(rawBalance) {
  const parsed = Number(rawBalance);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return toMoney(parsed);
}

function canRequestPayout(balance, minimum = payoutMinimumReais()) {
  return resolveWalletBalance(balance) >= toMoney(minimum);
}

/**
 * Saldo sacável.
 *
 * Zero enquanto não bate o mínimo — o valor real continua exposto em
 * `balance`, para a tela poder dizer quanto falta em vez de só mostrar 0.
 */
function resolveAvailableBalance(balance, minimum = payoutMinimumReais()) {
  return canRequestPayout(balance, minimum) ? resolveWalletBalance(balance) : 0;
}

/** Quanto falta para destravar o saque. */
function resolveMissingForPayout(balance, minimum = payoutMinimumReais()) {
  const missing = toMoney(minimum) - resolveWalletBalance(balance);
  return missing > 0 ? toMoney(missing) : 0;
}

/**
 * Agregado de um período (`SUM`/`COUNT` do Sequelize) → objeto limpo.
 *
 * Sem linha no período o Sequelize devolve `{ total: null, downloads: 0 }`.
 */
function mapPeriodTotals(row) {
  return {
    total: toMoney(row && row.total),
    downloads: Number.parseInt((row && row.downloads) || 0, 10) || 0,
  };
}

/**
 * Monta o `data` de `GET /user-commissions/:userId`.
 *
 * Períodos ficam como objeto (`{ total, downloads }`) de propósito: a
 * contagem de downloads por janela é informação que o painel já quer mostrar.
 */
function buildCommissionsSummary({
  balance,
  todayRow,
  last7DaysRow,
  last30DaysRow,
  totalGeneralRow,
  recentCommissions = [],
} = {}) {
  const walletBalance = resolveWalletBalance(balance);
  const minimum = payoutMinimumReais();

  return {
    balance: walletBalance,
    availableBalance: resolveAvailableBalance(walletBalance, minimum),
    missingForPayout: resolveMissingForPayout(walletBalance, minimum),
    canRequestPayout: canRequestPayout(walletBalance, minimum),
    payoutMinimum: minimum,
    commissionPerDownload: commissionPerDownloadReais(),
    totalGeneral: toMoney(totalGeneralRow && totalGeneralRow.total),
    today: mapPeriodTotals(todayRow),
    last7Days: mapPeriodTotals(last7DaysRow),
    last30Days: mapPeriodTotals(last30DaysRow),
    commissionsLast30Days: Array.isArray(recentCommissions)
      ? recentCommissions
      : [],
    commissionsLast30DaysCount: Array.isArray(recentCommissions)
      ? recentCommissions.length
      : 0,
  };
}

/**
 * O download gera comissão?
 *
 * `downloaderUserId` é opcional: a criação manual de comissão não tem um
 * "quem baixou". Quando vem informado, bloqueia auto-download — sem isso o
 * colaborador baixa o próprio arquivo em loop e saca dinheiro que ninguém
 * pagou.
 */
function shouldCreditCommission({ downloaderUserId, contributorUserId } = {}) {
  const contributor = Number(contributorUserId);
  if (!Number.isInteger(contributor) || contributor < 1) {
    return { credit: false, reason: 'contribuidor inválido' };
  }

  if (downloaderUserId === undefined || downloaderUserId === null) {
    return { credit: true, reason: null };
  }

  const downloader = Number(downloaderUserId);
  if (!Number.isInteger(downloader) || downloader < 1) {
    return { credit: false, reason: 'usuário inválido' };
  }
  if (downloader === contributor) {
    return { credit: false, reason: 'auto-download não gera comissão' };
  }
  return { credit: true, reason: null };
}

module.exports = {
  centsToReais,
  toMoney,
  commissionPerDownloadReais,
  payoutMinimumReais,
  resolveWalletBalance,
  canRequestPayout,
  resolveAvailableBalance,
  resolveMissingForPayout,
  mapPeriodTotals,
  buildCommissionsSummary,
  shouldCreditCommission,
};
