const {
  ASAAS_CYCLES,
  ASAAS_BILLING_TYPES,
  ASAAS_EVENTS,
  resolveCycleAsaas,
  resolveBillingTypeAsaas,
  isOfferedBillingTypeAsaas,
  coerceCheckoutBillingTypeAsaas,
  resolvePlanStatusForEventAsaas,
  centsToValueAsaas,
  valueToCentsAsaas,
  formatDueDateAsaas,
  isValidCpfAsaas,
  isValidCnpjAsaas,
  sanitizeCpfCnpjAsaas,
  buildExternalReferenceAsaas,
  parseExternalReferenceAsaas,
  buildCustomerPayloadAsaas,
  buildSubscriptionPayloadAsaas,
  buildBillingTypeUpdatePayloadAsaas,
  buildPayWithCreditCardPayloadAsaas,
  isSettledPaymentStatusAsaas,
  buildTokenizePayloadAsaas,
} = require('../../../src/services/payments/gateways/asaas/asaas-rules');

const paidPlan = (overrides = {}) => ({
  id: 7,
  plan_name: 'pro_monthly',
  display_name: 'Pro',
  price_cents: 2900,
  billing_interval: 'month',
  ...overrides,
});

describe('asaas-rules: ciclo e tipo de cobrança', () => {
  it('traduz billing_interval para o ciclo do Asaas', () => {
    expect(resolveCycleAsaas('month')).toBe(ASAAS_CYCLES.MONTHLY);
    expect(resolveCycleAsaas('YEAR')).toBe(ASAAS_CYCLES.YEARLY);
    expect(resolveCycleAsaas('week')).toBeNull();
    expect(resolveCycleAsaas('')).toBeNull();
  });

  it('normaliza o tipo de cobrança', () => {
    expect(resolveBillingTypeAsaas('pix')).toBe(ASAAS_BILLING_TYPES.PIX);
    expect(resolveBillingTypeAsaas('credit_card')).toBe(
      ASAAS_BILLING_TYPES.CREDIT_CARD
    );
    expect(resolveBillingTypeAsaas('boleto')).toBe(ASAAS_BILLING_TYPES.BOLETO);
    expect(resolveBillingTypeAsaas('cheque')).toBeNull();
  });

  it('só Pix e cartão são oferecidos no checkout', () => {
    expect(isOfferedBillingTypeAsaas('PIX')).toBe(true);
    expect(isOfferedBillingTypeAsaas('CREDIT_CARD')).toBe(true);
    expect(isOfferedBillingTypeAsaas('BOLETO')).toBe(false);
    expect(isOfferedBillingTypeAsaas('UNDEFINED')).toBe(false);
    expect(coerceCheckoutBillingTypeAsaas('BOLETO')).toBe(
      ASAAS_BILLING_TYPES.PIX
    );
    expect(coerceCheckoutBillingTypeAsaas('PIX')).toBe(ASAAS_BILLING_TYPES.PIX);
    expect(coerceCheckoutBillingTypeAsaas('UNDEFINED')).toBeNull();
  });
});

describe('asaas-rules: evento → status do plano', () => {
  it('pagamento confirmado ativa', () => {
    expect(resolvePlanStatusForEventAsaas(ASAAS_EVENTS.PAYMENT_CONFIRMED)).toBe(
      'active'
    );
    expect(resolvePlanStatusForEventAsaas(ASAAS_EVENTS.PAYMENT_RECEIVED)).toBe(
      'active'
    );
  });

  it('vencido vira past_due, não suspenso (tolerância)', () => {
    expect(resolvePlanStatusForEventAsaas(ASAAS_EVENTS.PAYMENT_OVERDUE)).toBe(
      'past_due'
    );
  });

  it('assinatura removida cancela', () => {
    expect(
      resolvePlanStatusForEventAsaas(ASAAS_EVENTS.SUBSCRIPTION_DELETED)
    ).toBe('canceled');
    expect(
      resolvePlanStatusForEventAsaas(ASAAS_EVENTS.SUBSCRIPTION_INACTIVATED)
    ).toBe('canceled');
  });

  it('evento desconhecido não muda status', () => {
    expect(resolvePlanStatusForEventAsaas('PAYMENT_CREATED')).toBeNull();
    expect(resolvePlanStatusForEventAsaas('QUALQUER_COISA')).toBeNull();
    expect(resolvePlanStatusForEventAsaas('')).toBeNull();
  });
});

describe('asaas-rules: dinheiro', () => {
  it('converte centavos para reais decimais', () => {
    expect(centsToValueAsaas(2900)).toBe(29);
    expect(centsToValueAsaas(2990)).toBe(29.9);
    expect(centsToValueAsaas(1)).toBe(0.01);
    expect(centsToValueAsaas(0)).toBe(0);
    expect(centsToValueAsaas('abc')).toBe(0);
  });

  it('converte reais decimais para centavos inteiros', () => {
    expect(valueToCentsAsaas(29.9)).toBe(2990);
    expect(valueToCentsAsaas(0.01)).toBe(1);
    expect(valueToCentsAsaas('19.90')).toBe(1990);
  });

  it('ida e volta não perde centavo', () => {
    [1, 99, 2990, 7900, 123456].forEach((cents) => {
      expect(valueToCentsAsaas(centsToValueAsaas(cents))).toBe(cents);
    });
  });
});

describe('asaas-rules: data e documento', () => {
  it('formata vencimento como YYYY-MM-DD', () => {
    expect(formatDueDateAsaas(new Date(2027, 0, 15))).toBe('2027-01-15');
    expect(formatDueDateAsaas('data inválida')).toBeNull();
  });

  it('aceita CPF e CNPJ, rejeita o resto', () => {
    expect(sanitizeCpfCnpjAsaas('123.456.789-09')).toBe('12345678909');
    expect(sanitizeCpfCnpjAsaas('66.625.514/0001-40')).toBe('66625514000140');
    expect(sanitizeCpfCnpjAsaas('123')).toBeNull();
    expect(sanitizeCpfCnpjAsaas('')).toBeNull();
  });
});

describe('asaas-rules: dígito verificador do documento', () => {
  it('valida CPF correto', () => {
    expect(isValidCpfAsaas('12345678909')).toBe(true);
    expect(isValidCpfAsaas('52998224725')).toBe(true);
  });

  it('recusa CPF com dígito verificador errado', () => {
    // Só o último dígito muda — o teste de tamanho deixaria passar.
    expect(isValidCpfAsaas('12345678900')).toBe(false);
    expect(isValidCpfAsaas('52998224724')).toBe(false);
  });

  it('recusa sequência de dígitos repetidos', () => {
    expect(isValidCpfAsaas('00000000000')).toBe(false);
    expect(isValidCpfAsaas('11111111111')).toBe(false);
    expect(sanitizeCpfCnpjAsaas('000.000.000-00')).toBeNull();
  });

  it('valida CNPJ correto e recusa dígito errado', () => {
    expect(isValidCnpjAsaas('66625514000140')).toBe(true);
    expect(isValidCnpjAsaas('66625514000141')).toBe(false);
    expect(isValidCnpjAsaas('00000000000000')).toBe(false);
  });

  it('tamanho errado não é documento', () => {
    expect(isValidCpfAsaas('1234567890')).toBe(false);
    expect(isValidCnpjAsaas('6662551400014')).toBe(false);
  });
});

describe('buildTokenizePayloadAsaas', () => {
  const validCard = () => ({
    asaasCustomerId: 'cus_1',
    holderName: 'ANA P SOUZA',
    number: '5162 3062 1937 8829',
    expiryMonth: '5',
    expiryYear: '2030',
    ccv: '318',
    holder: {
      name: 'Ana Paula Souza',
      email: 'ana@example.com',
      cpfCnpj: '123.456.789-09',
      phone: '(47) 99878-1877',
      postalCode: '89223-005',
      addressNumber: 277,
    },
    remoteIp: '200.1.2.3',
  });

  it('normaliza cartão e titular', () => {
    const result = buildTokenizePayloadAsaas(validCard());

    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({
      customer: 'cus_1',
      creditCard: {
        holderName: 'ANA P SOUZA',
        number: '5162306219378829',
        expiryMonth: '05',
        expiryYear: '2030',
        ccv: '318',
      },
      creditCardHolderInfo: {
        name: 'Ana Paula Souza',
        email: 'ana@example.com',
        cpfCnpj: '12345678909',
        postalCode: '89223005',
        addressNumber: '277',
        phone: '47998781877',
      },
      remoteIp: '200.1.2.3',
    });
  });

  it('não deixa campo extra vazar para o Asaas', () => {
    const result = buildTokenizePayloadAsaas({
      ...validCard(),
      creditCard: { number: 'injetado' },
      apiKey: 'roubada',
    });

    expect(Object.keys(result.payload).sort()).toEqual([
      'creditCard',
      'creditCardHolderInfo',
      'customer',
      'remoteIp',
    ]);
    expect(result.payload.creditCard.number).toBe('5162306219378829');
    expect(result.payload.apiKey).toBeUndefined();
  });

  it.each([
    ['number', { number: '123' }, /número do cartão/i],
    ['expiryMonth', { expiryMonth: '13' }, /mês de validade/i],
    ['expiryYear', { expiryYear: '30' }, /ano de validade/i],
    ['ccv', { ccv: '12' }, /código de segurança/i],
    ['holderName', { holderName: '  ' }, /nome impresso/i],
  ])('recusa %s inválido', (_field, override, expected) => {
    const result = buildTokenizePayloadAsaas({ ...validCard(), ...override });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(expected);
  });

  it.each([
    ['CPF', { cpfCnpj: '11111111111' }, /CPF do titular/i],
    ['CEP', { postalCode: '892' }, /CEP do titular/i],
    ['número', { addressNumber: '' }, /número do endereço/i],
    ['telefone', { phone: '4799' }, /telefone do titular/i],
  ])('recusa %s inválido do titular', (_field, override, expected) => {
    const base = validCard();
    const result = buildTokenizePayloadAsaas({
      ...base,
      holder: { ...base.holder, ...override },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(expected);
  });

  it('exige cliente do Asaas', () => {
    const result = buildTokenizePayloadAsaas({
      ...validCard(),
      asaasCustomerId: '',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cliente asaas/i);
  });
});

describe('asaas-rules: externalReference', () => {
  it('monta e reinterpreta plano e usuário', () => {
    const reference = buildExternalReferenceAsaas({ planId: 3, userId: 42 });
    expect(reference).toBe('plan:3;user:42');
    expect(parseExternalReferenceAsaas(reference)).toEqual({
      planId: 3,
      userId: 42,
    });
  });

  it('id vazio não vira zero', () => {
    expect(parseExternalReferenceAsaas('plan:3;user:')).toEqual({
      planId: 3,
      userId: null,
    });
    expect(parseExternalReferenceAsaas('plan:0;user:0')).toEqual({
      planId: null,
      userId: null,
    });
    expect(parseExternalReferenceAsaas('')).toEqual({
      planId: null,
      userId: null,
    });
    expect(parseExternalReferenceAsaas('lixo')).toEqual({
      planId: null,
      userId: null,
    });
  });
});

describe('buildCustomerPayloadAsaas', () => {
  it('monta o cliente com documento limpo', () => {
    const result = buildCustomerPayloadAsaas({
      name: ' Ana ',
      email: 'ana@example.com',
      cpfCnpj: '123.456.789-09',
      phone: '(11) 99336-7861',
      postalCode: '89223-005',
    });

    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      cpfCnpj: '12345678909',
      mobilePhone: '11993367861',
      postalCode: '89223005',
    });
  });

  it('recusa sem CPF/CNPJ válido', () => {
    const result = buildCustomerPayloadAsaas({
      name: 'Ana',
      email: 'ana@example.com',
      cpfCnpj: '123',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/CPF\/CNPJ/i);
  });

  it('recusa sem nome ou e-mail', () => {
    expect(
      buildCustomerPayloadAsaas({
        name: '',
        email: 'ana@example.com',
        cpfCnpj: '12345678909',
      }).ok
    ).toBe(false);
    expect(
      buildCustomerPayloadAsaas({
        name: 'Ana',
        email: '',
        cpfCnpj: '12345678909',
      }).ok
    ).toBe(false);
  });
});

describe('buildSubscriptionPayloadAsaas', () => {
  it('monta assinatura mensal com valor em reais', () => {
    const result = buildSubscriptionPayloadAsaas({
      asaasCustomerId: 'cus_0T1mdomVMi39',
      plan: paidPlan(),
      userId: 42,
      billingType: 'PIX',
      nextDueDate: new Date(2027, 0, 15),
    });

    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({
      customer: 'cus_0T1mdomVMi39',
      billingType: ASAAS_BILLING_TYPES.PIX,
      cycle: ASAAS_CYCLES.MONTHLY,
      value: 29,
      nextDueDate: '2027-01-15',
      description: 'Assinatura Pro',
      externalReference: 'plan:7;user:42',
    });
  });

  it('sem billingType é recusado — só Pix ou cartão', () => {
    const result = buildSubscriptionPayloadAsaas({
      asaasCustomerId: 'cus_1',
      plan: paidPlan(),
      userId: 1,
      nextDueDate: new Date(2027, 0, 15),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Pix ou cartão/i);
  });

  it('boleto não é mais aceito na assinatura', () => {
    const result = buildSubscriptionPayloadAsaas({
      asaasCustomerId: 'cus_1',
      plan: paidPlan(),
      userId: 1,
      billingType: 'BOLETO',
      nextDueDate: new Date(2027, 0, 15),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Pix ou cartão/i);
  });

  it('troca de forma também recusa boleto', () => {
    const result = buildBillingTypeUpdatePayloadAsaas({
      billingType: 'BOLETO',
      currentBillingType: 'PIX',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Pix ou cartão/i);
  });

  it('recusa plano sem preço', () => {
    const result = buildSubscriptionPayloadAsaas({
      asaasCustomerId: 'cus_1',
      plan: paidPlan({ price_cents: 0 }),
      userId: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/preço/i);
  });

  it('recusa periodicidade não suportada', () => {
    const result = buildSubscriptionPayloadAsaas({
      asaasCustomerId: 'cus_1',
      plan: paidPlan({ billing_interval: 'week' }),
      userId: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/periodicidade/i);
  });

  it('recusa sem cliente Asaas', () => {
    const result = buildSubscriptionPayloadAsaas({
      asaasCustomerId: '',
      plan: paidPlan(),
      userId: 1,
    });
    expect(result.ok).toBe(false);
  });

  it('monta payload de cobrança no cartão só com o token', () => {
    const result = buildPayWithCreditCardPayloadAsaas({
      creditCardToken: 'tok_abc',
    });
    expect(result).toEqual({
      ok: true,
      payload: { creditCardToken: 'tok_abc' },
    });
  });

  it('recusa cobrar cartão sem token', () => {
    const result = buildPayWithCreditCardPayloadAsaas({ creditCardToken: '' });
    expect(result.ok).toBe(false);
  });

  it('reconhece status de pagamento liquidado', () => {
    expect(isSettledPaymentStatusAsaas('CONFIRMED')).toBe(true);
    expect(isSettledPaymentStatusAsaas('RECEIVED')).toBe(true);
    expect(isSettledPaymentStatusAsaas('PENDING')).toBe(false);
  });
});
