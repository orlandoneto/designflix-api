/**
 * Encerramento do processo: drenar antes de morrer.
 *
 * `pm2 reload` manda SIGINT/SIGTERM e espera `kill_timeout` (5s no
 * `ecosystem.production.config.js`) antes de matar à força. Como os timeouts de
 * request são altos de propósito por causa de upload
 * (`CONST.SERVER_REQUEST_TIMEOUT_MS`), sem drenar aqui todo deploy corta
 * upload em andamento.
 *
 * @see docs/architecture/overview.md
 */

/** Abaixo do `kill_timeout` do PM2, senão quem encerra é o SIGKILL. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 4000;

const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'];

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server || typeof server.close !== 'function') return resolve();
    server.close(() => resolve());
  });
}

/**
 * @returns {(signal?: string) => Promise<void>} idempotente: sinal repetido
 * durante o encerramento é ignorado, senão dois SIGTERM fecham o pool duas vezes.
 */
function createShutdownHandler({
  server,
  sequelize,
  redis,
  logger = console,
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
  exit = process.exit,
}) {
  let running = false;

  return async function shutdown(signal = 'desconhecido') {
    if (running) return;
    running = true;

    logger.info(`[Shutdown] ${signal} recebido, drenando conexões...`);

    // Se o dreno travar (conexão pendurada), o processo ainda tem que sair
    // antes do SIGKILL do PM2. `unref` evita que este timer segure o event loop.
    const force = setTimeout(() => {
      logger.error('[Shutdown] tempo esgotado, encerrando à força');
      exit(1);
    }, timeoutMs);
    if (typeof force.unref === 'function') force.unref();

    await closeServer(server);

    // `allSettled`: falha ao fechar o Redis não pode impedir o fechamento do
    // banco, e nenhuma das duas justifica não sair.
    const results = await Promise.allSettled([
      sequelize && sequelize.close ? sequelize.close() : Promise.resolve(),
      redis && redis.quit ? redis.quit() : Promise.resolve(),
    ]);

    results
      .filter((result) => result.status === 'rejected')
      .forEach((result) => {
        logger.error('[Shutdown] falha ao fechar dependência:', result.reason);
      });

    clearTimeout(force);
    logger.info('[Shutdown] encerrado com sucesso');
    exit(0);
  };
}

function registerShutdownSignals(shutdown, target = process) {
  SHUTDOWN_SIGNALS.forEach((signal) => {
    target.on(signal, () => shutdown(signal));
  });
}

/**
 * Rede de segurança para erro que escapou de todo `try/catch`.
 *
 * Promise rejeitada sem tratamento derruba o worker no Node atual, e sem este
 * log o PM2 reinicia sem deixar rastro do motivo. `uncaughtException` deixa o
 * processo em estado incerto, então ali a saída é encerrar de verdade.
 */
function registerProcessGuards({ logger = console, shutdown, target = process }) {
  target.on('unhandledRejection', (reason) => {
    logger.error('[Processo] promise rejeitada sem tratamento:', reason);
  });

  target.on('uncaughtException', (error) => {
    logger.error('[Processo] exceção não capturada:', error);
    if (shutdown) shutdown('uncaughtException');
  });
}

module.exports = {
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  SHUTDOWN_SIGNALS,
  createShutdownHandler,
  registerShutdownSignals,
  registerProcessGuards,
};
