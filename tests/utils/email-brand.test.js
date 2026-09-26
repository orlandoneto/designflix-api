const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const VIEWS = path.resolve(__dirname, '../../src/views');
const OLD_BRAND = /flix\s*design|designflix|FLIX DESIGN/i;
const templates = fs.readdirSync(VIEWS).filter((f) => f.endsWith('.hbs'));

handlebars.registerHelper('eq', (a, b) => a === b);

describe('marca ON Graph nos e-mails', () => {
  it('existe pelo menos um template', () => {
    expect(templates.length).toBeGreaterThan(5);
  });

  it.each(templates)('%s usa ON Graph e o logo do site, sem a marca antiga', (file) => {
    const source = fs.readFileSync(path.join(VIEWS, file), 'utf8');
    const html = handlebars.compile(source)({
      baseUrl: 'https://api.ongraph.com.br',
      year: 2026,
      name: 'Pessoa',
    });

    expect(html).not.toMatch(OLD_BRAND);
    expect(html).toContain('ON Graph');
    expect(html).toContain('https://api.ongraph.com.br/brand/logo-ongraph.png');
    expect(html).not.toContain('/logo.png"');
  });

  it('o logo usado nos e-mails existe em public/', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../public/brand/logo-ongraph.png'))).toBe(true);
  });

  it.each([
    'src/services/auth-public.service.js',
    'src/services/admin.service.js',
    'src/services/contributor.service.js',
    'src/services/plans/plan-notifications.js',
    'src/services/paymentStripe.service.js',
    'src/cron/removeStripeExpiredPlansJob.js',
    'src/utils/emailService.js',
  ])('%s não usa a marca antiga em assunto/texto', (rel) => {
    const src = fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8')
      // metadados internos do Stripe (não aparecem para a pessoa)
      .replace(/site: "flixdesign"/g, '')
      // e-mail real de moderador
      .replace(/designflixs3@gmail\.com/g, '');
    expect(src).not.toMatch(OLD_BRAND);
  });

  it('link de redefinição de senha em produção aponta para o site atual', () => {
    const { FORGOT_REDIRECT_URL } = require('../../src/utils/constants/constants');
    expect(FORGOT_REDIRECT_URL.prod_url).toBe('https://www.ongraph.com.br');
  });
});