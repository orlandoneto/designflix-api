#!/usr/bin/env node
/**
 * Sobe/para Meilisearch via Docker (WSL no Windows, Docker nativo no Linux/macOS).
 *
 * Uso:
 *   node scripts/meilisearch.js up
 *   node scripts/meilisearch.js down
 *   node scripts/meilisearch.js status
 */

const { execSync } = require('child_process');

const IMAGE = 'getmeili/meilisearch:v1.11';
const CONTAINER = 'designflix-meilisearch';
const PORT = 7700;
const MASTER_KEY = process.env.MEILI_MASTER_KEY || 'masterKey';
const command = (process.argv[2] || 'up').toLowerCase();
const isWindows = process.platform === 'win32';

function run(cmd, silent = false) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: silent ? 'pipe' : 'inherit',
  });
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

function dockerCmd(inner) {
  if (isWindows) {
    const escaped = inner.replace(/"/g, '\\"');
    return `wsl -e bash -lc "${escaped}"`;
  }
  return inner;
}

function docker(args, silent = false) {
  const cmd = dockerCmd(`docker ${args}`);
  return silent ? runSilent(cmd) : run(cmd);
}

function running() {
  const out = docker(`ps --filter name=^/${CONTAINER}$ --format "{{.Names}}"`, true);
  return out.split('\n').some((l) => l.trim() === CONTAINER);
}

function exists() {
  const out = docker(`ps -a --filter name=^/${CONTAINER}$ --format "{{.Names}}"`, true);
  return out.split('\n').some((l) => l.trim() === CONTAINER);
}

switch (command) {
  case 'up': {
    if (running()) {
      console.log(`Meilisearch já está rodando (${CONTAINER})`);
      break;
    }
    if (exists()) {
      docker(`start ${CONTAINER}`);
    } else {
      docker(
        `run -d --name ${CONTAINER} -p ${PORT}:7700 -e MEILI_ENV=development -e MEILI_MASTER_KEY=${MASTER_KEY} -e MEILI_NO_ANALYTICS=true ${IMAGE}`
      );
    }
    console.log(`Meilisearch: http://127.0.0.1:${PORT} (key=${MASTER_KEY})`);
    console.log('Depois rode: npm run catalog:reindex');
    break;
  }
  case 'down': {
    if (running()) docker(`stop ${CONTAINER}`);
    if (exists()) docker(`rm ${CONTAINER}`);
    console.log('Meilisearch parado');
    break;
  }
  case 'status': {
    console.log(running() ? 'running' : exists() ? 'stopped' : 'absent');
    break;
  }
  default:
    console.log('Uso: node scripts/meilisearch.js [up|down|status]');
    process.exit(1);
}
