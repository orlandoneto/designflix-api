const express = require('express');
const request = require('supertest');
const { gone } = require('../../src/utils/httpResponse');
const {
  validateApplicationBody,
  pickProfilePatch,
  mapAccount,
} = require('../../src/services/contributor/contributor-rules');

jest.mock('../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  ContributorApplication: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../src/utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
}));

const { User, ContributorApplication } = require('../../src/models');
const ContributorService = require('../../src/services/contributor.service');

function attachUser(req, _res, next) {
  req.params.userId = '7';
  next();
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/me', attachUser, (req, res) => ContributorService.getMe(req, res));
  app.put('/me', attachUser, (req, res) => ContributorService.updateMe(req, res));
  app.post('/contributor/applications', attachUser, (req, res) => ContributorService.apply(req, res));
  app.get('/contributor/application', attachUser, (req, res) => ContributorService.getMine(req, res));
  app.post('/admin/contributor/applications/:id/approve', (req, res) => {
    req.params.adminId = '99';
    return ContributorService.approve(req, res);
  });
  app.post('/admin/contributor/applications/:id/reject', (req, res) => {
    req.params.adminId = '99';
    return ContributorService.reject(req, res);
  });
  app.get('/admin/users/contributor', (req, res) =>
    gone(res, 'Endpoint removido. Use GET /admin/contributor/applications?status=pending')
  );
  app.put('/user/internal', (req, res) =>
    gone(res, 'Endpoint removido. Use POST /admin/contributor/applications/:id/approve')
  );
  return app;
}

describe('ContributorService HTTP', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /me 200 envelope com contributorStatus', async () => {
    User.findByPk.mockResolvedValue({
      id: 7,
      name: 'Ana',
      email: 'ana@a.com',
      contributor: 0,
      contributorStatus: 'none',
    });
    ContributorApplication.findOne.mockResolvedValue(null);

    const response = await request(app).get('/me');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(7);
    expect(response.body.data.contributorStatus).toBe('none');
    expect(response.body.data.application).toBeNull();
  });

  it('PUT /me ignora contributor e atualiza nome', async () => {
    User.findByPk
      .mockResolvedValueOnce({ id: 7, name: 'Ana', contributor: 0, contributorStatus: 'none' })
      .mockResolvedValueOnce({ id: 7, name: 'Ana Maria', contributor: 0, contributorStatus: 'none' });
    ContributorApplication.findOne.mockResolvedValue(null);
    User.update.mockResolvedValue([1]);
    const response = await request(app).put('/me').send({ contributor: 1, name: 'Ana Maria' });
    expect(response.status).toBe(200);
    expect(User.update).toHaveBeenCalledWith({ name: 'Ana Maria' }, { where: { id: '7' } });
    expect(response.body.data.contributor).toBe(0);
  });

  it('PUT /me 400 se o body só tenta virar colaborador', async () => {
    User.findByPk.mockResolvedValue({ id: 7, name: 'Ana', contributor: 0 });
    const response = await request(app).put('/me').send({ contributor: 1 });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(User.update).not.toHaveBeenCalled();
  });

  it('POST /contributor/applications 400 sem termos', async () => {
    User.findByPk.mockResolvedValue({ id: 7, name: 'Ana', contributor: 0, contributorStatus: 'none' });
    ContributorApplication.findOne.mockResolvedValue(null);
    const response = await request(app).post('/contributor/applications').send({
      portfolioUrl: 'https://site.com',
      about: 'Designer',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/termos/i);
  });

  it('POST /contributor/applications 200 cria pending', async () => {
    User.findByPk
      .mockResolvedValueOnce({
        id: 7,
        name: 'Ana',
        email: 'ana@a.com',
        contributor: 0,
        contributorStatus: 'none',
      })
      .mockResolvedValueOnce({
        id: 7,
        name: 'Ana',
        email: 'ana@a.com',
        contributor: 0,
        contributorStatus: 'pending',
      });
    ContributorApplication.findOne.mockResolvedValue(null);
    ContributorApplication.create.mockResolvedValue({
      id: 3,
      userId: 7,
      portfolioUrl: 'https://site.com',
      about: 'Designer',
      status: 'pending',
    });
    User.update.mockResolvedValue([1]);

    const response = await request(app).post('/contributor/applications').send({
      portfolioUrl: 'https://site.com',
      about: 'Designer de mockups',
      instagram: '@ana',
      acceptCollaborationTerms: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.contributorStatus).toBe('pending');
    expect(ContributorApplication.create).toHaveBeenCalled();
  });

  it('POST 400 se já existe pending', async () => {
    User.findByPk.mockResolvedValue({ id: 7, contributor: 0, contributorStatus: 'pending' });
    ContributorApplication.findOne.mockResolvedValue({ id: 1, status: 'pending' });
    const response = await request(app).post('/contributor/applications').send({
      portfolioUrl: 'https://site.com',
      about: 'Designer',
      acceptCollaborationTerms: true,
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/já tem uma solicitação/i);
  });

  it('legado admin contributor e internal respondem 410', async () => {
    const list = await request(app).get('/admin/users/contributor');
    expect(list.status).toBe(410);
    expect(list.body.success).toBe(false);
    const internal = await request(app).put('/user/internal');
    expect(internal.status).toBe(410);
  });

  it('POST approve 200 ativa colaborador (aba do painel no front)', async () => {
    ContributorApplication.findByPk.mockResolvedValue({
      id: 3,
      userId: 7,
      status: 'pending',
      update: jest.fn().mockResolvedValue(undefined),
    });
    User.update.mockResolvedValue([1]);
    User.findByPk.mockResolvedValue({
      id: 7,
      name: 'Ana',
      email: 'ana@a.com',
      contributor: 1,
      contributorStatus: 'active',
    });

    const response = await request(app).post('/admin/contributor/applications/3/approve').send({});
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.contributorStatus).toBe('active');
    expect(response.body.data.contributor).toBe(1);
    expect(User.update).toHaveBeenCalledWith(
      { contributor: 1, contributorStatus: 'active' },
      { where: { id: 7 } }
    );
  });

  it('POST reject 200 deixa rejected (sem aba no front)', async () => {
    ContributorApplication.findByPk.mockResolvedValue({
      id: 3,
      userId: 7,
      status: 'pending',
      update: jest.fn().mockResolvedValue(undefined),
    });
    User.update.mockResolvedValue([1]);
    User.findByPk.mockResolvedValue({
      id: 7,
      name: 'Ana',
      email: 'ana@a.com',
      contributor: 0,
      contributorStatus: 'rejected',
    });

    const response = await request(app)
      .post('/admin/contributor/applications/3/reject')
      .send({ note: 'portfolio' });
    expect(response.status).toBe(200);
    expect(response.body.data.contributorStatus).toBe('rejected');
    expect(User.update).toHaveBeenCalledWith(
      { contributor: 0, contributorStatus: 'rejected' },
      { where: { id: 7 } }
    );
  });
});

describe('contributor helpers used by HTTP', () => {
  it('validate + pick alinhados ao Figma', () => {
    expect(validateApplicationBody({ acceptCollaborationTerms: true }).ok).toBe(false);
    expect(pickProfilePatch({ email: 'a@a.com' }).patch.email).toBe('a@a.com');
    expect(mapAccount({ id: 1, name: 'A', contributorStatus: 'active' }, null).contributor).toBe(1);
  });

  it('mapAccount alinha contributor=1 só quando active (UI da aba)', () => {
    expect(
      mapAccount({ id: 1, name: 'A', contributorStatus: 'pending', contributor: 0 }, null)
    ).toMatchObject({
      contributor: 0,
      contributorStatus: 'pending',
    });
    expect(
      mapAccount({ id: 1, name: 'A', contributorStatus: 'active', contributor: 1 }, null)
    ).toMatchObject({
      contributor: 1,
      contributorStatus: 'active',
    });
  });
});
