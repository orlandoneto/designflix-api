/**
 * Recuperação de senha do admin (pentest 2026-09-26).
 * Antes: POST /admin/reset-password trocava a senha de qualquer admin sem autenticação.
 * Agora: pedido genérico + token de uso único (hash no banco, expira) + confirmação.
 */
jest.mock('../../src/models', () => ({
  Admin: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  User: { findOne: jest.fn() },
  Installer: {},
}));

jest.mock('../../src/utils/emailService', () => ({
  sendEmail: jest.fn(),
}));

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { Op } = require('sequelize');

const { Admin } = require('../../src/models');
const { sendEmail } = require('../../src/utils/emailService');
const AdminService = require('../../src/services/admin.service');
const { getJwtPublicKey, JWT_ALGORITHM } = require('../../src/utils/jwtKeys');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

const {
  RESET_REQUEST_OK_MESSAGE,
  INVALID_RESET_TOKEN_MESSAGE,
  RESET_TOKEN_TTL_MINUTES,
  hashResetToken,
} = AdminService;

const ADMIN_ROW = {
  id: 7,
  name: 'Admin',
  email: 'admin@example.com',
  password: '$2b$10$hashatual',
  super_admin: 1,
  resetRequestedAt: null,
};

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

function buildApp() {
  const app = express();
  app.use(express.json());
  require('../../src/controller/admin.controller')(app);
  return app;
}

describe('Admin — pedido de redefinição (POST /admin/reset-password)', () => {
  let savedPanelUrl;

  beforeEach(() => {
    jest.clearAllMocks();
    savedPanelUrl = process.env.ADMIN_PANEL_URL;
    process.env.ADMIN_PANEL_URL = 'https://admin.example.com/';
    sendEmail.mockResolvedValue({ messageId: 'x' });
    Admin.update.mockResolvedValue([1]);
  });

  afterEach(() => {
    if (savedPanelUrl === undefined) delete process.env.ADMIN_PANEL_URL;
    else process.env.ADMIN_PANEL_URL = savedPanelUrl;
  });

  it('sem e-mail → 400', async () => {
    const res = createMockResponse();
    await new AdminService().requestPasswordReset(createMockRequest({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Admin.findOne).not.toHaveBeenCalled();
  });

  it('e-mail inexistente → 200 genérico, sem token e sem e-mail', async () => {
    Admin.findOne.mockResolvedValue(null);
    const res = createMockResponse();
    await new AdminService().requestPasswordReset(
      createMockRequest({ body: { email: 'ninguem@example.com' } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: RESET_REQUEST_OK_MESSAGE });
    expect(Admin.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('e-mail de admin → mesma resposta; grava só o hash, com validade, e envia o link', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW });
    const service = new AdminService();
    const res = createMockResponse();
    const before = Date.now();

    await service.requestPasswordReset(
      createMockRequest({ body: { email: '  ADMIN@example.com ' } }),
      res
    );
    await service.pendingDelivery;

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: RESET_REQUEST_OK_MESSAGE });
    expect(Admin.findOne).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });

    const [values, options] = Admin.update.mock.calls[0];
    expect(options).toEqual({ where: { id: ADMIN_ROW.id } });
    expect(values.resetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    const ttlMs = values.resetTokenExpiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThanOrEqual(RESET_TOKEN_TTL_MINUTES * 60 * 1000 - 1000);
    expect(ttlMs).toBeLessThanOrEqual(RESET_TOKEN_TTL_MINUTES * 60 * 1000 + 5000);
    expect(values.resetRequestedAt).toBeInstanceOf(Date);
    expect(values.password).toBeUndefined();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [params, template, context] = sendEmail.mock.calls[0];
    expect(params.email).toBe(ADMIN_ROW.email);
    expect(template).toBe('adminResetPassword');
    const match = context.resetLink.match(
      /^https:\/\/admin\.example\.com\/reset-password\?token=([a-f0-9]{64})$/
    );
    expect(match).not.toBeNull();
    const rawToken = match[1];
    expect(rawToken).not.toBe(values.resetTokenHash);
    expect(sha256(rawToken)).toBe(values.resetTokenHash);
    expect(context.expiresInLabel).toBe(`${RESET_TOKEN_TTL_MINUTES} minutos`);
  });

  it('pedido repetido dentro do cooldown → 200 genérico, sem novo token nem e-mail', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW, resetRequestedAt: new Date(Date.now() - 10_000) });
    const res = createMockResponse();
    await new AdminService().requestPasswordReset(
      createMockRequest({ body: { email: ADMIN_ROW.email } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe(RESET_REQUEST_OK_MESSAGE);
    expect(Admin.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('depois do cooldown gera novo token (o anterior deixa de valer)', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW, resetRequestedAt: new Date(Date.now() - 120_000) });
    const service = new AdminService();
    const res = createMockResponse();
    await service.requestPasswordReset(createMockRequest({ body: { email: ADMIN_ROW.email } }), res);
    await service.pendingDelivery;
    expect(Admin.update).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('falha no envio do e-mail não muda a resposta (continua 200 genérico)', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW });
    sendEmail.mockRejectedValue(new Error('SMTP fora'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const service = new AdminService();
    const res = createMockResponse();
    await service.requestPasswordReset(createMockRequest({ body: { email: ADMIN_ROW.email } }), res);
    await service.pendingDelivery;
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe(RESET_REQUEST_OK_MESSAGE);
    spy.mockRestore();
  });

  it('HTTP: sem autenticação, conta existente e inexistente têm a mesma resposta', async () => {
    const app = buildApp();
    Admin.findOne.mockResolvedValueOnce(null);
    const a = await request(app).post('/admin/reset-password').send({ email: 'x@example.com' });
    Admin.findOne.mockResolvedValueOnce({ ...ADMIN_ROW });
    const b = await request(app).post('/admin/reset-password').send({ email: ADMIN_ROW.email });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body).toEqual(b.body);
    // a senha atual nunca é trocada no pedido
    for (const [values] of Admin.update.mock.calls) {
      expect(values.password).toBeUndefined();
    }
  });
});

describe('Admin — validar e confirmar redefinição', () => {
  const RAW = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    Admin.update.mockResolvedValue([1]);
  });

  it('validate: token com formato inválido → 400 sem consultar o banco', async () => {
    const res = createMockResponse();
    await new AdminService().validateResetToken(createMockRequest({ body: { token: 'abc' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(INVALID_RESET_TOKEN_MESSAGE);
    expect(Admin.findOne).not.toHaveBeenCalled();
  });

  it('validate: busca pelo hash e só tokens não expirados; devolve e-mail mascarado', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW });
    const res = createMockResponse();
    await new AdminService().validateResetToken(createMockRequest({ body: { token: RAW } }), res);
    const { where } = Admin.findOne.mock.calls[0][0];
    expect(where.resetTokenHash).toBe(sha256(RAW));
    expect(where.resetTokenExpiresAt[Op.gt]).toBeInstanceOf(Date);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ valid: true, email: 'ad***@example.com' });
  });

  it('validate: token expirado/desconhecido → 400', async () => {
    Admin.findOne.mockResolvedValue(null);
    const res = createMockResponse();
    await new AdminService().validateResetToken(createMockRequest({ body: { token: RAW } }), res);
    expect(res.statusCode).toBe(400);
  });

  it.each([
    [{ password: 'nova-senha-1', confirmPassword: 'nova-senha-1' }, /inválido/i],
    [{ token: RAW, password: 'nova-senha-1' }, /obrigatórias/],
    [{ token: RAW, password: 'curta', confirmPassword: 'curta' }, /8 caracteres/],
    [{ token: RAW, password: 'nova-senha-1', confirmPassword: 'outra-senha-1' }, /não coincidem/],
  ])('confirm: validação %# → 400 sem alterar nada', async (body, message) => {
    const res = createMockResponse();
    await new AdminService().confirmPasswordReset(createMockRequest({ body }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(message);
    expect(Admin.update).not.toHaveBeenCalled();
  });

  it('confirm: token inválido/expirado → 400', async () => {
    Admin.findOne.mockResolvedValue(null);
    const res = createMockResponse();
    await new AdminService().confirmPasswordReset(
      createMockRequest({ body: { token: RAW, password: 'nova-senha-1', confirmPassword: 'nova-senha-1' } }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(INVALID_RESET_TOKEN_MESSAGE);
    expect(Admin.update).not.toHaveBeenCalled();
  });

  it('confirm: troca a senha (bcrypt) e invalida o token no mesmo update condicionado ao hash', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW });
    const res = createMockResponse();
    await new AdminService().confirmPasswordReset(
      createMockRequest({ body: { token: RAW, password: 'nova-senha-1', confirmPassword: 'nova-senha-1' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const [values, options] = Admin.update.mock.calls[0];
    expect(options).toEqual({ where: { id: ADMIN_ROW.id, resetTokenHash: hashResetToken(RAW) } });
    expect(values.password).not.toBe('nova-senha-1');
    expect(await bcrypt.compare('nova-senha-1', values.password)).toBe(true);
    expect(values).toEqual(
      expect.objectContaining({
        isResetPassword: 0,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        resetRequestedAt: null,
      })
    );
  });

  it('confirm: token já consumido por outra requisição (0 linhas) → 400', async () => {
    Admin.findOne.mockResolvedValue({ ...ADMIN_ROW });
    Admin.update.mockResolvedValue([0]);
    const res = createMockResponse();
    await new AdminService().confirmPasswordReset(
      createMockRequest({ body: { token: RAW, password: 'nova-senha-1', confirmPassword: 'nova-senha-1' } }),
      res
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('Admin — login não revela se o e-mail existe e não vaza campos sensíveis', () => {
  beforeEach(() => jest.clearAllMocks());

  it('e-mail inexistente e senha errada têm a mesma resposta 401', async () => {
    Admin.findOne.mockResolvedValueOnce(null);
    const a = createMockResponse();
    await new AdminService().authenticate(createMockRequest({ body: { email: 'x@example.com', password: 'y' } }), a);

    Admin.findOne.mockResolvedValueOnce({ ...ADMIN_ROW, password: bcrypt.hashSync('certa-123', 4) });
    const b = createMockResponse();
    await new AdminService().authenticate(createMockRequest({ body: { email: ADMIN_ROW.email, password: 'errada' } }), b);

    expect(a.statusCode).toBe(401);
    expect(b.statusCode).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it('login ok: token e data sem senha nem campos de reset', async () => {
    Admin.findOne.mockResolvedValue({
      dataValues: {
        ...ADMIN_ROW,
        password: bcrypt.hashSync('certa-123', 4),
        resetTokenHash: 'f'.repeat(64),
        resetTokenExpiresAt: new Date(),
      },
      get password() {
        return this.dataValues.password;
      },
    });
    const res = createMockResponse();
    await new AdminService().authenticate(
      createMockRequest({ body: { email: ADMIN_ROW.email, password: 'certa-123' } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.data.userType).toBe('super_admin');
    for (const obj of [res.body.data, jwt.verify(res.body.token, getJwtPublicKey(), { algorithms: [JWT_ALGORITHM] })]) {
      expect(obj.password).toBeUndefined();
      expect(obj.resetTokenHash).toBeUndefined();
      expect(obj.resetTokenExpiresAt).toBeUndefined();
    }
  });
});
