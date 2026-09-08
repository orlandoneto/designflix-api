const {
  ASAAS_WEBHOOK_TOKEN_HEADER,
  verifyWebhookAsaas,
} = require('../../../src/services/payments/gateways/asaas/asaas-webhook-verify');

const VALID_TOKEN = 'token-de-webhook-com-tamanho-ok';

const buildRequest = (token, body = { event: 'PAYMENT_CONFIRMED' }) => ({
  headers: token ? { [ASAAS_WEBHOOK_TOKEN_HEADER]: token } : {},
  body,
});

describe('verifyWebhookAsaas', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    delete process.env.ASAAS_WEBHOOK_ALLOW_UNVERIFIED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('aceita token correto', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = VALID_TOKEN;
    const result = verifyWebhookAsaas(buildRequest(VALID_TOKEN));
    expect(result.ok).toBe(true);
    expect(result.event.event).toBe('PAYMENT_CONFIRMED');
  });

  it('recusa token errado', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = VALID_TOKEN;
    const result = verifyWebhookAsaas(buildRequest('token-errado-mas-do-tam'));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/inválido/i);
  });

  it('recusa quando o header não veio', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = VALID_TOKEN;
    const result = verifyWebhookAsaas(buildRequest(null));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/ausente/i);
  });

  it('recusa corpo sem evento', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = VALID_TOKEN;
    expect(verifyWebhookAsaas(buildRequest(VALID_TOKEN, {})).ok).toBe(false);
    expect(verifyWebhookAsaas({ headers: {}, body: null }).ok).toBe(false);
  });

  it('sem token configurado devolve 500, não passa direto', () => {
    const result = verifyWebhookAsaas(buildRequest(VALID_TOKEN));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it('token configurado curto demais é tratado como não configurado', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'curto';
    const result = verifyWebhookAsaas(buildRequest('curto'));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it('escape hatch de dev libera sem token', () => {
    process.env.ASAAS_WEBHOOK_ALLOW_UNVERIFIED = 'true';
    const result = verifyWebhookAsaas(buildRequest(null));
    expect(result.ok).toBe(true);
  });

  it('escape hatch não vale em produção', () => {
    process.env.ASAAS_WEBHOOK_ALLOW_UNVERIFIED = 'true';
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const result = verifyWebhookAsaas(buildRequest(null));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);

    process.env.NODE_ENV = previousNodeEnv;
  });
});
