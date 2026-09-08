#!/usr/bin/env node
/**
 * Desenvolvimento local: Mailpit (Docker) + túnel ngrok + sync .env + nodemon.
 * Para o Mailpit e o túnel ao encerrar a API (Ctrl+C), se este script os tiver
 * iniciado.
 *
 * O túnel existe para o webhook do Asaas alcançar a API local. Falha nele não
 * impede a API de subir: quase tudo em dev não depende de webhook, e travar o
 * boot por causa disso seria pior que avisar.
 *
 * Uso: yarn dev
 * Sem túnel: DEV_SKIP_NGROK=true yarn dev
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const mailpit = require("./mailpit");
const ngrok = require("./ngrok");

const root = path.resolve(__dirname, "..");
const devEnv = {
  ...process.env,
  NODE_ENV: "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",
};

let nodemon;
let cleanedUp = false;
let stopMailpitOnExit = false;
let stopNgrokOnExit = false;

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

function stopNgrokIfNeeded() {
  if (!stopNgrokOnExit) return;
  try {
    ngrok.down();
  } catch (error) {
    console.warn(`⚠ Não foi possível parar o ngrok: ${error.message}`);
  }
}

function cleanup(exitCode = 0) {
  if (cleanedUp) return;
  cleanedUp = true;

  if (nodemon && !nodemon.killed) {
    nodemon.kill("SIGTERM");
  }

  stopMailpitIfNeeded();
  stopNgrokIfNeeded();
  process.exit(exitCode);
}

function shutdownFromSignal(signal) {
  console.log(`\n↪ ${signal} — encerrando API, Mailpit e túnel (dev)...\n`);
  cleanup(0);
}

/** Túnel do webhook: avisa e segue quando falha, não derruba o dev. */
async function startTunnel() {
  if (String(process.env.DEV_SKIP_NGROK || "").toLowerCase() === "true") {
    console.log("ℹ DEV_SKIP_NGROK=true — subindo sem túnel do webhook.\n");
    return;
  }

  try {
    const { started } = await ngrok.up();
    stopNgrokOnExit = started;
    if (!started) {
      console.log("ℹ Túnel já estava ativo — não será encerrado ao sair.\n");
    }
  } catch (error) {
    console.warn(`⚠ Túnel do webhook não subiu — o Asaas não vai alcançar a API local.
${error.message}
`);
  }
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

  // Ordem importa: o túnel grava ASAAS_WEBHOOK_DEV_URL nos dois envs, e o
  // setEnv copia .env.development por cima do .env logo depois.
  await startTunnel();

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
    stopNgrokIfNeeded();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => shutdownFromSignal("SIGINT"));
process.on("SIGTERM", () => shutdownFromSignal("SIGTERM"));

main().catch((error) => {
  console.error(error.message);
  cleanup(1);
});
