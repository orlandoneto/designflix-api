# Contexto: Home / Explorer público

Feed da home, busca do hero, página Explorar (`/explorar`) e detalhe do arquivo.  
**Sem autenticação Bearer** — rotas abertas.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/catalog.controller.js` |
| Service | `src/services/catalog/catalog.service.js` |
| Respostas HTTP | `src/utils/httpResponse.js` (mesmo envelope do auth) |
| Providers | `src/services/catalog/mysql-search-provider.js`, `meilisearch-search-provider.js` |
| Sync upload → Meili | `src/services/catalog/catalog-sync.js` |
| Front home | `designflix-next-new/components/home/HomePage.tsx` |
| Front explorer | `designflix-next-new/views/BrowseLibrary/index.tsx` |
| Front client | `designflix-next-new/features/catalog/api.ts` |
| Contrato detalhado | [catalog.md](./catalog.md) |

**Última revisão:** set/2026 — envelope `{ success, message, data }`, status 200/400/404/410/500.

---

## Arquitetura

```
Home (/)  ──GET /catalog/search?page=1&limit=20──► API
                 │
Header busca (só /explorar) ──► GET /catalog/search + /catalog/facets
Hero busca (home) ──► /explorar?q=&format= ──GET /catalog/search──►
                 │
Card / detalhe ──► /download/:id ──GET /catalog/:id──►
                 │
Upload ──► MySQL ──sync──► Meilisearch (se up)
```

| Serviço | Papel |
|---------|--------|
| **MySQL** | Fonte da verdade |
| **Redis** | Cache de search/facets |
| **Meilisearch** | Busca rápida (fallback MySQL se down) |
| **API Node** | Orquestra |

Provider: `CATALOG_SEARCH_PROVIDER=auto` (default). Resposta inclui `meta.provider` = `meilisearch` \| `mysql`.

---

## Fluxo (ordem das chamadas)

```
HOME
  GET /catalog/search?page=1&limit=20

EXPLORAR (busca / filtro)
  GET /catalog/search?q=&format=&category=&availability=&sort=&page=&limit=
  GET /catalog/facets?q=&category=&availability=     → contagens das tabs

DETALHE
  GET /catalog/:id

FORMATOS DO SELECT (header)
  GET /user-main-grid/formats                       → lista de formatos (ainda neste path)
```

Navegação front: **nunca** `/searchImage/*` — sempre `/explorar?...` (`lib/exploreRoute.ts`).

---

## 1. `GET /catalog/search`

Lista o grid (home e explorer).

### Query

| Param | Exemplo | Notas |
|-------|---------|--------|
| `q` | `mockup` | texto (aceita `searchTerm`) |
| `format` | `PSD` | |
| `categoryId` | `3` | |
| `category` / niche | `academia` | slug |
| `availability` | `free` \| `paid` | |
| `sort` | `downloads` \| `recent` \| `relevance` | |
| `page` | `1` | |
| `limit` | `20` | max 100 |

### Respostas

| Status | `message` (exemplos) | Corpo |
|--------|----------------------|--------|
| **200** | `Busca realizada com sucesso` | `data: Item[]`, `pagination`, `meta?` |
| **400** | `Parâmetro page inválido` / `Parâmetro limit inválido` | — |
| **500** | `Erro ao buscar catálogo` | — |

Lista vazia continua **200** com `data: []`.

`data[]` (item leve): `id`, `name`, `format`, `availability`, `url_thumb`, `url_cover`, `url`, `count_download`, `categories[]`.

---

## 2. `GET /catalog/facets`

Contagens para tabs/filtros do Explorer.

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Facetas carregadas com sucesso` | `{ formats, availability, categories }` |
| **500** | `Erro ao buscar facetas` | — |

---

## 3. `GET /catalog/:id`

Detalhe público (página `/download/:id`).

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Arquivo encontrado` | item completo (user, tags, categories, urls…) |
| **400** | `ID inválido` | — |
| **404** | `Arquivo não encontrado` | — |
| **500** | `Erro ao buscar detalhe` | — |

---

## Removido (não usar)

| Path antigo | Status | Substituto |
|-------------|--------|------------|
| `GET /user-main-grid/flter` | **410 Gone** | `GET /catalog/search` |
| `GET /user-main-grid/detail/:id` | **410 Gone** | `GET /catalog/:id` |
| `GET /user-main-grid/categories/filter` | **410 Gone** | `GET /catalog/search?categoryId=` |

`/user-main-grid` autenticado (CRUD colaborador, `formats`, `user/:id`, count) **permanece** — não é catálogo público.

---

## Env

```
CATALOG_SEARCH_PROVIDER=auto
MEILI_HOST=http://127.0.0.1:7700
MEILI_MASTER_KEY=masterKey
MEILI_INDEX=catalog_items
```

```
npm run meili:up
npm run catalog:reindex
```

---

## Front de referência

| Tela | Código |
|------|--------|
| Home feed | `HomePage` → `catalogSearch` → `/catalog/search` |
| Busca hero (home) | `HomeSearchBar` → `buildExplorePath` → `/explorar` |
| Busca header | só em `/explorar` |
| Explorer | `BrowseLibrary` + `catalogSearch` / `catalogFacets` |
| Detalhe | `features/download/api` → `/catalog/:id` |
| Galerias legadas | `Search` / `galleryFree` → `catalogSearch` |

Docs front integração: `designflix-next-new/docs/integrado/`.
