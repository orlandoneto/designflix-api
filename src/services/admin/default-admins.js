/**
 * Contas admin padrão (bootstrap produção / seed).
 * Senha em texto só no seed — gravada com bcrypt na tabela `admin`.
 */

const DEFAULT_ADMIN_PASSWORD = "@Americadosul23";

const DEFAULT_ADMINS = [
  {
    name: "Orlando Neto",
    email: "orlandoneto23@gmail.com",
    super_admin: true,
  },
  {
    name: "Publicidade AF",
    email: "publicidadeaf2022@gmail.com",
    super_admin: true,
  },
];

function resolveSeedPassword(env = process.env) {
  const fromEnv = env.ADMIN_SEED_PASSWORD;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return DEFAULT_ADMIN_PASSWORD;
}

function listDefaultAdmins() {
  return DEFAULT_ADMINS.map((row) => ({ ...row }));
}

module.exports = {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMINS,
  resolveSeedPassword,
  listDefaultAdmins,
};
