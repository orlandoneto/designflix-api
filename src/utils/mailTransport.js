const nodemailer = require("nodemailer");
const net = require("net");
const path = require("path");

function isMailpitMode() {
  const port = Number(process.env.EMAIL_PORT_SMTP);
  return (
    process.env.EMAIL_USE_MAILPIT === "true" ||
    port === 1025 ||
    process.env.EMAIL_HOST_SMTP === "mailpit"
  );
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER_SMTP ||
    "dev@designflix.local"
  );
}

function getForgotRedirectUrl() {
  if (process.env.FRONTEND_URL) {
    return String(process.env.FRONTEND_URL).replace(/\/$/, "");
  }

  const { FORGOT_REDIRECT_URL } = require("./constants/constants");
  if (process.env.NODE_ENV === "production") return FORGOT_REDIRECT_URL.prod_url;
  if (process.env.NODE_ENV === "development") return FORGOT_REDIRECT_URL.dev_url;
  return FORGOT_REDIRECT_URL.test_url;
}

function createMailTransport() {
  const port = Number(process.env.EMAIL_PORT_SMTP) || 465;
  const host = process.env.EMAIL_HOST_SMTP || "localhost";

  if (isMailpitMode()) {
    const configuredHost = process.env.EMAIL_HOST_SMTP || "localhost";
    const host =
      process.platform === "win32" && configuredHost !== "localhost"
        ? "localhost"
        : configuredHost === "mailpit"
          ? "localhost"
          : configuredHost;

    return nodemailer.createTransport({
      host,
      port: port === 465 ? 1025 : port,
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  const insecureTls =
    process.env.EMAIL_TLS_INSECURE === "true" ||
    process.env.NODE_ENV === "development";

  const transport = {
    host,
    port,
    secure: port === 465,
    tls: insecureTls ? { rejectUnauthorized: false } : undefined,
  };

  if (process.env.EMAIL_USER_SMTP) {
    transport.auth = {
      user: process.env.EMAIL_USER_SMTP,
      pass: process.env.EMAIL_PASS_SMTP,
    };
  }

  return nodemailer.createTransport(transport);
}

function probeSmtpPort(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const finish = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => finish(true));
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
  });
}

async function waitForMailpitSmtp(host = "127.0.0.1", port = 1025, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    if (await probeSmtpPort(host, port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

/** Em dev: sobe o container se parou e aguarda SMTP ficar acessível. */
async function ensureMailpitReady() {
  if (!isMailpitMode() || process.env.NODE_ENV !== "development") return;

  const smtpPort = Number(process.env.EMAIL_PORT_SMTP) || 1025;

  if (await probeSmtpPort("127.0.0.1", smtpPort)) return;

  const mailpit = require(path.resolve(__dirname, "../../scripts/mailpit"));
  console.log("[Email] Mailpit indisponível — tentando subir container...");
  mailpit.ensureRunning({ silent: true });

  const ready = await waitForMailpitSmtp("127.0.0.1", smtpPort);
  if (!ready) {
    throw new Error(
      `Mailpit SMTP indisponível em localhost:${smtpPort}. Rode: yarn mailpit:up`
    );
  }
}

module.exports = {
  createMailTransport,
  getEmailFrom,
  getForgotRedirectUrl,
  isMailpitMode,
  ensureMailpitReady,
};
