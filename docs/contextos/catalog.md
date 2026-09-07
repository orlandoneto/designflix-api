# Contexto: Catálogo público (`/catalog`)

Contrato HTTP canônico de listagem/busca/detalhe.  
Fluxo de produto (home → explorer → detalhe): **[home-publico.md](./home-publico.md)**.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/catalog.controller.js` |
| Service | `src/services/catalog/catalog.service.js` |
| Respostas HTTP | `src/utils/httpResponse.js` |
| MySQL provider | `src/services/catalog/mysql-search-provider.js` |
| Meili provider | `src/services/catalog/meilisearch-search-provider.js` |
| Client Meili | `src/services/catalog/meili-client.js` (axios) |
| Sync | `src/services/catalog/catalog-sync.js` |

**Última revisão:** set/2026 — envelope alinhado ao auth (`success` + `message` + `data`).

---

## Status codes

| Status | Quando |
|--------|--------|
| **200** | Sucesso (`message` + `data` / `pagination` / `meta`) |
| **400** | `page`/`limit`/`id` inválidos |
| **404** | Item inexistente em `/catalog/:id` |
| **410** | Rotas legadas `/user-main-grid/flter|detail|categories/filter` |
| **500** | Erro interno (mensagem genérica, sem stack) |

---

## Stack

| Serviço | Papel |
|---------|--------|
| MySQL | Fonte da verdade |
| Redis | Cache search/facets |
| Meilisearch | Busca rápida (`auto` / fallback MySQL) |
| API Node | Orquestra |

---

## Rotas

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/catalog/search` | público | Lista + filtros + paginação |
| GET | `/catalog/facets` | público | Contagens |
| GET | `/catalog/:id/similar` | público | Recursos semelhantes (score multi-sinal) |
| GET | `/catalog/:id` | público | Detalhe |

### Query — `/catalog/search`

| Param | Tipo | Notas |
|-------|------|--------|
| `q` | string | texto (`searchTerm` também aceito) |
| `format` | string | ex. `PSD` |
| `categoryId` | number | |
| `category` | string | slug |
| `availability` | `free` \| `paid` | |
| `sort` | `relevance` \| `downloads` \| `recent` | |
| `page` / `limit` | number | limit max 100 |

### Envelope search

```json
{
  "success": true,
  "message": "Busca realizada com sucesso",
  "data": [
    {
      "id": 1,
      "name": "...",
      "format": "PSD",
      "availability": "paid",
      "url_thumb": "...",
      "url_cover": "...",
      "count_download": 10,
      "width": 1920,
      "height": 1080,
      "file_size": 2048000,
      "categories": [{ "id": 1, "name": "Academia", "slug": "academia" }]
    }
  ],
  "pagination": { "page": 1, "limit": 40, "total": 0, "totalPages": 0 },
  "meta": { "provider": "meilisearch" }
}
```

### Facets

```json
{
  "success": true,
  "message": "Facetas carregadas com sucesso",
  "data": {
    "formats": [{ "value": "PSD", "count": 18 }],
    "availability": [{ "value": "free", "count": 5 }, { "value": "paid", "count": 33 }],
    "categories": [{ "id": 1, "slug": "academia", "name": "...", "count": 12 }]
  }
}
```

### Detalhe `/catalog/:id`

```json
{
  "success": true,
  "message": "Arquivo encontrado",
  "data": {
    "id": 1,
    "name": "...",
    "countFiles": 12,
    "average_rating": 4.9,
    "ratings_count": 12,
    "user": {
      "id": 3,
      "name": "...",
      "photo": "...",
      "total_uploads": 12
    }
  }
}
```

`average_rating` é 0 quando não há notas; `ratings_count` é a quantidade de avaliações. Ver [ratings.md](./ratings.md).  
`countFiles` / `user.total_uploads` = quantidade de itens do colaborador em `user_main_grid` (`activite = 0`).

### Semelhantes `/catalog/:id/similar`

Ranking estilo stock profissional (não é “mesma categoria só”):

| Sinal | Peso |
|-------|------|
| Categorias em comum | alto |
| Tags em comum (sem dumps WhatsApp) | alto |
| Mesmo formato | médio |
| Tokens do nome / terms | médio |
| Popularidade (downloads) | leve |

Também diversifica para evitar grade de quase-duplicatas.

Query: `limit` (default 12, max 40).

```json
{
  "success": true,
  "message": "Recursos semelhantes encontrados",
  "data": [{ "id": 2, "name": "...", "format": "PSD", "categories": [] }],
  "meta": { "provider": "mysql", "strategy": "multi-signal", "sourceId": 14, "candidates": 40 }
}
```

| Status | Quando |
|--------|--------|
| **200** | Lista (pode ser vazia) |
| **400** | `id` ou `limit` inválido |
| **404** | Item origem inexistente |
| **500** | Erro interno |

Erros:

```json
{ "success": false, "message": "ID inválido" }
{ "success": false, "message": "Arquivo não encontrado" }
{ "success": false, "message": "Erro ao buscar detalhe" }
```

---

## Removido

Não existem mais:

- `GET /user-main-grid/flter`
- `GET /user-main-grid/detail/:id`
- `GET /user-main-grid/categories/filter`

Use sempre `/catalog/*`.

---

## Env / scripts

```
CATALOG_SEARCH_PROVIDER=auto
MEILI_HOST=http://127.0.0.1:7700
MEILI_MASTER_KEY=masterKey
MEILI_INDEX=catalog_items
```

```
npm run meili:up
npm run meili:down
npm run catalog:reindex
```
