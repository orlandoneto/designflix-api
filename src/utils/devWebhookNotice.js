/**
 * Mostra no boot a URL pública do webhook do Asaas (só desenvolvimento).
 *
 * Existe porque o endereço para cadastrar no painel do Asaas é a única
 * informação que muda a cada sessão de dev: o túnel sorteia uma URL nova
 * quando não há domínio estático, e sem ela a cobrança é paga no gateway e o
 * acesso nunca libera aqui.
 *
 * Lê o túnel que estiver de pé — não importa quem o subiu (`npm run dev`,
 * `npm run ngrok:up` ou o agente aberto à mão).
 *
 * @see docs/contextos/plans.md
 */

const http = require('http');

const ASAAS_WEBHOOK_PATH = '/asaas/webhook';
const NGROK_TUNNELS_API = 'http://127.0.0.1:4040/api/tunnels';
const TUNNEL_LOOKUP_TIMEOUT_MS = 1500;

/** Junta base do túnel + rota, sem barra dupla. */
function buildWebhookUrl(baseUrl) {
  const base = String(baseUrl || '').trim();
  if (!base) return '';
  return `${base.replace(/\/+$/, '')}${ASAAS_WEBHOOK_PATH}`;
}

/**
 * De onde vem a URL exibida.
 *
 * O túnel ativo ganha do env: o valor gravado no `.env` pode ser de uma sessão
 * antiga, e anunciar URL morta é pior que não anunciar nada.
 *
 * @returns {{ url: string, source: 'tunnel'|'env'|'none' }}
 */
function resolveWebhookSource({ tunnelUrl, envUrl } = {}) {
  const fromTunnel = buildWebhookUrl(tunnelUrl);
  if (fromTunnel) return { url: fromTunnel, source: 'tunnel' };

  const fromEnv = String(envUrl || '').trim();
  if (fromEnv) return { url: fromEnv, source: 'env' };

  return { url: '', source: 'none' };
}

/** URL https do túnel ngrok local, ou "" se não houver agente. */
function fetchNgrokTunnelUrl() {
  return new Promise((resolve) => {
    const request = http.get(NGROK_TUNNELS_API, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          const tunnels = (JSON.parse(body) || {}).tunnels || [];
          const secure = tunnels.find(
            (tunnel) =>
              tunnel &&
              typeof tunnel.public_url === 'string' &&
              tunnel.public_url.startsWith('https://')
          );
          resolve((secure && secure.public_url) || '');
        } catch {
          resolve('');
        }
      });
    });

    // Agente ausente é o caso normal (dev sem webhook) — silêncio, não erro.
    request.on('error', () => resolve(''));
    request.setTimeout(TUNNEL_LOOKUP_TIMEOUT_MS, () => {
      request.destroy();
      resolve('');
    });
  });
}

/**
 * Loga o bloco do webhook. Nunca estoura: é diagnóstico de dev, não pode
 * derrubar o boot da API.
 */
async function logAsaasWebhookUrl({ logger = console } = {}) {
  if (process.env.NODE_ENV === 'production') return { url: '', source: 'none' };

  try {
    const tunnelUrl = await fetchNgrokTunnelUrl();
    const resolved = resolveWebhookSource({
      tunnelUrl,
      envUrl: process.env.ASAAS_WEBHOOK_DEV_URL,
    });

    if (resolved.source === 'none') {
      logger.log(
        'Webhook Asaas: sem túnel ativo — pagamento confirmado no gateway não libera acesso aqui (npm run ngrok:up)'
      );
      return resolved;
    }

    logger.log(`Webhook Asaas: ${resolved.url}`);
    logger.log(
      resolved.source === 'tunnel'
        ? '  ↑ túnel ativo — cadastre em Asaas → Integrações → Webhooks (header asaas-access-token = ASAAS_WEBHOOK_TOKEN)'
        : '  ↑ valor do .env (nenhum túnel ativo agora) — confirme antes de cadastrar'
    );

    return resolved;
  } catch {
    return { url: '', source: 'none' };
  }
}

module.exports = {
  ASAAS_WEBHOOK_PATH,
  buildWebhookUrl,
  resolveWebhookSource,
  fetchNgrokTunnelUrl,
  logAsaasWebhookUrl,
};
