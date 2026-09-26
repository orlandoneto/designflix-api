'use strict';

/**
 * Recuperação de senha segura do admin (pentest 2026-09-26).
 *
 * Antes: `POST /admin/reset-password` trocava a senha de qualquer admin por uma
 * aleatória e mandava por e-mail, sem autenticação (bloqueio de acesso / DoS).
 *
 * Agora: token de uso único, guardado só como hash SHA-256, com expiração.
 * - `reset_token_hash`       — sha256(hex) do token enviado por e-mail
 * - `reset_token_expires_at` — validade do token (30 min)
 * - `reset_requested_at`     — último pedido (cooldown anti-spam de e-mail)
 *
 * @see docs/contextos/admin-auth.md
 */

const TABLE = 'admin';

async function hasTable(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase())
    .includes(table);
}

async function addColumnIfMissing(queryInterface, table, column, spec) {
  const columns = await queryInterface.describeTable(table);
  if (!columns[column]) {
    await queryInterface.addColumn(table, column, spec);
  }
}

async function removeColumnIfPresent(queryInterface, table, column) {
  const columns = await queryInterface.describeTable(table);
  if (columns[column]) {
    await queryInterface.removeColumn(table, column);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, TABLE))) return;

    await addColumnIfMissing(queryInterface, TABLE, 'reset_token_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      after: 'is_reset_password',
    });
    await addColumnIfMissing(queryInterface, TABLE, 'reset_token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'reset_token_hash',
    });
    await addColumnIfMissing(queryInterface, TABLE, 'reset_requested_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'reset_token_expires_at',
    });

    const indexes = await queryInterface.showIndex(TABLE);
    const hasIndex = indexes.some((i) => i.name === 'idx_admin_reset_token_hash');
    if (!hasIndex) {
      await queryInterface.addIndex(TABLE, ['reset_token_hash'], {
        name: 'idx_admin_reset_token_hash',
      });
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface, TABLE))) return;

    const indexes = await queryInterface.showIndex(TABLE);
    if (indexes.some((i) => i.name === 'idx_admin_reset_token_hash')) {
      await queryInterface.removeIndex(TABLE, 'idx_admin_reset_token_hash');
    }
    await removeColumnIfPresent(queryInterface, TABLE, 'reset_requested_at');
    await removeColumnIfPresent(queryInterface, TABLE, 'reset_token_expires_at');
    await removeColumnIfPresent(queryInterface, TABLE, 'reset_token_hash');
  },
};
