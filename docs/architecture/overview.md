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

## Relação com fronts

```
Next (público)  ──►  /catalog, /auth, /signed/url, …
Admin           ──►  /admin/*, contributor, calendar, users
```
