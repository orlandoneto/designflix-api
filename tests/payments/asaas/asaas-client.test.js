const {
  resolveHttpsAgentAsaas,
} = require('../../../src/services/payments/gateways/asaas/asaas-client');

describe('resolveHttpsAgentAsaas', () => {
  const originalInsecure = process.env.ASAAS_TLS_INSECURE;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.ASAAS_TLS_INSECURE = originalInsecure;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('sem a flag, usa a validação normal de certificado', () => {
    delete process.env.ASAAS_TLS_INSECURE;
    process.env.NODE_ENV = 'development';

    expect(resolveHttpsAgentAsaas()).toBeUndefined();
  });

  it('com a flag em dev, devolve agente que não valida a cadeia', () => {
    process.env.ASAAS_TLS_INSECURE = 'true';
    process.env.NODE_ENV = 'development';

    const agent = resolveHttpsAgentAsaas();

    expect(agent).toBeDefined();
    expect(agent.options.rejectUnauthorized).toBe(false);
  });

  it('reaproveita o mesmo agente — um por request vazaria socket', () => {
    process.env.ASAAS_TLS_INSECURE = 'true';
    process.env.NODE_ENV = 'development';

    expect(resolveHttpsAgentAsaas()).toBe(resolveHttpsAgentAsaas());
  });

  it('em produção a flag é ignorada: aqui passa dinheiro', () => {
    process.env.ASAAS_TLS_INSECURE = 'true';
    process.env.NODE_ENV = 'production';

    expect(resolveHttpsAgentAsaas()).toBeUndefined();
  });
});
