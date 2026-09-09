const {
  createShutdownHandler,
  registerShutdownSignals,
  registerProcessGuards,
  SHUTDOWN_SIGNALS,
} = require('../../src/utils/processLifecycle');

const silentLogger = () => ({ info: jest.fn(), error: jest.fn() });

const fakeServer = () => ({
  close: jest.fn((done) => done()),
});

describe('createShutdownHandler', () => {
  it('fecha servidor, banco e cache antes de sair com 0', async () => {
    const server = fakeServer();
    const sequelize = { close: jest.fn().mockResolvedValue(undefined) };
    const redis = { quit: jest.fn().mockResolvedValue(undefined) };
    const exit = jest.fn();

    const shutdown = createShutdownHandler({
      server,
      sequelize,
      redis,
      logger: silentLogger(),
      exit,
    });

    await shutdown('SIGTERM');

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(sequelize.close).toHaveBeenCalledTimes(1);
    expect(redis.quit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('é idempotente: o segundo sinal não fecha o pool de novo', async () => {
    const sequelize = { close: jest.fn().mockResolvedValue(undefined) };
    const redis = { quit: jest.fn().mockResolvedValue(undefined) };

    const shutdown = createShutdownHandler({
      server: fakeServer(),
      sequelize,
      redis,
      logger: silentLogger(),
      exit: jest.fn(),
    });

    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

    expect(sequelize.close).toHaveBeenCalledTimes(1);
    expect(redis.quit).toHaveBeenCalledTimes(1);
  });

  it('falha ao fechar o Redis não impede fechar o banco nem sair com 0', async () => {
    const sequelize = { close: jest.fn().mockResolvedValue(undefined) };
    const redis = { quit: jest.fn().mockRejectedValue(new Error('sem conexão')) };
    const logger = silentLogger();
    const exit = jest.fn();

    const shutdown = createShutdownHandler({
      server: fakeServer(),
      sequelize,
      redis,
      logger,
      exit,
    });

    await shutdown('SIGTERM');

    expect(sequelize.close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it('não estoura quando o servidor nem chegou a escutar', async () => {
    const exit = jest.fn();
    const shutdown = createShutdownHandler({
      server: null,
      sequelize: { close: jest.fn().mockResolvedValue(undefined) },
      redis: { quit: jest.fn().mockResolvedValue(undefined) },
      logger: silentLogger(),
      exit,
    });

    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe('registerShutdownSignals', () => {
  it('escuta SIGTERM e SIGINT e repassa o nome do sinal', () => {
    const handlers = {};
    const target = { on: jest.fn((event, fn) => { handlers[event] = fn; }) };
    const shutdown = jest.fn();

    registerShutdownSignals(shutdown, target);

    expect(Object.keys(handlers).sort()).toEqual([...SHUTDOWN_SIGNALS].sort());

    handlers.SIGTERM();
    expect(shutdown).toHaveBeenCalledWith('SIGTERM');
  });
});

describe('registerProcessGuards', () => {
  it('loga promise rejeitada sem encerrar o processo', () => {
    const handlers = {};
    const target = { on: jest.fn((event, fn) => { handlers[event] = fn; }) };
    const logger = silentLogger();
    const shutdown = jest.fn();

    registerProcessGuards({ logger, shutdown, target });

    handlers.unhandledRejection(new Error('esqueci o catch'));

    expect(logger.error).toHaveBeenCalled();
    expect(shutdown).not.toHaveBeenCalled();
  });

  it('exceção não capturada loga e dispara o encerramento', () => {
    const handlers = {};
    const target = { on: jest.fn((event, fn) => { handlers[event] = fn; }) };
    const logger = silentLogger();
    const shutdown = jest.fn();

    registerProcessGuards({ logger, shutdown, target });

    handlers.uncaughtException(new Error('estado incerto'));

    expect(logger.error).toHaveBeenCalled();
    expect(shutdown).toHaveBeenCalledWith('uncaughtException');
  });
});
