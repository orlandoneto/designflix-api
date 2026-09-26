jest.mock('../../src/utils/emailService', () => ({
  sendEmail: jest.fn(),
}));

const {
  PLAN_NOTICE_TEMPLATE,
  PLAN_NOTICE_KINDS,
  buildPlanNotice,
  sendPlanNotice,
} = require('../../src/services/plans/plan-notifications');
const { sendEmail } = require('../../src/utils/emailService');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('buildPlanNotice', () => {
  it('past_due avisa o vencimento, a tolerância e traz o link da fatura', () => {
    const notice = buildPlanNotice({
      kind: PLAN_NOTICE_KINDS.PAST_DUE,
      userName: 'Ana',
      planName: 'Premium',
      invoiceUrl: 'https://asaas.com/i/123',
    });

    expect(notice.ok).toBe(true);
    expect(notice.subject).toBe('ON Graph - Cobrança vencida');
    expect(notice.context.name).toBe('Ana');
    expect(notice.context.invoiceUrl).toBe('https://asaas.com/i/123');
    expect(notice.context.message).toContain('plano Premium');
    expect(notice.context.message).toContain('continua liberado');
    expect(notice.context.nextStep).toContain('link abaixo');
    expect(notice.description).toBe(
      `${notice.context.message} ${notice.context.nextStep}`
    );
  });

  it('past_due sem fatura não promete link nenhum', () => {
    const notice = buildPlanNotice({
      kind: PLAN_NOTICE_KINDS.PAST_DUE,
      userName: 'Ana',
      planName: 'Premium',
    });

    expect(notice.context.invoiceUrl).toBe('');
    expect(notice.context.actionLabel).toBe('');
    expect(notice.context.nextStep).not.toContain('link abaixo');
  });

  it('suspended explica o corte e como voltar', () => {
    const notice = buildPlanNotice({
      kind: PLAN_NOTICE_KINDS.SUSPENDED,
      userName: 'Bruno',
      planName: 'Premium',
      invoiceUrl: 'https://asaas.com/i/456',
    });

    expect(notice.ok).toBe(true);
    expect(notice.subject).toBe('ON Graph - Acesso suspenso');
    expect(notice.context.message).toContain('suspenso');
    expect(notice.context.nextStep).toContain('liberar o acesso');
    expect(notice.context.actionLabel).toBe('Pagar fatura');
  });

  it('expired diz que o período pago acabou e que a conta voltou ao gratuito', () => {
    const notice = buildPlanNotice({
      kind: PLAN_NOTICE_KINDS.EXPIRED,
      userName: 'Carla',
      planName: 'Premium',
    });

    expect(notice.ok).toBe(true);
    expect(notice.subject).toBe('ON Graph - Plano encerrado');
    expect(notice.context.message).toContain('plano gratuito');
    expect(notice.context.nextStep).toContain('assine um plano');
  });

  it('canceled confirma o cancelamento e informa até quando o acesso vale', () => {
    const notice = buildPlanNotice({
      kind: PLAN_NOTICE_KINDS.CANCELED,
      userName: 'Davi',
      planName: 'Premium',
      accessUntil: '2026-10-07',
    });

    expect(notice.ok).toBe(true);
    expect(notice.subject).toBe('ON Graph - Cancelamento confirmado');
    expect(notice.context.message).toContain('cancelamento');
    expect(notice.context.nextStep).toContain('07/10/2026');
    expect(notice.context.accessUntil).toBe('07/10/2026');
  });

  it('canceled sem data cai no texto genérico do período pago', () => {
    const notice = buildPlanNotice({
      kind: PLAN_NOTICE_KINDS.CANCELED,
      userName: 'Davi',
      planName: 'Premium',
    });

    expect(notice.context.accessUntil).toBe('');
    expect(notice.context.nextStep).toContain('fim do período já pago');
  });

  it('kind desconhecido não monta aviso', () => {
    expect(buildPlanNotice({ kind: 'qualquer_coisa' })).toEqual({
      ok: false,
      message: 'Tipo de aviso desconhecido: qualquer_coisa',
    });
    expect(buildPlanNotice()).toEqual({
      ok: false,
      message: 'Tipo de aviso desconhecido: undefined',
    });
  });

  it('sem nome e sem plano usa texto neutro', () => {
    const notice = buildPlanNotice({ kind: PLAN_NOTICE_KINDS.SUSPENDED });

    expect(notice.context.name).toBe('assinante');
    expect(notice.context.planName).toBe('');
    expect(notice.context.message).toContain('acesso ao plano foi suspenso');
  });

  describe('formatação de accessUntil', () => {
    it('data sem hora não escorrega um dia no fuso do Brasil', () => {
      const notice = buildPlanNotice({
        kind: PLAN_NOTICE_KINDS.CANCELED,
        accessUntil: '2026-01-01',
      });
      expect(notice.context.accessUntil).toBe('01/01/2026');
    });

    it('aceita ISO com hora usando só a parte da data', () => {
      const notice = buildPlanNotice({
        kind: PLAN_NOTICE_KINDS.CANCELED,
        accessUntil: '2026-10-07T00:00:00.000Z',
      });
      expect(notice.context.accessUntil).toBe('07/10/2026');
    });

    it('aceita Date usando o calendário local', () => {
      const notice = buildPlanNotice({
        kind: PLAN_NOTICE_KINDS.CANCELED,
        accessUntil: new Date(2026, 9, 7, 10, 0, 0),
      });
      expect(notice.context.accessUntil).toBe('07/10/2026');
    });

    it('valor inválido vira string vazia', () => {
      expect(
        buildPlanNotice({
          kind: PLAN_NOTICE_KINDS.CANCELED,
          accessUntil: 'nao-e-data',
        }).context.accessUntil
      ).toBe('');
      expect(
        buildPlanNotice({
          kind: PLAN_NOTICE_KINDS.CANCELED,
          accessUntil: new Date('invalido'),
        }).context.accessUntil
      ).toBe('');
    });
  });
});

describe('sendPlanNotice', () => {
  it('envia com título, texto e template certos', async () => {
    sendEmail.mockResolvedValue({ messageId: 'abc' });

    const result = await sendPlanNotice({
      kind: PLAN_NOTICE_KINDS.SUSPENDED,
      user: { name: 'Ana', email: 'ana@example.com' },
      planName: 'Premium',
    });

    expect(result).toEqual({ sent: true, kind: 'suspended' });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const [paramsEmail, templateName, context] = sendEmail.mock.calls[0];
    expect(paramsEmail).toEqual({
      email: 'ana@example.com',
      title: 'ON Graph - Acesso suspenso',
      description: expect.stringContaining('suspenso'),
    });
    expect(templateName).toBe(PLAN_NOTICE_TEMPLATE);
    expect(context).toEqual(
      expect.objectContaining({
        kind: 'suspended',
        name: 'Ana',
        planName: 'Premium',
        year: expect.any(Number),
      })
    );
  });

  it('usuário sem e-mail não dispara envio', async () => {
    const semEmail = await sendPlanNotice({
      kind: PLAN_NOTICE_KINDS.EXPIRED,
      user: { name: 'Ana', email: '  ' },
    });
    const semUsuario = await sendPlanNotice({
      kind: PLAN_NOTICE_KINDS.EXPIRED,
    });

    expect(semEmail).toEqual({ sent: false, reason: 'sem e-mail' });
    expect(semUsuario).toEqual({ sent: false, reason: 'sem e-mail' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('kind desconhecido não envia', async () => {
    const result = await sendPlanNotice({
      kind: 'inexistente',
      user: { email: 'ana@example.com' },
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('desconhecido');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('erro do transporte não propaga para o chamador', async () => {
    sendEmail.mockRejectedValue(new Error('SMTP fora do ar'));

    const result = await sendPlanNotice({
      kind: PLAN_NOTICE_KINDS.PAST_DUE,
      user: { name: 'Ana', email: 'ana@example.com' },
      planName: 'Premium',
    });

    expect(result).toEqual({ sent: false, reason: 'falha no envio' });
    expect(console.error).toHaveBeenCalled();
  });
});
