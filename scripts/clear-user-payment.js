/**
 * Limpa dados locais de pagamento/plano de um usuário — não apaga a conta.
 *
 * Uso (sempre dry-run primeiro):
 *   node scripts/clear-user-payment.js user@email.com
 *   node scripts/clear-user-payment.js user@email.com --apply
 *
 * npm:
 *   npm run plans:clear-payment -- user@email.com
 *   npm run plans:clear-payment -- user@email.com --apply
 *
 * Remove, se existirem:
 *   - asaas_webhook_events ligados às assinaturas Asaas do usuário
 *   - asaas_subscriptions
 *   - user_plans
 *   - plans_download_limits
 *
 * Não cancela nada no painel do Asaas/Stripe — só o espelho no banco local.
 * Pensado para reset de teste em desenvolvimento/sandbox.
 *
 * @see docs/contextos/plans.md
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const email = (process.argv[2] || '').trim();
const apply = process.argv.includes('--apply');

function usageAndExit(code = 1) {
  console.error(`
Uso:
  node scripts/clear-user-payment.js <email>
  node scripts/clear-user-payment.js <email> --apply

Sem --apply só lista o que seria apagado (dry-run).
`);
  process.exit(code);
}

async function main() {
  if (!email || email.startsWith('--')) {
    usageAndExit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [users] = await conn.query(
    'SELECT id, name, email, stripe_account_id FROM `user` WHERE email = ?',
    [email]
  );

  if (!users.length) {
    console.error(`Us não encontrado: ${email}`);
    await conn.end();
    process.exit(1);
  }

  const user = users[0];
  const uid = user.id;
  console.log('USER:', user);

  const [plans] = await conn.query('SELECT * FROM user_plans WHERE user_id = ?', [
    uid,
  ]);
  const [subs] = await conn.query(
    'SELECT * FROM asaas_subscriptions WHERE user_id = ?',
    [uid]
  );

  console.log(`USER_PLANS (${plans.length}):`, plans);
  console.log(`ASAAS_SUBSCRIPTIONS (${subs.length}):`, subs);

  const subIds = subs.map((s) => s.asaas_subscription_id).filter(Boolean);
  let events = [];
  if (subIds.length) {
    const [ev] = await conn.query(
      `SELECT id, asaas_event_id, asaas_event_name, asaas_subscription_id, asaas_payment_id
       FROM asaas_webhook_events
       WHERE asaas_subscription_id IN (?)`,
      [subIds]
    );
    events = ev;
  }
  console.log(`ASAAS_WEBHOOK_EVENTS (${events.length}):`, events);

  let downloadLimits = [];
  try {
    const [dl] = await conn.query(
      'SELECT * FROM plans_download_limits WHERE user_id = ?',
      [uid]
    );
    downloadLimits = dl;
    console.log(`PLANS_DOWNLOAD_LIMITS (${dl.length}):`, dl);
  } catch (err) {
    console.log('PLANS_DOWNLOAD_LIMITS: skip —', err.message);
  }

  const total =
    plans.length + subs.length + events.length + downloadLimits.length;

  if (!apply) {
    console.log(
      total
        ? `\nDry-run: ${total} registro(s) seriam removidos. Rode de novo com --apply.`
        : '\nNada a limpar para este usuário.'
    );
    await conn.end();
    return;
  }

  if (!total) {
    console.log('\nNada a limpar para este usuário.');
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    if (subIds.length) {
      const [r1] = await conn.query(
        'DELETE FROM asaas_webhook_events WHERE asaas_subscription_id IN (?)',
        [subIds]
      );
      console.log('Deleted asaas_webhook_events:', r1.affectedRows);
    }

    const [r2] = await conn.query(
      'DELETE FROM asaas_subscriptions WHERE user_id = ?',
      [uid]
    );
    console.log('Deleted asaas_subscriptions:', r2.affectedRows);

    const [r3] = await conn.query('DELETE FROM user_plans WHERE user_id = ?', [
      uid,
    ]);
    console.log('Deleted user_plans:', r3.affectedRows);

    try {
      const [r4] = await conn.query(
        'DELETE FROM plans_download_limits WHERE user_id = ?',
        [uid]
      );
      console.log('Deleted plans_download_limits:', r4.affectedRows);
    } catch (err) {
      console.log('plans_download_limits delete skip:', err.message);
    }

    await conn.commit();
    console.log(
      `\nOK — pagamento/plano limpos para ${email} (user_id=${uid}). Conta preservada.`
    );
    console.log(
      'Obs.: assinatura no painel Asaas/Stripe, se existir, não foi cancelada.'
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
