const {
  ASAAS_WEBHOOK_PATH,
  buildWebhookUrl,
  resolveWebhookSource,
  logAsaasWebhookUrl,
} = require('../../src/utils/devWebhookNotice');

describe('buildWebhookUrl', () => {
  it('junta base e rota sem barra dupla', () => {
    expect(buildWebhookUrl('https://abc.ngrok-free.dev/')).toBe(
      `https://abc.ngrok-free.dev${ASAAS_WEBHOOK_PATH}`
    );
  });

  it('base vazia não vira URL quebrada', () => {
    expect(buildWebhookUrl('')).toBe('');
    expect(buildWebhookUrl(undefined)).toBe('');
  });
});

describe('resolveWebhookSource', () => {
  it('túnel ativo ganha do env — env pode ser de sessão antiga', () => {
    const resolved = resolveWebhookSource({
      tunnelUrl: 'https://novo.ngrok-free.dev',
      envUrl: 'https://velho.ngrok-free.dev/asaas/webhook',
    });

    expect(resolved).toEqual({
      url: `https://novo.ngrok-free.dev${ASAAS_WEBHOOK_PATH}`,
      source: 'tunnel',
    });
  });

  it('sem túnel, cai para o env', () => {
    const resolved = resolveWebhookSource({
      envUrl: 'https://fixo.ngrok-free.dev/asaas/webhook',
    });

    expect(resolved.source).toBe('env');
    expect(resolved.url).toBe('https://fixo.ngrok-free.dev/asaas/webhook');
  });

  it('sem túnel e sem env, não inventa URL', () => {
    expect(resolveWebhookSource({})).toEqual({ url: '', source: 'none' });
  });
});

describe('logAsaasWebhookUrl', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUrl = process.env.ASAAS_WEBHOOK_DEV_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ASAAS_WEBHOOK_DEV_URL = originalUrl;
  });

  it('em produção não loga nada: é ferramenta de dev', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ASAAS_WEBHOOK_DEV_URL = 'https://fixo.ngrok-free.dev/asaas/webhook';
    const logger = { log: jest.fn() };

    const resolved = await logAsaasWebhookUrl({ logger });

    expect(logger.log).not.toHaveBeenCalled();
    expect(resolved.source).toBe('none');
  });

  it('sem túnel ativo, avisa que pagamento confirmado não libera acesso', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ASAAS_WEBHOOK_DEV_URL;
    const logger = { log: jest.fn() };

    const resolved = await logAsaasWebhookUrl({ logger });

    expect(resolved.source).toBe('none');
    expect(logger.log.mock.calls.join(' ')).toMatch(/sem túnel ativo/i);
  });

  it('com URL no env, mostra o endereço e de onde ele veio', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ASAAS_WEBHOOK_DEV_URL = 'https://fixo.ngrok-free.dev/asaas/webhook';
    const logger = { log: jest.fn() };

    const resolved = await logAsaasWebhookUrl({ logger });

    expect(resolved.source).toBe('env');
    const output = logger.log.mock.calls.join(' ');
    expect(output).toContain('https://fixo.ngrok-free.dev/asaas/webhook');
    expect(output).toMatch(/\.env/);
  });
});
