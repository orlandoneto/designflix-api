/**
 * Diagnóstico das dependências para o `/health`.
 *
 * Recebe as dependências por parâmetro em vez de importá-las: assim dá para
 * testar sem MySQL nem Redis de pé, e o mesmo diagnóstico serve a outro
 * chamador (script de deploy, por exemplo).
 *
 * Regra de gravidade: banco fora significa API fora, porque nenhuma rota
 * entrega resposta útil sem ele. Redis fora é degradação — `config/redis.js`
 * é explícito em seguir funcionando sem cache —, então continua 200 para o
 * balanceador não tirar do ar uma instância que ainda serve o cliente.
 */

const DEPENDENCY_STATUS = {
  UP: 'up',
  DOWN: 'down',
};

async function checkDatabase(sequelize) {
  try {
    await sequelize.authenticate();
    return { status: DEPENDENCY_STATUS.UP };
  } catch (error) {
    return { status: DEPENDENCY_STATUS.DOWN, reason: error.message };
  }
}

/** O ioredis mantém `status`; 'ready' é o único estado que aceita comando. */
function checkCache(redis) {
  const status = redis && redis.status;
  if (status === 'ready') return { status: DEPENDENCY_STATUS.UP };
  return { status: DEPENDENCY_STATUS.DOWN, reason: `redis status: ${status || 'indisponível'}` };
}

async function inspectHealth({ sequelize, redis }) {
  const [database, cache] = [await checkDatabase(sequelize), checkCache(redis)];

  return {
    healthy: database.status === DEPENDENCY_STATUS.UP,
    degraded: cache.status === DEPENDENCY_STATUS.DOWN,
    checks: { database, cache },
  };
}

module.exports = {
  DEPENDENCY_STATUS,
  checkDatabase,
  checkCache,
  inspectHealth,
};
