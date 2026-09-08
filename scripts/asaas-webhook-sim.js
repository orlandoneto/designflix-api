#!/usr/bin/env node
/**
 * Dispara um evento do Asaas contra a API local, como o gateway faria.
 *
 * Uso:
 *   node scripts/asaas-webhook-sim.js PAYMENT_CONFIRMED --user=5 --plan=10
 *   node scripts/asaas-webhook-sim.js PAYMENT_OVERDUE --user=5 --plan=10
 *
 * Serve para exercitar o nosso lado da confirmação (liberar acesso, trocar de
 * plano, mandar e-mail de vencimento) quando não há túnel público — em rede com
 * inspeção HTTPS o agente do ngrok não conecta, e sem isso o webhook real nunca
 * chega.
 *
 * Não substitui o teste em sandbox: aqui o payload é nosso, não do Asaas.
 * O que ele prova é o roteamento de status, a idempotência e os e-mails.
 *
 * @see docs/contextos/plans.md
 */

require('dotenv').config({ path: __dirname + '/../.env' });

const http = require('http');

const args = process.argv.slice(2);
const eventName = (args.find((arg) => !arg.startsWith('--')) || 'PAYMENT_CONFIRMED').toUpperCase();

function flag(name, fallback = null) {
  const match = args.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : fallback;
}

const userId = Number(flag('user'));
const planId = Number(flag('plan'));
const port = Number(flag('port', process.env.NODE_PORT)) || 3000;
const token = process.env.ASAAS_WEBHOOK_TOKEN || '';

if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(planId) || planId < 1) {
  console.error(
    'Informe --user=<id> e --plan=<id> (ids reais do banco: o webhook resolve o dono pelo externalReference).'
  );
  process.exit(1);
}

if (!token) {
  console.error('ASAAS_WEBHOOK_TOKEN vazio no .env — a API responde 500 sem ele.');
  process.exit(1);
}

/** `YYYY-MM-DD`, formato que o Asaas usa em datas de cobrança. */
function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

// `asaas_event_id` único por execução: repetir o mesmo id testa a idempotência
// (a API responde 200 com meta.duplicated e não reprocessa).
const eventId = flag('event-id', `evt_sim_${Date.now()}`);

const payload = {
  id: eventId,
  event: eventName,
  payment: {
    id: flag('payment-id', `pay_sim_${Date.now()}`),
    subscription: flag('subscription-id', `sub_sim_${userId}`),
    externalReference: `plan:${planId};user:${userId}`,
    value: Number(flag('value', '29')),
    dueDate: isoDate(0),
    nextDueDate: isoDate(30),
    invoiceUrl: flag('invoice-url', 'https://sandbox.asaas.com/i/simulado'),
  },
};

const body = JSON.stringify(payload);

const request = http.request(
  {
    host: '127.0.0.1',
    port,
    path: '/asaas/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'asaas-access-token': token,
    },
  },
  (response) => {
    let raw = '';
    response.on('data', (chunk) => {
      raw += chunk;
    });
    response.on('end', () => {
      console.log(`\n${eventName} → HTTP ${response.statusCode}`);
      try {
        console.log(JSON.stringify(JSON.parse(raw), null, 2));
      } catch {
        console.log(raw);
      }
      console.log(`\nevent id: ${eventId} (repita com --event-id=${eventId} para testar idempotência)\n`);
    });
  }
);

request.on('error', (error) => {
  console.error(`Falha ao chamar a API local em 127.0.0.1:${port}: ${error.message}`);
  console.error('A API está rodando? (npm run dev)');
  process.exit(1);
});

request.write(body);
request.end();
