'use strict';

/**
 * Corrige o nome da tabela de códigos de verificação do cadastro (OTP).
 *
 * `20240827-create-otp.js` cria a tabela `otp`, mas o model `Otps`
 * (src/models/otps.js) usa `tableName: "otps"`. Bancos vindos de dump antigo já
 * tinham `otps`; bancos criados só pelas migrations (produção na VM Oracle)
 * ficaram com `otp` e o `GET /otps/send` quebrava com
 * "Table 'designflix.otps' doesn't exist" → "Erro ao enviar código de verificação".
 *
 * Idempotente:
 * - `otps` já existe      → nada a fazer
 * - só `otp` existe       → renomeia `otp` → `otps` (mantém os dados)
 * - nenhuma das duas      → cria `otps`
 */

const LEGACY_TABLE = 'otp';
const TABLE = 'otps';

async function listTables(queryInterface) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await listTables(queryInterface);
    if (tables.includes(TABLE)) return;

    if (tables.includes(LEGACY_TABLE)) {
      await queryInterface.renameTable(LEGACY_TABLE, TABLE);
      return;
    }

    await queryInterface.createTable(TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      email: { type: Sequelize.STRING, allowNull: false },
      otp: { type: Sequelize.STRING, allowNull: false },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    // Volta ao nome criado por 20240827-create-otp.js (o app deixa de achar a tabela).
    const tables = await listTables(queryInterface);
    if (tables.includes(TABLE) && !tables.includes(LEGACY_TABLE)) {
      await queryInterface.renameTable(TABLE, LEGACY_TABLE);
    }
  },
};