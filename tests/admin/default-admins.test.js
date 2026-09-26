const {
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
    expect(admins.some((a) => 'password' in a)).toBe(false);
  });

  it('não existe senha padrão: sem ADMIN_SEED_PASSWORD o seed falha', () => {
    expect(() => resolveSeedPassword({})).toThrow(/ADMIN_SEED_PASSWORD/);
    expect(() => resolveSeedPassword({ ADMIN_SEED_PASSWORD: '   ' })).toThrow(/ADMIN_SEED_PASSWORD/);
  });

  it('exige senha forte e aceita override por ADMIN_SEED_PASSWORD', () => {
    expect(() => resolveSeedPassword({ ADMIN_SEED_PASSWORD: 'curta' })).toThrow(/12/);
    expect(resolveSeedPassword({ ADMIN_SEED_PASSWORD: '  uma-senha-bem-longa  ' })).toBe(
      'uma-senha-bem-longa'
    );
  });
});
