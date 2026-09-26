# Contexto: Auth admin (painel)

Login do staff em `designflix-admin` via JWT RS256 (perfil `admin` / `super_admin`).

| Peça | Onde |
|------|------|
| Rotas | `src/controller/admin.controller.js` |
| Regras | `src/services/admin.service.js` |
| Guard | `src/middleware/authentication.js` (`AuthenticateRoute([...])`) |
| Tabela | `admin` — migrations `20240905134100-create-admin.js` + `20260926130000-admin-password-reset-token.js` |
| Seed padrão | `seeders/20260925180000-seed-default-admins.js` (exige `ADMIN_SEED_PASSWORD`) |
| E-mail de reset | `src/views/adminResetPassword.hbs` (via `sendEmail` → `mailTransport`, remetente `EMAIL_FROM`) |
| Front | `designflix-admin`: `/login`, `/forgot-password`, `/reset-password?token=…` |

**Última revisão:** 2026-09-26 (API 1.1.0) — `POST /admin` só super_admin; recuperação de senha com token de uso único. Ver [pentest](../pentest/2026-09-26-admin-sem-autenticacao.md).

---

## Guard (`AuthenticateRoute`)

| Situação | Status |
|----------|--------|
| Sem header `Authorization` / token inválido, expirado ou de outra chave | **401** |
| Token válido, perfil permitido, mas a conta não existe mais (ou deixou de ser super_admin) | **401** |
| Token válido, mas o perfil (`userType`) **não** está entre os permitidos na rota | **403** |

---

## `POST /admin/authenticate`

Body: `{ "email", "password" }`

| Status | Quando |
|--------|--------|
| **200** | Credencial ok → `{ data, token }` (envelope legado; `data` sem senha nem campos de reset) |
| **401** | `"E-mail ou senha incorretos"` — mesma resposta para e-mail inexistente e senha errada |
| **500** | Erro interno |

`data.userType` = `"admin"` ou `"super_admin"` conforme coluna `super_admin`. Token vale 14 dias.

## `POST /admin` — criar administrador

Header `Authorization: Bearer <token super_admin>`. Body: `{ "name", "email", "password" }` (senha ≥ 8).
A conta criada é **sempre admin comum** (`super_admin` do body é ignorado).

| Status | Quando |
|--------|--------|
| **200** | `{ success, message, data }` (sem senha) |
| **400** | Campo faltando, senha curta ou e-mail já cadastrado |
| **401** | Sem token / token inválido |
| **403** | Token de `admin` comum ou de usuário do site |

O painel `designflix-admin` ainda não tem tela de criar admin; quando tiver, basta mandar o token de sessão (o `apiRequest` já envia).

## Recuperação de senha

Fluxo: `/forgot-password` (admin) → `POST /admin/reset-password` → e-mail com `https://admin.ongraph.com.br/reset-password?token=<64 hex>` → a tela chama `/validate` e depois `/confirm`.

| Regra | Valor |
|-------|-------|
| Token | 32 bytes aleatórios (`crypto.randomBytes`) em hex; **só o SHA-256** fica no banco (`admin.reset_token_hash`) |
| Validade | 30 minutos (`reset_token_expires_at`) |
| Uso | Único: o `confirm` troca a senha e zera o token no **mesmo** `UPDATE … WHERE id AND reset_token_hash` |
| Novo pedido | Gera outro token (o anterior deixa de valer) |
| Anti-spam | 1 pedido por conta a cada 60 s (`reset_requested_at`; vale entre os workers do PM2). Não há rate limiter HTTP no projeto |
| Senha | 8 a 128 caracteres, `password === confirmPassword`, gravada com bcrypt |
| Base do link | `ADMIN_PANEL_URL` (default produção `https://admin.ongraph.com.br`, dev `http://localhost:3002`) |

### `POST /admin/reset-password` (pedido)

Body: `{ "email" }`. Sem autenticação.

| Status | Quando |
|--------|--------|
| **200** | **Sempre a mesma** mensagem genérica, exista ou não a conta (o e-mail é enviado fora do caminho da resposta) |
| **400** | E-mail não informado |
| **500** | Falha de banco |

A senha atual **não** muda no pedido (antes mudava — era o bug).

### `POST /admin/reset-password/validate`

Body: `{ "token" }` → **200** `{ data: { valid: true, email: "or***@gmail.com" } }` ou **400** "Link inválido ou expirado…".

### `POST /admin/reset-password/confirm`

Body: `{ "token", "password", "confirmPassword" }`

| Status | Quando |
|--------|--------|
| **200** | Senha trocada, token invalidado |
| **400** | Validação da senha, token inválido/expirado/já usado |
| **500** | Erro interno |

Sessões (JWT) já emitidas continuam válidas até expirar (14 dias) — não há revogação de token no projeto.

---

## Seed de produção (bootstrap)

Dois super_admins: `orlandoneto23@gmail.com` e `publicidadeaf2022@gmail.com`.

**Não existe senha padrão no código** (o repo é público). O seed exige `ADMIN_SEED_PASSWORD` (≥ 12 caracteres) no ambiente e **sobrescreve** a senha dessas contas — use só para bootstrap/recuperação de emergência:

```bash
# local
ADMIN_SEED_PASSWORD='<senha forte>' npm run seed:admins

# VM / produção (após a migration create-admin)
ADMIN_SEED_PASSWORD='<senha forte>' npm run seed:admins:production
```

No dia a dia, cada admin troca a própria senha pelo "Esqueci minha senha" do painel.

> Até 2026-09-26 o seed tinha uma senha padrão escrita no código e neste doc. Ela está no histórico do Git e é considerada **vazada** — ver [pentest](../pentest/2026-09-26-admin-sem-autenticacao.md).
