const {
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
} = require('../../src/services/contributor/contributor-earnings-rules');

describe('contributor-earnings-rules — valores do produto', () => {
  it('comissão é R$ 0,30 por download', () => {
    expect(commissionPerDownloadReais()).toBe(0.3);
  });

  it('mínimo de saque é R$ 100,00', () => {
    expect(payoutMinimumReais()).toBe(100);
  });

  it('centsToReais converte sem lixo de float', () => {
    expect(centsToReais(30)).toBe(0.3);
    expect(centsToReais(10000)).toBe(100);
    expect(centsToReais(1)).toBe(0.01);
  });

  it('centsToReais tolera entrada inválida', () => {
    expect(centsToReais(null)).toBe(0);
    expect(centsToReais('abc')).toBe(0);
    expect(centsToReais(undefined)).toBe(0);
  });

  it('toMoney arredonda SUM() vindo como string do MySQL', () => {
    expect(toMoney('12.90')).toBe(12.9);
    expect(toMoney('0.299999')).toBe(0.3);
    expect(toMoney(null)).toBe(0);
  });
});

describe('resolveWalletBalance', () => {
  it('normaliza null da coluna balance', () => {
    expect(resolveWalletBalance(null)).toBe(0);
  });

  it('não aceita saldo negativo', () => {
    expect(resolveWalletBalance(-50)).toBe(0);
  });

  it('arredonda para 2 casas', () => {
    expect(resolveWalletBalance('30.599')).toBe(30.6);
  });
});

describe('regra dos R$ 100 para saque', () => {
  it('abaixo do mínimo não pode sacar', () => {
    expect(canRequestPayout(99.99)).toBe(false);
    expect(resolveAvailableBalance(99.99)).toBe(0);
    expect(resolveMissingForPayout(99.99)).toBe(0.01);
  });

  it('exatamente no mínimo já libera', () => {
    expect(canRequestPayout(100)).toBe(true);
    expect(resolveAvailableBalance(100)).toBe(100);
    expect(resolveMissingForPayout(100)).toBe(0);
  });

  it('acima do mínimo saca o valor cheio', () => {
    expect(resolveAvailableBalance(250.4)).toBe(250.4);
    expect(resolveMissingForPayout(250.4)).toBe(0);
  });

  it('saldo zero pede o mínimo inteiro', () => {
    expect(resolveMissingForPayout(0)).toBe(100);
  });
});

describe('mapPeriodTotals', () => {
  it('período sem comissão volta zerado, não null', () => {
    expect(mapPeriodTotals({ total: null, downloads: 0 })).toEqual({
      total: 0,
      downloads: 0,
    });
  });

  it('converte agregados string do Sequelize', () => {
    expect(mapPeriodTotals({ total: '0.90', downloads: '3' })).toEqual({
      total: 0.9,
      downloads: 3,
    });
  });

  it('tolera row ausente', () => {
    expect(mapPeriodTotals(null)).toEqual({ total: 0, downloads: 0 });
  });
});

describe('buildCommissionsSummary', () => {
  it('separa histórico, carteira e sacável', () => {
    const summary = buildCommissionsSummary({
      balance: 12.6,
      todayRow: { total: '0.60', downloads: '2' },
      last7DaysRow: { total: '3.00', downloads: '10' },
      last30DaysRow: { total: '12.60', downloads: '42' },
      totalGeneralRow: { total: '12.60' },
      recentCommissions: [{ amount: '0.30' }, { amount: '0.30' }],
    });

    expect(summary.totalGeneral).toBe(12.6);
    expect(summary.balance).toBe(12.6);
    // Ainda não bateu R$ 100 — sacável zero, mas o saldo real continua visível.
    expect(summary.availableBalance).toBe(0);
    expect(summary.canRequestPayout).toBe(false);
    expect(summary.missingForPayout).toBe(87.4);
    expect(summary.today).toEqual({ total: 0.6, downloads: 2 });
    expect(summary.last30Days).toEqual({ total: 12.6, downloads: 42 });
    expect(summary.commissionsLast30DaysCount).toBe(2);
  });

  it('histórico não diminui quando a carteira é sacada', () => {
    const summary = buildCommissionsSummary({
      balance: 0,
      totalGeneralRow: { total: '150.00' },
    });

    expect(summary.totalGeneral).toBe(150);
    expect(summary.balance).toBe(0);
    expect(summary.availableBalance).toBe(0);
  });

  it('expõe o mínimo e a comissão para a tela explicar a regra', () => {
    const summary = buildCommissionsSummary({ balance: 120 });
    expect(summary.payoutMinimum).toBe(100);
    expect(summary.commissionPerDownload).toBe(0.3);
    expect(summary.canRequestPayout).toBe(true);
    expect(summary.availableBalance).toBe(120);
  });

  it('sem argumento nenhum devolve payload zerado e não quebra', () => {
    const summary = buildCommissionsSummary();
    expect(summary.balance).toBe(0);
    expect(summary.totalGeneral).toBe(0);
    expect(summary.today).toEqual({ total: 0, downloads: 0 });
    expect(summary.commissionsLast30Days).toEqual([]);
  });
});

describe('shouldCreditCommission', () => {
  it('download de terceiro gera comissão', () => {
    expect(
      shouldCreditCommission({ downloaderUserId: 5, contributorUserId: 9 })
    ).toEqual({ credit: true, reason: null });
  });

  it('auto-download não gera comissão', () => {
    const result = shouldCreditCommission({
      downloaderUserId: 9,
      contributorUserId: 9,
    });
    expect(result.credit).toBe(false);
    expect(result.reason).toMatch(/auto-download/);
  });

  it('ignora tipo string vindo do body', () => {
    expect(
      shouldCreditCommission({ downloaderUserId: '9', contributorUserId: 9 })
        .credit
    ).toBe(false);
  });

  it('contribuidor inválido não credita', () => {
    expect(
      shouldCreditCommission({ downloaderUserId: 1, contributorUserId: 0 })
        .credit
    ).toBe(false);
    expect(
      shouldCreditCommission({ downloaderUserId: 1, contributorUserId: null })
        .credit
    ).toBe(false);
  });

  it('sem downloader informado credita (criação manual)', () => {
    expect(shouldCreditCommission({ contributorUserId: 9 }).credit).toBe(true);
  });

  it('downloader inválido não credita', () => {
    expect(
      shouldCreditCommission({ downloaderUserId: 0, contributorUserId: 9 })
        .credit
    ).toBe(false);
  });
});
