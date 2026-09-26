const migration = require('../../migrations/20260926140000-rename-otp-to-otps');

const Sequelize = {
  INTEGER: 'INTEGER',
  STRING: 'STRING',
  DATE: 'DATE',
  literal: (v) => ({ literal: v }),
};

function fakeQueryInterface(tables) {
  return {
    showAllTables: jest.fn().mockResolvedValue(tables),
    renameTable: jest.fn().mockResolvedValue(),
    createTable: jest.fn().mockResolvedValue(),
  };
}

describe('migration 20260926140000-rename-otp-to-otps', () => {
  it('renomeia otp -> otps quando só existe a tabela legada (produção)', async () => {
    const qi = fakeQueryInterface(['admin', 'otp', 'user']);
    await migration.up(qi, Sequelize);
    expect(qi.renameTable).toHaveBeenCalledWith('otp', 'otps');
    expect(qi.createTable).not.toHaveBeenCalled();
  });

  it('não faz nada quando otps já existe (banco vindo de dump)', async () => {
    const qi = fakeQueryInterface([{ tableName: 'otps' }, { tableName: 'user' }]);
    await migration.up(qi, Sequelize);
    expect(qi.renameTable).not.toHaveBeenCalled();
    expect(qi.createTable).not.toHaveBeenCalled();
  });

  it('cria otps com colunas snake_case quando nenhuma existe', async () => {
    const qi = fakeQueryInterface(['user']);
    await migration.up(qi, Sequelize);
    expect(qi.createTable).toHaveBeenCalledTimes(1);
    const [name, columns] = qi.createTable.mock.calls[0];
    expect(name).toBe('otps');
    expect(Object.keys(columns)).toEqual(['id', 'email', 'otp', 'created_at', 'updated_at']);
  });

  it('down renomeia de volta para otp', async () => {
    const qi = fakeQueryInterface(['otps']);
    await migration.down(qi);
    expect(qi.renameTable).toHaveBeenCalledWith('otps', 'otp');
  });

  it('bate com o tableName do model Otps', () => {
    const defineSpy = jest.fn((name, attrs, opts) => ({ name, opts }));
    const model = require('../../src/models/otps')({ define: defineSpy }, { INTEGER: 1, STRING: 1, DATE: 1, NOW: 1 });
    expect(model.opts.tableName).toBe('otps');
  });
});