# Arquitetura da API (notas de limpeza)

Contratos HTTP atuais **não mudam** enquanto o Next consome esta API.

## Catalog / Home pública

Contrato de produto: **[docs/contextos/home-publico.md](./contextos/home-publico.md)**  
Contrato HTTP: **[docs/contextos/catalog.md](./contextos/catalog.md)**

```
GET /catalog/search | /catalog/facets | /catalog/:id
```

Removidos (não usar): `/user-main-grid/flter`, `/user-main-grid/detail/:id`, `/user-main-grid/categories/filter`.

Provider: Meilisearch se up (`CATALOG_SEARCH_PROVIDER=auto`), senão MySQL.

## Models

- **Canônico:** `src/models/`
- **Legado (não usar):** pasta `models/` na raiz (stub Sequelize antigo + `commission.js` órfão). Removida/arquivada — não importar.

## Upload

| Endpoint | Uso |
|----------|-----|
| `POST /upload/avatar/site` | Avatar do perfil (canônico para avatar) |
| `POST /unified-upload/*` | Packs/arquivos do grid (canônico para conteúdo) |

Não misturar os dois fluxos. Avatar ≠ unified-upload.

### Storage (S3 vs cópia local via env)

Destino dos bytes: **AWS S3** (não R2). Em dev, o env escolhe uma **cópia** do upload — o serviço S3 original permanece intacto.

| Var | Valor | Quem roda |
|-----|-------|-----------|
| `STORAGE_TYPE` ou `STORAGE_DRIVER` | `local` | Cópias: `unified-upload.local.service`, `upload.local.controller`, `imageProcessor.local`, disco em `/uploads` |
| `STORAGE_TYPE` ou `STORAGE_DRIVER` | `s3` (ou omitido) | Originais S3: `unified-upload.service`, `upload.controller`, `imageProcessor` |
| `LOCAL_STORAGE_PUBLIC_URL` | opcional | Base das URLs locais (default `http://localhost:$NODE_PORT`) |

Factory: `src/services/unified-upload.factory.js` + `src/utils/isLocalUploadMode.js`.
Regras de ZIP/preview/watermark/grid são as do original; a cópia só muda onde grava.
## Admin

Rotas sob `/admin/*` (controller `admin.controller.js`). Separadas do app usuário; o Next novo não precisa expô-las no front público.

## Bot HTML / SEO

Rotas em `src/routes/bot-seo.routes.js` (legado SPA). SEO canônico = Next.js.

- Desligar: `ENABLE_BOT_HTML=false` no `.env`
- Em dev com Next na 3001, pode desligar sem impacto no JSON da API.

## Mocks

`src/mock/` — **não** importar no path de request de produção. Só testes manuais.

## Contextos (contratos por domínio)

Documentação de APIs por contexto de negócio — rotas, status HTTP, payloads e arquivos de código:

→ **[docs/contextos/README.md](./contextos/README.md)**

- Auth público (login, cadastro, OTP, recuperar senha): [auth-publico.md](./contextos/auth-publico.md)
