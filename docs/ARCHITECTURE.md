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

### Storage (local | S3 | R2 via env)

Destino dos bytes escolhido por `STORAGE_TYPE` / `STORAGE_DRIVER`. Helper canônico: `src/utils/objectStorage.js` (S3 e R2 residem juntos).

| Var | Valor | Quem roda |
|-----|-------|-----------|
| `STORAGE_TYPE` / `STORAGE_DRIVER` | `local` | Cópias: `unified-upload.local.service`, `upload.local.controller`, disco `/uploads` |
| `STORAGE_TYPE` / `STORAGE_DRIVER` | `s3` (ou omitido se não local) | AWS S3 via `objectStorage` |
| `STORAGE_TYPE` / `STORAGE_DRIVER` | `r2` | Cloudflare R2 (S3-compatible) via `objectStorage` |
| `LOCAL_STORAGE_PUBLIC_URL` | opcional | Base das URLs locais |
| `R2_ACCOUNT_ID` / `R2_ENDPOINT` | R2 | Endpoint da API |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 | Credenciais (fallback: `AWS_*`) |
| `R2_BUCKET_NAME` | R2 | Bucket (fallback: `AWS_BUCKET_NAME`) |
| `R2_PUBLIC_URL` | R2 | CDN / r2.dev (URLs públicas no banco) |
| *(vazio)* | R2 | Fallback automático: `GET /storage/<key>` (proxy da API) |
| `STORAGE_TLS_INSECURE=true` | R2/S3 | Dev Windows: ignora falha de certificado SSL |
| `R2_REGION` | R2 | default `auto` (não usar `AWS_REGION` no R2) |

Factory: `src/services/unified-upload.factory.js` + `src/utils/isLocalUploadMode.js` + `src/utils/objectStorage.js`.  
Regras de ZIP/preview/watermark/grid são as mesmas; muda só o destino dos bytes.
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
- Home / Explorer: [home-publico.md](./contextos/home-publico.md)
- Catálogo HTTP: [catalog.md](./contextos/catalog.md)
- Colaborador / conta (`/me`, candidatura): [colaborador.md](./contextos/colaborador.md)

Pagamento (Stripe, MP, planos, saldo, Pix, saque) permanece legado até a última leva.
