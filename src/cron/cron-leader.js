/**
 * Quem agenda os crons quando a API roda em cluster.
 *
 * Produção sobe com PM2 em `exec_mode: "cluster"` e `instances: "max"`, então
 * `main.js` é carregado uma vez por vCPU. Sem esta guarda cada worker agenda os
 * mesmos jobs, e o de planos expirados manda e-mail ao assinante antes de
 * apagar a linha — viraria um e-mail por worker e uma corrida de delete.
 *
 * O PM2 numera os workers em `NODE_APP_INSTANCE`; fora dele a variável não
 * existe e o processo único é o líder.
 */

/** Desliga todos os crons do processo (útil em worker dedicado ou script). */
const CRON_DISABLED_VALUE = 'false';

function isCronLeader(env = process.env) {
  if (String(env.CRON_ENABLED ?? '').trim().toLowerCase() === CRON_DISABLED_VALUE) {
    return false;
  }

  const instance = String(env.NODE_APP_INSTANCE ?? '').trim();
  if (!instance) return true;
  return instance === '0';
}

module.exports = { isCronLeader };
