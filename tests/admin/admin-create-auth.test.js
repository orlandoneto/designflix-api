/**
 * POST /admin (criar administrador) exige super_admin.
 * Pentest 2026-09-26: a rota não tinha autenticação nenhuma.
 */
jest.mock('../../src/models', () => ({
  Admin: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  User: { findOne: jest.fn() },
  Installer: {},
}));

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const { Admin, User } = require('../../src/models');
const { getJwtPrivateKey, JWT_ALGORITHM } = require('../../src/utils/jwtKeys');

function buildApp() {
  const app = express();
  app.use(express.json());
  require('../../src/controller/admin.controller')(app);
  return app;
}

function sign(payload, key = getJwtPrivateKey()) {
  return jwt.sign(payload, key, { algorithm: JWT_ALGORITHM, expiresIn: 600 });
}

const SUPER = { id: 1, email: 'super@example.com', userType: 'super_admin' };
const ADMIN = { id: 2, email: 'admin@example.com', userType: 'admin' };
const USER = { id: 9, email: 'user@example.com', userType: 'user' };
const NEW_ADMIN = { name: 'Novo', email: 'novo@example.com', password: 'senha-forte-123' };

describe('POST /admin — criação de admin exige super_admin', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    Admin.findOne.mockImplementation(async ({ where }) => {
      if (where.super_admin === 1) return where.id === SUPER.id ? { id: SUPER.id } : null;
      if (where.id === ADMIN.id) return { id: ADMIN.id };
      if (where.email === NEW_ADMIN.email) return null;
      return null;
    });
    User.findOne.mockResolvedValue({ id: USER.id });
    Admin.create.mockImplementation(async (data) => ({
      dataValues: { id: 3, ...data, password: '$2b$10$hash', super_admin: 0 },
    }));
  });

  it('sem token → 401 e não cria', async () => {
    const res = await request(app).post('/admin').send(NEW_ADMIN);
    expect(res.status).toBe(401);
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('token assinado com outra chave (ex.: a chave antiga vazada) → 401', async () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign(SUPER, privateKey)}`)
      .send(NEW_ADMIN);
    expect(res.status).toBe(401);
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('admin comum → 403 e não cria', async () => {
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign(ADMIN)}`)
      .send(NEW_ADMIN);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permissão/i);
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('usuário do site → 403 e não cria', async () => {
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign(USER)}`)
      .send(NEW_ADMIN);
    expect(res.status).toBe(403);
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('token super_admin de conta que não é mais super_admin no banco → 401', async () => {
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign({ ...SUPER, id: 77 })}`)
      .send(NEW_ADMIN);
    expect(res.status).toBe(401);
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('super_admin → 200, cria admin comum e não devolve a senha', async () => {
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign(SUPER)}`)
      .send({ ...NEW_ADMIN, super_admin: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(expect.objectContaining({ id: 3, email: NEW_ADMIN.email }));
    expect(res.body.data.password).toBeUndefined();
    expect(Admin.create).toHaveBeenCalledWith({
      email: NEW_ADMIN.email,
      password: NEW_ADMIN.password,
      name: NEW_ADMIN.name,
    });
  });

  it('super_admin com senha curta → 400', async () => {
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign(SUPER)}`)
      .send({ ...NEW_ADMIN, password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('super_admin com e-mail já cadastrado → 400', async () => {
    Admin.findOne.mockImplementation(async ({ where }) =>
      where.super_admin === 1 ? { id: SUPER.id } : { id: 5, email: NEW_ADMIN.email }
    );
    const res = await request(app)
      .post('/admin')
      .set('Authorization', `Bearer ${sign(SUPER)}`)
      .send(NEW_ADMIN);
    expect(res.status).toBe(400);
    expect(Admin.create).not.toHaveBeenCalled();
  });
});
