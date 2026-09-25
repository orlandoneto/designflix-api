const fs = require('fs');
const path = require('path');

/**
 * Resolve a versão pública da API (health GET /).
 * Prioridade: VERSION_API no env → package.json version → "0.0.0"
 */
function resolveApiVersion(env = process.env, packageJsonPath = path.join(__dirname, '../../package.json')) {
  const fromEnv = typeof env.VERSION_API === 'string' ? env.VERSION_API.trim() : '';
  if (fromEnv) return fromEnv;

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  } catch (_) {
    /* ignore */
  }

  return '0.0.0';
}

function formatApiOnlineMessage(version) {
  const v = version && String(version).trim() ? String(version).trim() : '0.0.0';
  return `API Designflix online — versão ${v}`;
}

module.exports = {
  resolveApiVersion,
  formatApiOnlineMessage,
};
