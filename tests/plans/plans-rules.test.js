const {
  DEFAULT_PLAN_GATEWAY,
  normalizePlanName,
  validatePlanName,
  normalizeGateway,
  isBillablePlan,
  parseMonthlyDownloadCap,
  resolveMonthlyDownloadCap,
  validatePlanChange,
  parseFeatures,
  formatPriceBRL,
  validatePlanBody,
  mapPlanAdmin,
  mapPlanPublic,
} = require('../../src/services/plans/plans-rules');

const validBody = (overrides = {}) => ({
  plan_name: 'Pro Mensal',
  display_name: 'Pro',
  tier: 'pro',
  price_cents: 2900,
  billing_interval: 'month',
  count_downloads: 0,
  features: ['Downloads ilimitados', 'Suporte'],
  sort_order: 1,
  ...overrides,
});

describe('plans-rules: helpers', () => {
  it('normalizeGateway aceita só gateways conhecidos', () => {
    expect(normalizeGateway('asaas')).toBe('asaas');
    expect(normalizeGateway('ASAAS')).toBe('asaas');
    expect(normalizeGateway('stripe')).toBe('stripe');
    expect(normalizeGateway('pagarme')).toBeNull();
    expect(normalizeGateway('')).toBeNull();
  });

  it('isBillablePlan é preço maior que zero', () => {
    expect(isBillablePlan({ price_cents: 2900 })).toBe(true);
    expect(isBillablePlan({ price_cents: 0 })).toBe(false);
    expect(isBillablePlan(null)).toBe(false);
  });

  it('parseMonthlyDownloadCap: vazio é ilimitado, número precisa ser >= 1', () => {
    expect(parseMonthlyDownloadCap(undefined)).toEqual({ ok: true, value: null });
    expect(parseMonthlyDownloadCap(null)).toEqual({ ok: true, value: null });
    expect(parseMonthlyDownloadCap('')).toEqual({ ok: true, value: null });
    expect(parseMonthlyDownloadCap(90)).toEqual({ ok: true, value: 90 });
    expect(parseMonthlyDownloadCap('90')).toEqual({ ok: true, value: 90 });
    expect(parseMonthlyDownloadCap(0).ok).toBe(false);
    expect(parseMonthlyDownloadCap(-1).ok).toBe(false);
    expect(parseMonthlyDownloadCap(1.5).ok).toBe(false);
    expect(parseMonthlyDownloadCap('muitos').ok).toBe(false);
  });

  it('resolveMonthlyDownloadCap: só teto positivo conta', () => {
    expect(resolveMonthlyDownloadCap({ monthly_download_cap: 90 })).toBe(90);
    expect(resolveMonthlyDownloadCap({ monthly_download_cap: 0 })).toBeNull();
    expect(resolveMonthlyDownloadCap({ monthly_download_cap: null })).toBeNull();
    expect(resolveMonthlyDownloadCap(null)).toBeNull();
  });

  it('parseFeatures aceita array e texto por linha', () => {
    expect(parseFeatures(['a', ' b ', ''])).toEqual(['a', 'b']);
    expect(parseFeatures('a\n b \n\n')).toEqual(['a', 'b']);
    expect(parseFeatures(undefined)).toEqual([]);
  });

  it('normalizePlanName corrige só o cosmético', () => {
    expect(normalizePlanName('  Pro Mensal ')).toBe('pro_mensal');
    expect(normalizePlanName('pro__mensal')).toBe('pro_mensal');
    expect(normalizePlanName('_pro_mensal_')).toBe('pro_mensal');
    // Acento não é cosmético: segue inválido para o validate reprovar.
    expect(normalizePlanName('Pró Mensal')).toBe('pró_mensal');
  });

  it('validatePlanName aceita o padrão do slug interno', () => {
    expect(validatePlanName('pro_mensal')).toEqual({
      ok: true,
      value: 'pro_mensal',
    });
    expect(validatePlanName('free')).toEqual({ ok: true, value: 'free' });
    expect(validatePlanName('semi_annual_2026')).toEqual({
      ok: true,
      value: 'semi_annual_2026',
    });
    expect(validatePlanName('Pro Mensal')).toEqual({
      ok: true,
      value: 'pro_mensal',
    });
  });

  it('validatePlanName recusa o que fugir do padrão', () => {
    const rejected = [
      '',
      '   ',
      'ab',
      'pro-mensal',
      'pró_mensal',
      'pro mensal!',
      '1pro',
      'pro.mensal',
      'PRO@MENSAL',
      'p'.repeat(41),
    ];
    rejected.forEach((value) => {
      const result = validatePlanName(value);
      expect(result.ok).toBe(false);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  it('validatePlanName explica o padrão na mensagem', () => {
    expect(validatePlanName('pro-mensal').message).toMatch(/padrão/i);
    expect(validatePlanName('pro-mensal').message).toMatch(/underscore/i);
  });

  it('formatPriceBRL formata centavos', () => {
    expect(formatPriceBRL(2900).replace(/\u00a0/g, ' ')).toBe('R$ 29,00');
    expect(formatPriceBRL(0).replace(/\u00a0/g, ' ')).toBe('R$ 0,00');
  });
});

describe('validatePlanBody', () => {
  it('normaliza plan_name em slug e mantém display_name', () => {
    const result = validatePlanBody(validBody());
    expect(result.ok).toBe(true);
    expect(result.value.plan_name).toBe('pro_mensal');
    expect(result.value.display_name).toBe('Pro');
  });

  it('plano pago sem gateway nasce no Asaas', () => {
    const result = validatePlanBody(validBody());
    expect(result.value.gateway).toBe(DEFAULT_PLAN_GATEWAY);
    expect(result.value.gateway).toBe('asaas');
  });

  it('plano pago pode ser marcado como legado da Stripe', () => {
    const result = validatePlanBody(validBody({ gateway: 'stripe' }));
    expect(result.value.gateway).toBe('stripe');
  });

  it('plano gratuito não tem gateway', () => {
    const result = validatePlanBody(
      validBody({ price_cents: 0, tier: 'free', count_downloads: 3 })
    );
    expect(result.ok).toBe(true);
    expect(result.value.gateway).toBeNull();
  });

  it('plano gratuito com gateway é recusado', () => {
    const result = validatePlanBody(
      validBody({ price_cents: 0, gateway: 'asaas' })
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/gratuito/i);
  });

  it('recusa plan_name fora do padrão', () => {
    const result = validatePlanBody(validBody({ plan_name: 'pro-mensal' }));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/plan_name fora do padrão/i);
  });

  it('recusa campos obrigatórios ausentes', () => {
    expect(validatePlanBody(validBody({ plan_name: '' })).ok).toBe(false);
    expect(validatePlanBody(validBody({ display_name: '' })).ok).toBe(false);
    expect(validatePlanBody(validBody({ tier: '' })).ok).toBe(false);
  });

  it('recusa preço inválido', () => {
    expect(validatePlanBody(validBody({ price_cents: -1 })).ok).toBe(false);
    expect(validatePlanBody(validBody({ price_cents: 29.9 })).ok).toBe(false);
    expect(validatePlanBody(validBody({ price_cents: 'abc' })).ok).toBe(false);
  });

  it('recusa periodicidade e moeda não suportadas', () => {
    expect(validatePlanBody(validBody({ billing_interval: 'week' })).ok).toBe(
      false
    );
    expect(validatePlanBody(validBody({ currency: 'USD' })).ok).toBe(false);
  });

  it('active default é true', () => {
    expect(validatePlanBody(validBody()).value.active).toBe(true);
    expect(validatePlanBody(validBody({ active: false })).value.active).toBe(
      false
    );
  });

  it('teto mensal só existe em plano pago', () => {
    expect(
      validatePlanBody(validBody({ monthly_download_cap: 90 })).value
        .monthly_download_cap
    ).toBe(90);
    expect(validatePlanBody(validBody()).value.monthly_download_cap).toBeNull();
    // No gratuito quem limita é o contador diário.
    expect(
      validatePlanBody(validBody({ price_cents: 0, monthly_download_cap: 90 }))
        .value.monthly_download_cap
    ).toBeNull();
    expect(
      validatePlanBody(validBody({ monthly_download_cap: 0 })).ok
    ).toBe(false);
  });
});

describe('validatePlanChange', () => {
  const plan = (overrides = {}) => ({
    id: 1,
    price_cents: 2900,
    active: true,
    gateway: 'asaas',
    ...overrides,
  });

  it('classifica upgrade, downgrade e lateral', () => {
    const current = plan({ id: 1, price_cents: 2900 });
    expect(
      validatePlanChange({ currentPlan: current, targetPlan: plan({ id: 2, price_cents: 9900 }) })
    ).toEqual({ ok: true, kind: 'upgrade' });
    expect(
      validatePlanChange({ currentPlan: current, targetPlan: plan({ id: 3, price_cents: 1900 }) })
    ).toEqual({ ok: true, kind: 'downgrade' });
    expect(
      validatePlanChange({ currentPlan: current, targetPlan: plan({ id: 4, price_cents: 2900 }) })
    ).toEqual({ ok: true, kind: 'lateral' });
  });

  it('recusa trocar para o mesmo plano', () => {
    const result = validatePlanChange({
      currentPlan: plan({ id: 7 }),
      targetPlan: plan({ id: 7 }),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/já está neste plano/i);
  });

  it('recusa destino inativo, gratuito ou de outro gateway', () => {
    const current = plan({ id: 1 });
    expect(
      validatePlanChange({ currentPlan: current, targetPlan: plan({ id: 2, active: false }) }).ok
    ).toBe(false);
    expect(
      validatePlanChange({ currentPlan: current, targetPlan: plan({ id: 2, price_cents: 0 }) }).ok
    ).toBe(false);
    expect(
      validatePlanChange({
        currentPlan: current,
        targetPlan: plan({ id: 2, gateway: 'stripe' }),
      }).ok
    ).toBe(false);
  });

  it('recusa quando não há plano de origem ou destino', () => {
    expect(validatePlanChange({ targetPlan: plan({ id: 2 }) }).message).toMatch(
      /não tem assinatura ativa/i
    );
    expect(validatePlanChange({ currentPlan: plan() }).message).toMatch(
      /destino inválido/i
    );
    expect(validatePlanChange().ok).toBe(false);
  });
});

describe('mapPlanAdmin / mapPlanPublic', () => {
  const planRow = {
    id: 5,
    plan_name: 'pro_mensal',
    display_name: 'Pro',
    tier: 'pro',
    price_cents: 2900,
    currency: 'BRL',
    billing_interval: 'month',
    count_downloads: 0,
    features: ['Ilimitado'],
    sort_order: 2,
    active: true,
    gateway: 'asaas',
    stripe_price_id: 'price_legado',
  };

  it('admin enxerga gateway e o legado da Stripe', () => {
    const mapped = mapPlanAdmin(planRow);
    expect(mapped.gateway).toBe('asaas');
    expect(mapped.monthlyDownloadCap).toBeNull();
    expect(mapped.legacyStripePriceId).toBe('price_legado');
    expect(mapped.billable).toBe(true);
    expect(mapped.priceFormatted.replace(/\u00a0/g, ' ')).toBe('R$ 29,00');
  });

  it('público não expõe nada de gateway', () => {
    const mapped = mapPlanPublic(planRow);
    expect(mapped).not.toHaveProperty('gateway');
    expect(mapped).not.toHaveProperty('legacyStripePriceId');
    expect(mapped).not.toHaveProperty('stripePriceId');
    // O checkout do site usa `plans.id`, então trocar de gateway não muda o front.
    expect(mapped.id).toBe(5);
    expect(mapped.name).toBe('Pro');
  });

  it('mapeia nulo sem quebrar', () => {
    expect(mapPlanAdmin(null)).toBeNull();
    expect(mapPlanPublic(null)).toBeNull();
  });
});
