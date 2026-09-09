const { isCronLeader } = require('../../src/cron/cron-leader');

describe('isCronLeader', () => {
  it('é líder fora do PM2, quando não há numeração de worker', () => {
    expect(isCronLeader({})).toBe(true);
    expect(isCronLeader({ NODE_APP_INSTANCE: '' })).toBe(true);
    expect(isCronLeader({ NODE_APP_INSTANCE: '  ' })).toBe(true);
  });

  it('em cluster, só o worker 0 agenda', () => {
    expect(isCronLeader({ NODE_APP_INSTANCE: '0' })).toBe(true);
    expect(isCronLeader({ NODE_APP_INSTANCE: '1' })).toBe(false);
    expect(isCronLeader({ NODE_APP_INSTANCE: '7' })).toBe(false);
  });

  it('CRON_ENABLED=false desliga até no worker líder', () => {
    expect(isCronLeader({ CRON_ENABLED: 'false' })).toBe(false);
    expect(isCronLeader({ CRON_ENABLED: 'FALSE', NODE_APP_INSTANCE: '0' })).toBe(false);
  });

  it('qualquer outro valor de CRON_ENABLED não desliga', () => {
    expect(isCronLeader({ CRON_ENABLED: 'true' })).toBe(true);
    expect(isCronLeader({ CRON_ENABLED: '' })).toBe(true);
  });
});
