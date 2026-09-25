# Contexto: Auth admin (painel)

Login do staff em `designflix-admin` via JWT RS256 (perfil `admin` / `super_admin`).

| Peça | Onde |
|------|------|
| Login | `POST /admin/authenticate` — `src/services/admin.service.js` |
| Tabela | `admin` — migration `20240905134100-create-admin.js` |
| Seed padrão | `seeders/20260925180000-seed-default-admins.js` |
| Contas | `src/services/admin/default-admins.js` |

**Última revisão:** set/2026 — seed de produção com 2 super_admins.

---

## `POST /admin/authenticate`

Body: `{ "email", "password" }`

| Status | Quando |
|--------|--------|
| **200** | Credencial ok → `{ data, token }` |
| **401** | E-mail inexistente ou senha errada |
| **500** | Erro interno |

`data.userType` = `"admin"` ou `"super_admin"` conforme coluna `super_admin`.

---

## Seed de produção (acessos padrão)

Dois super_admins bootstrap (idempotente — re-rodar atualiza senha):

| E-mail | Senha padrão |
|--------|----------------|
| `orlandoneto23@gmail.com` | `@Americadosul23` |
| `publicidadeaf2022@gmail.com` | `@Americadosul23` |

```bash
# local
npm run seed:admins

# VM / produção (após migrate criar a tabela admin)
npm run seed:admins:production
```

Override opcional: `ADMIN_SEED_PASSWORD` no `.env` (substitui a senha do seed).

Pré-requisito: migration `create-admin` aplicada (`npm run migrate:production`).

---

## Front

`designflix-admin` → tela de login → `POST /admin/authenticate`.
