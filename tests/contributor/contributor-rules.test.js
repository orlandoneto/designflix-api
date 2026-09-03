const {
  pickProfilePatch,
  validateApplicationBody,
  mapAccount,
  mapApplication,
  resolveContributorStatus,
  isActiveContributor,
} = require('../../src/services/contributor/contributor-rules');

describe('contributor-rules', () => {
  it('bloqueia contributor/balance no PATCH de perfil', () => {
    const { patch, forbidden } = pickProfilePatch({
      name: 'Ana',
      contributor: 1,
      balance: 99,
      chavePix: 'abc',
    });
    expect(patch).toEqual({ name: 'Ana', chavePix: 'abc' });
    expect(forbidden).toEqual(expect.arrayContaining(['contributor', 'balance']));
  });

  it('aceita fullName e normaliza username do Figma', () => {
    const { patch } = pickProfilePatch({ fullName: 'Marina Costa', username: '@MarinaCosta' });
    expect(patch).toEqual({ name: 'Marina Costa', username: 'marinacosta' });
  });

  it('exige termos e URL http(s) na candidatura', () => {
    expect(validateApplicationBody({}).ok).toBe(false);
    expect(
      validateApplicationBody({
        portfolioUrl: 'ftp://x.com',
        about: 'Designer',
        acceptCollaborationTerms: true,
      }).ok
    ).toBe(false);
    expect(
      validateApplicationBody({
        portfolioUrl: 'https://behance.net/ana',
        about: 'Faço mockups e PSD.',
        instagram: '@ana',
        acceptCollaborationTerms: true,
      })
    ).toMatchObject({
      ok: true,
      data: {
        portfolioUrl: 'https://behance.net/ana',
        instagram: '@ana',
        about: 'Faço mockups e PSD.',
      },
    });
  });

  it('rejeita candidatura sem aceite dos termos', () => {
    const result = validateApplicationBody({
      portfolioUrl: 'https://site.com',
      about: 'Olá',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/termos/i);
  });

  it('resolve status active pelo flag legado contributor=1', () => {
    expect(resolveContributorStatus({ contributor: 1 })).toBe('active');
    expect(resolveContributorStatus({ contributorStatus: 'pending' })).toBe('pending');
    expect(isActiveContributor({ contributorStatus: 'active' })).toBe(true);
    expect(isActiveContributor({ contributor: 0 })).toBe(false);
  });

  it('mapAccount não devolve password e inclui application', () => {
    const account = mapAccount(
      { id: 1, name: 'Ana', email: 'a@a.com', password: 'secret', contributor: 0, contributorStatus: 'pending' },
      { id: 9, userId: 1, portfolioUrl: 'https://x.com', about: 'Hi', status: 'pending' }
    );
    expect(account.password).toBeUndefined();
    expect(account.contributorStatus).toBe('pending');
    expect(account.application.status).toBe('pending');
    expect(mapApplication(null)).toBeNull();
  });
});
