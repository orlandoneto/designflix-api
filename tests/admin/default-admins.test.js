const {
  DEFAULT_ADMIN_PASSWORD,
  listDefaultAdmins,
  resolveSeedPassword,
} = require('../../src/services/admin/default-admins');

describe('default-admins seed helpers', () => {
  it('lista os dois e-mails padrão de produção', () => {
    const admins = listDefaultAdmins();
    expect(admins).toHaveLength(2);
    expect(admins.map((a) => a.email)).toEqual([
      'orlandoneto23@gmail.com',
      'publicidadeaf2022@gmail.com',
    ]);
    expect(admins.every((a) => a.super_admin === true)).toBe(true);
  });

  it('senha padrão e override por ADMIN_SEED_PASSWORD', () => {
    expect(resolveSeedPassword({})).toBe(DEFAULT_ADMIN_PASSWORD);
    expect(resolveSeedPassword({ ADMIN_SEED_PASSWORD: '  outra  ' })).toBe(
      'outra'
    );
  });
});
