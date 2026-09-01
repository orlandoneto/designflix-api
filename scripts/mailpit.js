#!/usr/bin/env node
/**
 * Sobe/para o Mailpit via Docker no WSL (Windows) ou Docker local (Linux/macOS).
 *
 * Uso:
 *   node scripts/mailpit.js up
 *   node scripts/mailpit.js down
 *   node scripts/mailpit.js status
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MAILPIT_IMAGE = "axllent/mailpit:latest";
const CONTAINER_NAME = "mailpit";
const SMTP_PORT = 1025;
const WEB_PORT = 8025;

const command = (process.argv[2] || "up").toLowerCase();
const isWindows = process.platform === "win32";

function run(cmd, options = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit",
    ...options,
  });
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return "";
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

function containerExists() {
  const out = docker(`ps -a --filter name=^/${CONTAINER_NAME}$ --format "{{.Names}}"`, true);
  return out.split("\n").some((line) => line.trim() === CONTAINER_NAME);
}

function containerRunning() {
  const out = docker(`ps --filter name=^/${CONTAINER_NAME}$ --format "{{.Names}}"`, true);
  return out.split("\n").some((line) => line.trim() === CONTAINER_NAME);
}

function getWslIp() {
  if (!isWindows) return "";
  const out = runSilent('wsl -e bash -lc "hostname -I"');
  return out.split(/\s+/).filter(Boolean)[0] || "";
}

function ensureMailpitEnv() {
  const envDevPath = path.resolve(__dirname, "../.env.development");
  if (!fs.existsSync(envDevPath)) {
    console.warn("⚠ .env.development não encontrado — use env.development.example como base.");
    return;
  }

  let content = fs.readFileSync(envDevPath, "utf8");

  if (!content.includes("EMAIL_USE_MAILPIT=true")) {
    console.warn("⚠ Adicione EMAIL_USE_MAILPIT=true no .env.development");
    return;
  }

  // Docker publica -p 1025:1025 em localhost no Windows. IP do WSL muda e causa ETIMEDOUT.
  const desiredHost = "localhost";
  const hostLine = /^EMAIL_HOST_SMTP=.*$/m;

  if (!hostLine.test(content)) {
    content += `\nEMAIL_HOST_SMTP=${desiredHost}\n`;
    fs.writeFileSync(envDevPath, content);
    console.log(`✔ EMAIL_HOST_SMTP definido como ${desiredHost} (Mailpit via Docker)`);
    return;
  }

  const currentHost = content.match(hostLine)?.[0]?.split("=")[1]?.trim();
  if (currentHost !== desiredHost) {
    content = content.replace(hostLine, `EMAIL_HOST_SMTP=${desiredHost}`);
    fs.writeFileSync(envDevPath, content);
    console.log(
      `✔ EMAIL_HOST_SMTP corrigido: ${currentHost || "?"} → ${desiredHost} (evita IP WSL desatualizado)`
    );
  }
}

function up(options = {}) {
  const silent = Boolean(options.silent);
  const log = silent ? () => {} : console.log;

  if (!silent) {
    console.log("\n📬 Mailpit — subindo container...\n");
  }

  if (containerRunning()) {
    log(`✔ Container "${CONTAINER_NAME}" já está rodando.`);
  } else if (containerExists()) {
    docker(`start ${CONTAINER_NAME}`, silent);
    log(`✔ Container "${CONTAINER_NAME}" iniciado.`);
  } else {
    docker(
      `run -d --name ${CONTAINER_NAME} --restart unless-stopped -p ${WEB_PORT}:${WEB_PORT} -p ${SMTP_PORT}:${SMTP_PORT} ${MAILPIT_IMAGE}`,
      silent
    );
    log(`✔ Container "${CONTAINER_NAME}" criado e iniciado.`);
  }

  ensureMailpitEnv();

  if (!silent) {
    console.log(`
📥 Inbox web:  http://localhost:${WEB_PORT}
📤 SMTP:       localhost:${SMTP_PORT}
`);
  }
}

/** Garante container ativo (uso interno da API em dev). */
function ensureRunning(options = {}) {
  up({ silent: true, ...options });
  return containerRunning();
}

function down() {
  if (!containerExists()) {
    console.log(`Container "${CONTAINER_NAME}" não existe.`);
    return;
  }
  docker(`stop ${CONTAINER_NAME}`);
  console.log(`✔ Container "${CONTAINER_NAME}" parado.`);
}

function status() {
  if (!containerExists()) {
    console.log(`Container "${CONTAINER_NAME}" não existe. Rode: node scripts/mailpit.js up`);
    return;
  }
  docker(`ps -a --filter name=^/${CONTAINER_NAME}$ --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`);
  const wslIp = getWslIp();
  if (wslIp) console.log(`WSL IP (SMTP no Windows): ${wslIp}:${SMTP_PORT}`);
}

module.exports = {
  CONTAINER_NAME,
  containerExists,
  containerRunning,
  up,
  down,
  status,
  ensureMailpitEnv,
  ensureRunning,
};

if (require.main === module) {
  switch (command) {
    case "up":
    case "start":
      up();
      break;
    case "down":
    case "stop":
      down();
      break;
    case "status":
      status();
      break;
    default:
      console.error(`Comando desconhecido: ${command}. Use: up | down | status`);
      process.exit(1);
  }
}
