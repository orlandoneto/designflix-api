# Scripts da API — guia de uso

Comandos npm/yarn do `designflix-api` e o que cada um faz.  
Rode sempre na pasta do repo: `C:\projetos\designflix-api`.

```bash
cd C:\projetos\designflix-api
npm run <comando>
# ou
yarn <comando>
```

Quando o comando precisa de argumentos extras, use `--` depois do nome do script:

```bash
npm run asaas:webhook -- PAYMENT_CONFIRMED --user=2 --plan=10
```

Contratos de negócio (planos, webhook, etc.): [docs/contextos/](./contextos/README.md).

---

## Dev local

| Comando | O quê |
|---|---|
| `npm run dev` | Mailpit (Docker) + túnel ngrok + sync `.env` + API (nodemon). Alias: `dev:local`. |
| `npm run dev:api` | Só a API (sem Mailpit/ngrok). |
| `DEV_SKIP_NGROK=true npm run dev` | Igual ao `dev`, sem tentar subir o túnel. |

Falha do ngrok **não** derruba o `dev` — a API sobe mesmo assim. Ctrl+C encerra o que o script iniciou.

### Mailpit (e-mail em dev)

| Comando | O quê |
|---|---|
| `npm run mailpit:up` | Sobe o container (SMTP `localhost:1025`, UI [http://localhost:8025](http://localhost:8025)). |
| `npm run mailpit:down` | Para o container. |
| `npm run mailpit:status` | Mostra se está rodando. |

Precisa de Docker. O `npm run dev` já chama o `up` automaticamente.

### Ngrok (webhook Asaas → API local)

| Comando | O quê |
|---|---|
| `npm run ngrok:up` | Abre túnel para `NODE_PORT` (default 3000) e grava `ASAAS_WEBHOOK_DEV_URL`. |
| `npm run ngrok:down` | Encerra o agente. |
| `npm run ngrok:status` | Mostra URL do túnel e do webhook. |

Com `ASAAS_WEBHOOK_DEV_DOMAIN` no `.env`, a URL fica fixa (cadastre uma vez no painel Asaas). Sem domínio, a URL muda a cada boot. Cadastre no Asaas: `https://<host>/asaas/webhook` + token = `ASAAS_WEBHOOK_TOKEN`.

---

## Asaas / planos / pagamentos

| Comando | O quê |
|---|---|
| `npm run asaas:check` | Smoke read-only: ambiente, chave, saldo, clientes (só GET). |
| `npm run asaas:webhook -- <EVENTO> --user=<id> --plan=<id>` | Simula POST do Asaas na API local. |
| `npm run plans:clear-payment -- user@email.com` | Dry-run: lista plano/assinatura/limites do usuário. |
| `npm run plans:clear-payment -- user@email.com --apply` | Apaga esses registros **no banco local**. |

### Simular webhook

```bash
# API precisa estar no ar
npm run asaas:webhook -- PAYMENT_CONFIRMED --user=2 --plan=10
npm run asaas:webhook -- PAYMENT_OVERDUE --user=2 --plan=10
```

- Exige `ASAAS_WEBHOOK_TOKEN` no `.env`.
- `--user` e `--plan` são ids reais do banco (`externalReference`).
- Opcionais: `--port=`, `--event-id=`, `--payment-id=`, `--subscription-id=`, `--value=`, `--invoice-url=`.
- **Não** substitui o sandbox Asaas: o payload é nosso; prova roteamento, idempotência e e-mails.

### Limpar pagamento de um usuário (dev/sandbox)

```bash
npm run plans:clear-payment -- arlino@email.com          # só lista
npm run plans:clear-payment -- arlino@email.com --apply  # apaga
```

Remove, se existirem: `asaas_webhook_events` → `asaas_subscriptions` → `user_plans` → `plans_download_limits`.  
**Não** apaga a conta em `user`. **Não** cancela assinatura no painel Asaas/Stripe. Detalhes em [contextos/plans.md](./contextos/plans.md).

---

## Catálogo / Meilisearch

| Comando | O quê |
|---|---|
| `npm run meili:up` | Container Meilisearch (`localhost:7700`). |
| `npm run meili:down` | Para o container. |
| `npm run meili:status` | Status. |
| `npm run catalog:reindex` | Reindex full MySQL → Meilisearch. |

Docker necessário para Meili. Rode `meili:up` antes do `catalog:reindex`.

---

## Banco / migrate / env

| Comando | O quê |
|---|---|
| `npm run migrate` | Migra em development (`setEnv` + sequelize-cli). Alias: `migrate:development`. |
| `npm run migrate:production` | Migra com env de production. |
| `npm run seed:admins` | Cria/atualiza os 2 admins padrão (dev). Ver [admin-auth.md](./contextos/admin-auth.md). |
| `npm run seed:admins:production` | Idem com env production (VM). |
| `npm run db:setup` | **Destrutivo:** DROP/CREATE do DB local → sync models → marca migrations. |

Helper interno (também usado pelos comandos acima):

```bash
node scripts/setEnv.js development   # copia .env.development → .env
node scripts/setEnv.js production
node scripts/setEnv.js test
```

`db:setup` é só para ambiente local. Não use em produção.

---

## Testes

| Comando | O quê |
|---|---|
| `npm test` | Jest (`NODE_ENV=test`) — comando canônico. |
| `npm run test:watch` | Jest em watch. |
| `npm run test:server` | Sobe a API com env `test` (manual; **não** substitui `npm test`). |

CI no GitHub: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `npm ci` + `npm test` em push/PR na `main`. Não faz deploy nem usa secrets (VM: `npm run deploy:oracle`).

---

## Build / deploy

| Comando | O quê |
|---|---|
| `npm start` | Produção: setEnv + `node src/main.js`. |
| `npm run build` | Babel `src` → `dist` + copia `private.key`. |
| `npm run build-stg` | setEnv development + Babel + minify. |
| `npm run build-prd` | setEnv production + Babel + minify. |
| `npm run minify` | Uglify dos `.js` em `dist/` (precisa do build antes). |
| `npm run copy-keys` | Copia `private.key` para `dist/middleware/`. |
| `npm run deploy:oracle` | **Deploy de produção** (VM Oracle): código commitado (`git archive`) + `.env.production` local → VM, `pm2 reload`. `npm run deploy:oracle -- -DryRun` só confere. Ver [deploy-oracle.md](./deploy-oracle.md). |
| `npm run deploy-stg` | **Legado** (VPS antigo `46.202.146.92`) — PM2 deploy staging. Não usar. |
| `npm run deploy-prd` | **Legado** (VPS antigo `46.202.146.92`) — PM2 deploy production. Não usar. |
| `npm run deploy` | **Legado** — staging + production do VPS antigo. |

---

## Scripts sem entrada npm (uso direto)

| Arquivo | Uso |
|---|---|
| `scripts/testBotDetection.js` | `node scripts/testBotDetection.js` — simula User-Agents no middleware de bots. |
| `scripts/generatePrerenderedHTML.js` | `node scripts/generatePrerenderedHTML.js` — HTML estático SEO em `public/prerendered`. |

Helpers só compostos por outros comandos: `setEnv.js`, `setupLocalDb.js`, `syncModels.js`, `markMigrations.js`, `minify.js`.

---

## Fluxos rápidos

### Dia a dia (API + e-mail + webhook)

```bash
npm run dev
# Inbox: http://localhost:8025
# Webhook: URL impressa no boot → cadastrar no Asaas
```

### Testar liberação de plano sem Asaas real

```bash
npm run dev:api
# em outro terminal:
npm run asaas:webhook -- PAYMENT_CONFIRMED --user=<id> --plan=<id>
```

### Resetar assinatura de um usuário de teste

```bash
npm run plans:clear-payment -- user@email.com
npm run plans:clear-payment -- user@email.com --apply
```

### Explorer com busca Meili

```bash
npm run meili:up
npm run catalog:reindex
npm run dev
```

---

## Oracle Cloud (VM)

| Arquivo | Uso |
|---|---|
| `scripts/oci-bootstrap.sh` | Na VM (opc): Node/MySQL/Nginx/PM2 após a instância existir. |
| `scripts/deploy-oracle.ps1` | No PC (PowerShell): deploy para a VM — `npm run deploy:oracle`. |

Docs: [oci-vm-setup.md](./oci-vm-setup.md), [oci-ssh-access.md](./oci-ssh-access.md), [deploy-oracle.md](./deploy-oracle.md), [email-smtp-brevo.md](./email-smtp-brevo.md).

---

## Onde está o quê

| Tema | Doc / código |
|---|---|
| Planos + Asaas + webhook | [contextos/plans.md](./contextos/plans.md) |
| Limite diário de download | [contextos/download-daily-limit.md](./contextos/download-daily-limit.md) |
| Scripts neste guia | `package.json` → `scripts/` |
| Mapa do repo | [AGENTS.md](../AGENTS.md) |
