jest.mock('../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  Otps: {
    findOne: jest.fn(),
    destroy: jest.fn(),
    create: jest.fn(),
  },
  Partners: {
    findOne: jest.fn(),
  },
  UserPartners: {
    create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../src/utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/utils/mailTransport', () => ({
  getForgotRedirectUrl: jest.fn(() => 'http://localhost:3001'),
}));

jest.mock('../../src/services/user.service', () => ({
  simplifyUserData: jest.fn((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
  })),
}));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User, Otps, sequelize } = require('../../src/models');
const { sendEmail } = require('../../src/utils/emailService');
const AuthPublicService = require('../../src/services/auth-public.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

const { getJwtPrivateKey } = require('../../src/utils/jwtKeys');
const privateKey = getJwtPrivateKey();

describe('AuthPublicService', () => {
  const auth = new AuthPublicService();

  beforeEach(() => {
    sequelize.transaction.mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    });
  });

  describe('authenticate', () => {
    it('retorna 400 quando e-mail ou senha estão ausentes', async () => {
      const req = createMockRequest({ body: { email: '', password: '' } });
      const res = createMockResponse();

      await auth.authenticate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({
        success: false,
        message: 'E-mail e senha são obrigatórios',
      });
    });

    it('retorna 400 com mensagem unificada para credenciais inválidas', async () => {
      User.findOne.mockResolvedValue(null);

      const req = createMockRequest({
        body: { email: 'user@test.com', password: 'wrong' },
      });
      const res = createMockResponse();

      await auth.authenticate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('E-mail ou senha incorretos');
    });

    it('retorna 200 com user e token em login válido', async () => {
      const password = '12345678';
      const hashed = await bcrypt.hash(password, 10);
      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@test.com',
        password: hashed,
        name: 'User Test',
      });

      const req = createMockRequest({
        body: { email: 'user@test.com', password },
      });
      const res = createMockResponse();

      await auth.authenticate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('user@test.com');
      expect(typeof res.body.data.token).toBe('string');
    });
  });

  describe('getUserByEmail', () => {
    it('retorna 400 quando e-mail está ausente', async () => {
      const req = createMockRequest({ params: { email: '   ' } });
      const res = createMockResponse();

      await auth.getUserByEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('E-mail é obrigatório');
    });

    it('retorna exists false quando usuário não existe', async () => {
      User.findOne.mockResolvedValue(null);

      const req = createMockRequest({ params: { email: 'novo@test.com' } });
      const res = createMockResponse();

      await auth.getUserByEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Usuário não encontrado',
        data: { exists: false },
      });
    });

    it('retorna exists true quando usuário existe', async () => {
      User.findOne.mockResolvedValue({ id: 1, email: 'user@test.com' });

      const req = createMockRequest({ params: { email: 'user@test.com' } });
      const res = createMockResponse();

      await auth.getUserByEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.data).toEqual({ exists: true });
    });
  });

  describe('verifyOtp', () => {
    it('retorna 400 quando parâmetros estão ausentes', async () => {
      const req = createMockRequest({ query: { email: '', otp: '' } });
      const res = createMockResponse();

      await auth.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('E-mail e código são obrigatórios');
    });

    it('retorna 400 para código inválido', async () => {
      Otps.findOne.mockResolvedValue(null);

      const req = createMockRequest({
        query: { email: 'user@test.com', otp: '000000' },
      });
      const res = createMockResponse();

      await auth.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('Código inválido ou expirado');
    });

    it('retorna 200 e remove OTP após verificação válida', async () => {
      Otps.findOne.mockResolvedValue({ email: 'user@test.com', otp: '123456' });
      Otps.destroy.mockResolvedValue(1);

      const req = createMockRequest({
        query: { email: 'user@test.com', otp: '123456' },
      });
      const res = createMockResponse();

      await auth.verifyOtp(req, res);

      expect(Otps.destroy).toHaveBeenCalledWith({ where: { email: 'user@test.com' } });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.message).toBe('Código verificado com sucesso');
    });
  });

  describe('forgotPassword', () => {
    it('retorna 400 quando e-mail está ausente', async () => {
      const req = createMockRequest({ body: { email: '' } });
      const res = createMockResponse();

      await auth.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('E-mail é obrigatório');
    });

    it('retorna 200 com mensagem genérica mesmo se e-mail não existir', async () => {
      User.findOne.mockResolvedValue(null);

      const req = createMockRequest({ body: { email: 'naoexiste@test.com' } });
      const res = createMockResponse();

      await auth.forgotPassword(req, res);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.message).toBe(
        'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
      );
    });

    it('envia e-mail e retorna 200 quando usuário existe', async () => {
      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@test.com',
        name: 'User',
      });

      const req = createMockRequest({ body: { email: 'user@test.com' } });
      const res = createMockResponse();

      await auth.forgotPassword(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('forgotCheckToken', () => {
    it('retorna 400 para token inválido', async () => {
      const req = createMockRequest({ params: { token: 'token-invalido' } });
      const res = createMockResponse();

      await auth.forgotCheckToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('Token inválido ou expirado');
    });

    it('retorna 200 com dados do usuário para token válido', async () => {
      const token = jwt.sign({ id: 1, email: 'user@test.com' }, privateKey, {
        algorithm: 'RS256',
        expiresIn: '15m',
      });

      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@test.com',
        name: 'User Test',
      });

      const req = createMockRequest({ params: { token } });
      const res = createMockResponse();

      await auth.forgotCheckToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.data).toEqual({
        valid: true,
        email: 'user@test.com',
        name: 'User Test',
      });
    });
  });

  describe('forgotUpdatePassword', () => {
    it('retorna 400 quando senhas não coincidem', async () => {
      const token = jwt.sign({ id: 1, email: 'user@test.com' }, privateKey, {
        algorithm: 'RS256',
        expiresIn: '15m',
      });

      const req = createMockRequest({
        params: { token },
        body: { password: 'nova123', confirmPassword: 'outra123' },
      });
      const res = createMockResponse();

      await auth.forgotUpdatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('Senha e confirmação não coincidem');
    });

    it('retorna 400 quando nova senha é igual à atual', async () => {
      const currentPassword = 'senha123';
      const hashed = await bcrypt.hash(currentPassword, 10);
      const token = jwt.sign({ id: 1, email: 'user@test.com' }, privateKey, {
        algorithm: 'RS256',
        expiresIn: '15m',
      });

      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@test.com',
        password: hashed,
      });

      const req = createMockRequest({
        params: { token },
        body: { password: currentPassword, confirmPassword: currentPassword },
      });
      const res = createMockResponse();

      await auth.forgotUpdatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toBe('A nova senha deve ser diferente da senha atual');
    });

    it('retorna 200 ao redefinir senha com sucesso', async () => {
      const hashed = await bcrypt.hash('antiga123', 10);
      const token = jwt.sign({ id: 1, email: 'user@test.com' }, privateKey, {
        algorithm: 'RS256',
        expiresIn: '15m',
      });

      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@test.com',
        password: hashed,
      });
      User.update.mockResolvedValue([1]);

      const req = createMockRequest({
        params: { token },
        body: { password: 'nova123456', confirmPassword: 'nova123456' },
      });
      const res = createMockResponse();

      await auth.forgotUpdatePassword(req, res);

      expect(User.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.data).toEqual({ requiresReauth: true });
    });
  });
});
