const { notFoundHandler, errorHandler } = require('../../src/middleware/errorHandler');
const { createMockResponse, createMockRequest } = require('../helpers/mockResponse');

const silentLogger = () => ({ error: jest.fn() });

const httpRequest = (overrides = {}) =>
  createMockRequest({ method: 'GET', originalUrl: '/nao-existe', ...overrides });

describe('notFoundHandler', () => {
  it('responde 404 no envelope, não HTML do Express', () => {
    const res = createMockResponse();

    notFoundHandler(httpRequest(), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Endpoint não encontrado',
    });
  });
});

describe('errorHandler', () => {
  it('responde 500 no envelope e registra o erro', () => {
    const res = createMockResponse();
    const logger = silentLogger();

    errorHandler(logger)(new Error('coluna inexistente'), httpRequest(), res, jest.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });

  it('não vaza a mensagem interna para o cliente', () => {
    const res = createMockResponse();

    errorHandler(silentLogger())(
      new Error("Unknown column 'user_plans.secret'"),
      httpRequest(),
      res,
      jest.fn()
    );

    expect(res.body.message).not.toMatch(/user_plans/);
  });

  it('delega ao Express quando a resposta já começou', () => {
    const res = createMockResponse();
    res.headersSent = true;
    const next = jest.fn();
    const error = new Error('quebrou no meio do stream');

    errorHandler(silentLogger())(error, httpRequest(), res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('aguenta erro sem mensagem nem stack', () => {
    const res = createMockResponse();

    errorHandler(silentLogger())(undefined, httpRequest(), res, jest.fn());

    expect(res.statusCode).toBe(500);
  });
});
