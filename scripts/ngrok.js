#!/usr/bin/env node
/**
 * Túnel público para o webhook do Asaas em desenvolvimento.
 *
 * Uso:
 *   node scripts/ngrok.js up
 *   node scripts/ngrok.js down
 *   node scripts/ngrok.js status
 *
 * Por que existe: o Asaas precisa alcançar `POST /asaas/webhook` para confirmar
 * pagamento. Sem o túnel, a cobrança é paga no gateway e o acesso nunca libera
 * aqui — o sintoma clássico de "paguei e não liberou" em dev.
 *
 * Com `ASAAS_WEBHOOK_DEV_DOMAIN` (domínio estático da conta ngrok) a URL é
 * sempre a mesma, então o webhook é cadastrado no painel do Asaas uma única
 * vez. Sem domínio estático o ngrok sorteia uma URL nova a cada boot e o
 * cadastro no painel precisa ser refeito — é isso que o script imprime.
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";
const WEBHOOK_PATH = "/asaas/webhook";
const ENV_URL_KEY = "ASAAS_WEBHOOK_DEV_URL";
const ENV_DOMAIN_KEY = "ASAAS_WEBHOOK_DEV_DOMAIN";
const ROOT = path.resolve(__dirname, "..");
const ENV_FILES = [".env", ".env.development"];
const START_TIMEOUT_MS = 25000;

const command = (process.argv[2] || "up").toLowerCase();
const isWindows = process.platform === "win32";

function readEnvValue(key) {
  for (const file of ENV_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    const match = fs
      .readFileSync(filePath, "utf8")
      .match(new RegExp(`^${key}=(.*)$`, "m"));
    const value = match && match[1] && match[1].trim();
    if (value) return value;
  }
  return "";
}

function resolvePort() {
  return Number(readEnvValue("NODE_PORT")) || 3000;
}

/** Domínio estático explícito, ou inferido da URL já cadastrada no painel. */
function resolveStaticDomain() {
  const explicit = readEnvValue(ENV_DOMAIN_KEY);
  if (explicit) return explicit.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const currentUrl = readEnvValue(ENV_URL_KEY);
  if (!currentUrl) return "";
  try {
    return new URL(currentUrl).host;
  } catch {
    return "";
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.setTimeout(2000, () => request.destroy(new Error("timeout")));
  });
}

/** URL pública do túnel, ou "" enquanto o agente não conectou. */
async function publicUrl() {
  try {
    const data = await getJson(NGROK_API);
    const tunnels = (data && data.tunnels) || [];
    const https = tunnels.find((t) => t && t.public_url && t.public_url.startsWith("https://"));
    const chosen = https || tunnels[0];
    return (chosen && chosen.public_url) || "";
  } catch {
    return "";
  }
}

function agentRunning() {
  const out = runSilent(
    isWindows
      ? 'tasklist /FI "IMAGENAME eq ngrok.exe" /NH'
      : "pgrep -f 'ngrok http' || true"
  );
  return /ngrok/i.test(out);
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

function installed() {
  return Boolean(runSilent("ngrok version"));
}

/** Grava a URL do webhook nos envs para o valor no repo não mentir. */
function persistWebhookUrl(webhookUrl) {
  for (const file of ENV_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const line = new RegExp(`^${ENV_URL_KEY}=.*$`, "m");
    const next = line.test(content)
      ? content.replace(line, `${ENV_URL_KEY}=${webhookUrl}`)
      : `${content.replace(/\s*$/, "")}\n${ENV_URL_KEY}=${webhookUrl}\n`;

    if (next !== content) {
      fs.writeFileSync(filePath, next);
      console.log(`✔ ${ENV_URL_KEY} atualizado em ${file}`);
    }
  }
}

function announce(tunnelUrl, { reused = false } = {}) {
  const webhookUrl = `${tunnelUrl.replace(/\/+$/, "")}${WEBHOOK_PATH}`;
  persistWebhookUrl(webhookUrl);

  console.log(`
🌐 Túnel ${reused ? "já ativo" : "no ar"}: ${tunnelUrl}
🔔 Webhook do Asaas: ${webhookUrl}
   Painel → Integrações → Webhooks. Token do header \`asaas-access-token\`:
   o valor de ASAAS_WEBHOOK_TOKEN.
🔍 Inspetor de requisições: http://127.0.0.1:4040
`);

  return webhookUrl;
}

/**
 * Sobe o túnel e espera a URL pública aparecer.
 *
 * @returns {Promise<{ url: string, started: boolean, child?: import('child_process').ChildProcess }>}
 */
async function up(options = {}) {
  const silent = Boolean(options.silent);
  const log = silent ? () => {} : console.log;

  if (!installed()) {
    throw new Error(
      "ngrok não encontrado no PATH. Instale em https://ngrok.com/download e rode `ngrok config add-authtoken <token>`."
    );
  }

  const existing = await publicUrl();
  if (existing) {
    if (!silent) announce(existing, { reused: true });
    return { url: existing, started: false };
  }

  const port = resolvePort();
  const domain = resolveStaticDomain();
  const args = ["http", String(port), "--log=stdout"];
  if (domain) args.push(`--url=${domain}`);

  log(
    `\n🌐 ngrok — abrindo túnel para localhost:${port}${
      domain ? ` em ${domain} (domínio fixo)` : " (URL sorteada)"
    }...\n`
  );

  const child = spawn(isWindows ? "ngrok.exe" : "ngrok", args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWindows,
  });

  // O log do agente só é mostrado quando algo dá errado: em condição normal
  // ele é ruidoso e a informação útil é a URL.
  let agentLog = "";
  const collect = (chunk) => {
    agentLog += String(chunk);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;

    const url = await publicUrl();
    if (url) {
      if (!silent) announce(url);
      return { url, started: true, child };
    }

    // Erro de TLS/DPI ou domínio já em uso não se resolve esperando.
    if (/ERR_NGROK_|failed to verify certificate|is already online/i.test(agentLog)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  child.kill();
  const hint = /failed to verify certificate/i.test(agentLog)
    ? "\n\nO TLS foi interceptado (antivírus/proxy com inspeção HTTPS). Libere `*.ngrok-agent.com` e `*.ngrok.com` no antivírus, ou desligue a varredura HTTPS."
    : "";
  throw new Error(
    `Túnel não subiu em ${START_TIMEOUT_MS / 1000}s.${hint}\n\nLog do agente:\n${
      agentLog.trim() || "(vazio)"
    }`
  );
}

function down() {
  if (!agentRunning()) {
    console.log("Nenhum agente ngrok rodando.");
    return;
  }
  runSilent(isWindows ? "taskkill /IM ngrok.exe /F" : "pkill -f 'ngrok http'");
  console.log("✔ Túnel encerrado.");
}

async function status() {
  if (!installed()) {
    console.log("ngrok não está instalado (ou não está no PATH).");
    return;
  }

  const url = await publicUrl();
  if (!url) {
    console.log(
      `Sem túnel ativo. Rode: node scripts/ngrok.js up${
        agentRunning() ? "\n(agente rodando, mas sem túnel — veja http://127.0.0.1:4040)" : ""
      }`
    );
    return;
  }

  console.log(`Túnel ativo: ${url}`);
  console.log(`Webhook:     ${url.replace(/\/+$/, "")}${WEBHOOK_PATH}`);
  console.log(`Cadastrado no env: ${readEnvValue(ENV_URL_KEY) || "(vazio)"}`);
}

module.exports = {
  WEBHOOK_PATH,
  installed,
  agentRunning,
  publicUrl,
  resolveStaticDomain,
  up,
  down,
  status,
};

if (require.main === module) {
  const run = async () => {
    switch (command) {
      case "up":
      case "start":
        await up();
        // O agente é filho deste processo: sair mataria o túnel.
        console.log("Ctrl+C encerra o túnel.\n");
        setInterval(() => {}, 1 << 30);
        break;
      case "down":
      case "stop":
        down();
        break;
      case "status":
        await status();
        break;
      default:
        console.error(`Comando desconhecido: ${command}. Use: up | down | status`);
        process.exit(1);
    }
  };

  run().catch((error) => {
    console.error(`\n✖ ${error.message}\n`);
    process.exit(1);
  });
}
