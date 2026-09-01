#!/usr/bin/env node
/**
 * Desenvolvimento local: Mailpit (Docker) + sync .env + nodemon.
 * Para o Mailpit ao encerrar a API (Ctrl+C), se este script o tiver iniciado.
 *
 * Uso: yarn dev
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const mailpit = require("./mailpit");

const root = path.resolve(__dirname, "..");
const devEnv = {
  ...process.env,
  NODE_ENV: "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",
};

let nodemon;
let cleanedUp = false;
let stopMailpitOnExit = false;

function syncSetEnv() {
  execSync("node scripts/setEnv.js development", {
    cwd: root,
    stdio: "inherit",
    env: devEnv,
  });
}

function stopMailpitIfNeeded() {
  if (!stopMailpitOnExit) return;
  try {
    mailpit.down();
  } catch (error) {
    console.warn(`⚠ Não foi possível parar o Mailpit: ${error.message}`);
  }
}

function cleanup(exitCode = 0) {
  if (cleanedUp) return;
  cleanedUp = true;

  if (nodemon && !nodemon.killed) {
    nodemon.kill("SIGTERM");
  }

  stopMailpitIfNeeded();
  process.exit(exitCode);
}

function shutdownFromSignal(signal) {
  console.log(`\n↪ ${signal} — encerrando API e Mailpit (dev)...\n`);
  cleanup(0);
}

async function main() {
  const wasRunning = mailpit.containerRunning();

  console.log("\n📬 Mailpit (dev) — preparando container...\n");
  mailpit.up();
  stopMailpitOnExit = !wasRunning;

  if (stopMailpitOnExit) {
    console.log("ℹ Mailpit será parado ao encerrar yarn dev.\n");
  } else {
    console.log("ℹ Mailpit já estava rodando — não será parado ao sair.\n");
  }

  syncSetEnv();

  console.log("🚀 Iniciando API (nodemon)...\n");

  nodemon = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["nodemon", "src/main.js"],
    {
      cwd: root,
      stdio: "inherit",
      env: devEnv,
      shell: process.platform === "win32",
    }
  );

  nodemon.on("exit", (code) => {
    if (cleanedUp) return;
    cleanedUp = true;
    stopMailpitIfNeeded();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => shutdownFromSignal("SIGINT"));
process.on("SIGTERM", () => shutdownFromSignal("SIGTERM"));

main().catch((error) => {
  console.error(error.message);
  cleanup(1);
});
