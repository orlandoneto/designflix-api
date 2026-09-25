const {
  formatApiOnlineMessage,
  resolveApiVersion,
} = require('../../src/utils/apiVersion');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('apiVersion', () => {
  it('usa VERSION_API do env quando definido', () => {
    expect(resolveApiVersion({ VERSION_API: '1.2.3' })).toBe('1.2.3');
  });

  it('cai no package.json se env vazio', () => {
    const tmp = path.join(os.tmpdir(), `df-pkg-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ version: '9.9.9' }));
    expect(resolveApiVersion({ VERSION_API: '' }, tmp)).toBe('9.9.9');
    fs.unlinkSync(tmp);
  });

  it('mensagem de health legível', () => {
    expect(formatApiOnlineMessage('1.0.11')).toBe(
      'API Designflix online — versão 1.0.11'
    );
    expect(formatApiOnlineMessage('')).toBe('API Designflix online — versão 0.0.0');
  });
});
