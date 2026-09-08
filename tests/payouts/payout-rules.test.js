const {
  PAYOUT_FEE_REAIS,
  formatReais,
  hasPayoutInCurrentMonth,
  validatePayoutRequest,
  netPayoutAmount,
  resolveCommissionsToSettle,
} = require('../../src/services/payouts/payout-rules');

const NOW = new Date('2026-09-08T12:00:00Z');

const validRequest = (overrides = {}) => ({
  amountReais: 150,
  balanceReais: 200,
  lastPayoutAt: null,
  now: NOW,
  pixKey: 'ana@example.com',
  ...overrides,
});

describe('validatePayoutRequest: valor', () => {
  it('aceita pedido dentro do saldo e acima do mínimo', () => {
    const result = validatePayoutRequest(validRequest());

    expect(result).toEqual({ ok: true, value: { amountReais: 150 } });
  });

  it('recusa valor não numérico, zero ou negativo', () => {
    expect(validatePayoutRequest(validRequest({ amountReais: 'abc' }))).toEqual({
      ok: false,
      message: 'Informe um valor de saque válido.',
    });
    expect(validatePayoutRequest(validRequest({ amountReais: 0 }))).toEqual({
      ok: false,
      message: 'Informe um valor de saque válido.',
    });
    expect(validatePayoutRequest(validRequest({ amountReais: -10 }))).toEqual({
      ok: false,
      message: 'Informe um valor de saque válido.',
    });
    expect(
      validatePayoutRequest(validRequest({ amountReais: undefined })).ok
    ).toBe(false);
  });

  it('recusa abaixo do mínimo com o valor na mensagem', () => {
    const result = validatePayoutRequest(validRequest({ amountReais: 99.99 }));

    expect(result.ok).toBe(false);
    expect(result.message).toBe('O valor mínimo para saque é R$ 100,00.');
  });

  it('aceita exatamente o mínimo', () => {
    expect(validatePayoutRequest(validRequest({ amountReais: 100 })).ok).toBe(
      true
    );
  });

  it('recusa valor acima do saldo', () => {
    const result = validatePayoutRequest(
      validRequest({ amountReais: 150, balanceReais: 149.99 })
    );

    expect(result).toEqual({
      ok: false,
      message: 'Saldo insuficiente para saque.',
    });
  });

  it('trata saldo string do DECIMAL do MySQL', () => {
    expect(
      validatePayoutRequest(validRequest({ balanceReais: '150.00' })).ok
    ).toBe(true);
    expect(
      validatePayoutRequest(validRequest({ balanceReais: null })).ok
    ).toBe(false);
  });
});

describe('validatePayoutRequest: um saque por mês', () => {
  it('bloqueia segundo saque no mesmo mês e ano', () => {
    const result = validatePayoutRequest(
      validRequest({ lastPayoutAt: new Date('2026-09-01T10:00:00Z') })
    );

    expect(result).toEqual({
      ok: false,
      message: 'Você já solicitou um saque este mês.',
    });
  });

  it('libera quando o mês é o mesmo mas o ano é outro', () => {
    const result = validatePayoutRequest(
      validRequest({ lastPayoutAt: new Date('2025-09-30T10:00:00Z') })
    );

    expect(result.ok).toBe(true);
  });

  it('libera no mês seguinte', () => {
    expect(
      validatePayoutRequest(
        validRequest({ lastPayoutAt: new Date('2026-08-31T10:00:00Z') })
      ).ok
    ).toBe(true);
  });

  it('aceita data em string e ignora data inválida', () => {
    expect(
      validatePayoutRequest(validRequest({ lastPayoutAt: '2026-09-02' })).ok
    ).toBe(false);
    expect(
      validatePayoutRequest(validRequest({ lastPayoutAt: 'nao-e-data' })).ok
    ).toBe(true);
  });

  it('hasPayoutInCurrentMonth é falso sem saque anterior', () => {
    expect(hasPayoutInCurrentMonth(null, NOW)).toBe(false);
  });
});

describe('validatePayoutRequest: chave Pix', () => {
  it('recusa chave ausente ou só espaços', () => {
    expect(validatePayoutRequest(validRequest({ pixKey: null }))).toEqual({
      ok: false,
      message: 'Cadastre uma chave Pix antes de solicitar o saque.',
    });
    expect(validatePayoutRequest(validRequest({ pixKey: '   ' })).ok).toBe(
      false
    );
  });
});

describe('taxa de saque', () => {
  it('não desconta nada por default — a taxa era da Stripe', () => {
    expect(PAYOUT_FEE_REAIS).toBe(0);
    expect(netPayoutAmount(150)).toBe(150);
  });

  it('desconta se algum dia existir taxa, sem devolver negativo', () => {
    expect(netPayoutAmount(150, 0.25)).toBe(149.75);
    expect(netPayoutAmount(1, 5)).toBe(0);
  });
});

describe('resolveCommissionsToSettle', () => {
  const commissions = (count, amount = 0.3) =>
    Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      amount,
    }));

  it('liquida exatamente quando o valor fecha a conta', () => {
    const result = resolveCommissionsToSettle(commissions(4, 25), 100);

    expect(result).toEqual({ ids: [1, 2, 3, 4], settledTotal: 100 });
  });

  it('para antes de partir uma comissão pela metade', () => {
    const result = resolveCommissionsToSettle(commissions(4, 40), 100);

    expect(result).toEqual({ ids: [1, 2], settledTotal: 80 });
  });

  it('lida com centavos sem sujeira de float', () => {
    const result = resolveCommissionsToSettle(commissions(4, 0.3), 1);

    expect(result).toEqual({ ids: [1, 2, 3], settledTotal: 0.9 });
  });

  it('aceita amount em string (DECIMAL do MySQL)', () => {
    const result = resolveCommissionsToSettle(
      [
        { id: 9, amount: '0.30' },
        { id: 10, amount: '0.30' },
      ],
      0.6
    );

    expect(result).toEqual({ ids: [9, 10], settledTotal: 0.6 });
  });

  it('devolve vazio para lista vazia, entrada inválida ou valor zero', () => {
    expect(resolveCommissionsToSettle([], 100)).toEqual({
      ids: [],
      settledTotal: 0,
    });
    expect(resolveCommissionsToSettle(null, 100)).toEqual({
      ids: [],
      settledTotal: 0,
    });
    expect(resolveCommissionsToSettle(commissions(2), 0)).toEqual({
      ids: [],
      settledTotal: 0,
    });
  });

  it('ignora linhas sem id válido ou sem valor', () => {
    const result = resolveCommissionsToSettle(
      [
        { id: null, amount: 10 },
        { id: 5, amount: 0 },
        { id: 6, amount: 10 },
      ],
      100
    );

    expect(result).toEqual({ ids: [6], settledTotal: 10 });
  });
});

describe('formatReais', () => {
  it('formata dinheiro em pt-BR', () => {
    expect(formatReais(100)).toBe('100,00');
    expect(formatReais('12.5')).toBe('12,50');
  });
});
