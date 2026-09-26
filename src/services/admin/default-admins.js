/**
 * Contas admin padrão (bootstrap produção / seed).
 *
 * A senha NÃO fica no código (o repositório é público): o seed exige
 * `ADMIN_SEED_PASSWORD` no ambiente e grava só o hash bcrypt na tabela `admin`.
 * Depois do bootstrap, cada admin troca a senha pelo fluxo "Esqueci minha senha".
 */

const ADMIN_SEED_PASSWORD_MIN_LENGTH = 12;

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
  const fromEnv = typeof env.ADMIN_SEED_PASSWORD === "string" ? env.ADMIN_SEED_PASSWORD.trim() : "";
  if (!fromEnv) {
    throw new Error(
      "ADMIN_SEED_PASSWORD é obrigatório para rodar o seed de admins (não há senha padrão)."
    );
  }
  if (fromEnv.length < ADMIN_SEED_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `ADMIN_SEED_PASSWORD precisa ter pelo menos ${ADMIN_SEED_PASSWORD_MIN_LENGTH} caracteres.`
    );
  }
  return fromEnv;
}

function listDefaultAdmins() {
  return DEFAULT_ADMINS.map((row) => ({ ...row }));
}

module.exports = {
  ADMIN_SEED_PASSWORD_MIN_LENGTH,
  DEFAULT_ADMINS,
  resolveSeedPassword,
  listDefaultAdmins,
};
