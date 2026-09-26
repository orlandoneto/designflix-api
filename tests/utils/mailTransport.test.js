/**
 * Transporte SMTP de produção (Brevo, porta 587 STARTTLS) — docs/email-smtp-brevo.md
 */
const ENV_KEYS = [
  'EMAIL_USE_MAILPIT',
  'EMAIL_HOST_SMTP',
  'EMAIL_PORT_SMTP',
  'EMAIL_USER_SMTP',
  'EMAIL_PASS_SMTP',
  'EMAIL_FROM',
  'EMAIL_TLS_INSECURE',
];

describe('mailTransport — SMTP de produção (Brevo)', () => {
  let saved;

  beforeEach(() => {
    saved = {};
    ENV_KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
    jest.resetModules();
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  function setBrevoEnv(port = '587') {
    process.env.EMAIL_USE_MAILPIT = 'false';
    process.env.EMAIL_HOST_SMTP = 'smtp-relay.brevo.com';
    process.env.EMAIL_PORT_SMTP = port;
    process.env.EMAIL_USER_SMTP = 'login@smtp-brevo.com';
    process.env.EMAIL_PASS_SMTP = 'fake-smtp-key';
    process.env.EMAIL_FROM = 'Designflix <remetente@example.com>';
  }

  it('porta 587 usa STARTTLS (secure=false) com autenticação', () => {
    setBrevoEnv('587');
    const { createMailTransport, isMailpitMode } = require('../../src/utils/mailTransport');

    expect(isMailpitMode()).toBe(false);
    const transport = createMailTransport();
    expect(transport.options).toMatchObject({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: 'login@smtp-brevo.com', pass: 'fake-smtp-key' },
    });
  });

  it('porta 465 usa TLS direto (secure=true)', () => {
    setBrevoEnv('465');
    const { createMailTransport } = require('../../src/utils/mailTransport');

    expect(createMailTransport().options).toMatchObject({ port: 465, secure: true });
  });

  it('remetente é EMAIL_FROM (não o login SMTP)', () => {
    setBrevoEnv();
    const { getEmailFrom } = require('../../src/utils/mailTransport');

    expect(getEmailFrom()).toBe('Designflix <remetente@example.com>');
  });

  it('sem EMAIL_FROM cai para EMAIL_USER_SMTP', () => {
    setBrevoEnv();
    delete process.env.EMAIL_FROM;
    const { getEmailFrom } = require('../../src/utils/mailTransport');

    expect(getEmailFrom()).toBe('login@smtp-brevo.com');
  });
});