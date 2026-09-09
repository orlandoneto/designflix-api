# Arquitetura — Designflix API

Visão curta. Detalhe de domínio: [../contextos/README.md](../contextos/README.md).  
Decisões (“por quê”): [decisions/](./decisions/).

## Stack (MVP)

| Peça | Escolha atual | Nota |
|------|---------------|------|
| API | Express (Node) | Não Nest — MVP enxuto |
| Site | Next.js (`designflix-next-new`) | |
| Admin | Next.js (`designflix-admin`) | |
| DB | MySQL + Sequelize | Fonte da verdade |
| Cache | Redis | search/facets (opcional em dev) |
| Busca | Meilisearch (`auto` → fallback MySQL) | |
| Storage | S3 ou local (`STORAGE_TYPE`) | Signed URL no download |
| Auth | JWT (RS256) | Perfis user / admin |

## Princípios

1. Contrato e regra de negócio documentados em `docs/contextos/`.
2. Envelope HTTP canônico (`httpResponse.js`).
3. Enforço de limite/permissão no **backend**.
4. Custo free/local primeiro; caminho managed documentado nos ADRs.

## Operação do processo

### `GET /health`

`src/controller/health.controller.js`, com o diagnóstico em
`src/utils/healthCheck.js`. Existe porque "o processo subiu" não é "a API
responde": o PM2 considera saudável qualquer worker vivo, mesmo com o MySQL
fora.

| Situação | Status | Corpo |
|---|---|---|
| banco e cache up | 200 | `message: "API saudável"` |
| banco up, Redis fora | 200 | `message: "API operando sem cache"` |
| banco fora | 500 | `message: "Banco de dados indisponível"` |

Redis fora **não** derruba o health: `config/redis.js` é explícito em seguir
sem cache, então tirar a instância do balanceador por isso seria pior. O `meta`
traz o estado de cada dependência para o monitor distinguir os dois casos.

### Fim da pilha HTTP

`src/middleware/errorHandler.js`. Sem ele, rota inexistente e `throw` em rota
async caíam no handler default do Express, que responde HTML e vaza stack fora
de produção. O 404 de GET nasce no `app.get("*")` de `routes/bot-seo.routes.js`,
que delega ao mesmo handler para a API ter um corpo só.

O erro 500 nunca leva `err.message` ao cliente — a mensagem interna fica no
winston.

### Desligamento gracioso

`src/utils/processLifecycle.js`, ligado no fim do `main.js`. `pm2 reload` manda
SIGTERM/SIGINT e espera `kill_timeout` (5s); o dreno fecha o servidor e depois
Sequelize e Redis, com timeout próprio de 4s para sair antes do SIGKILL. Sem
isso, todo deploy cortava upload em andamento, porque os timeouts de request são
altos de propósito (`CONST.SERVER_REQUEST_TIMEOUT_MS`).

`unhandledRejection` é logado; `uncaughtException` loga e dispara o dreno,
porque depois dele o processo está em estado incerto.

### Cluster

Produção roda `exec_mode: "cluster"` com `instances: "max"`, então `main.js`
carrega uma vez por vCPU. Cron só no worker líder — ver `src/cron/cron-leader.js`
e a seção de suspensão em [../contextos/plans.md](../contextos/plans.md).

Requisição é logada **uma** vez: o `morgan` escreve no winston. Havia um segundo
`morgan("dev")` em stdout duplicando todo acesso no `out.log` do PM2.

## Relação com fronts

```
Next (público)  ──►  /catalog, /auth, /signed/url, …
Admin           ──►  /admin/*, contributor, calendar, users
```
