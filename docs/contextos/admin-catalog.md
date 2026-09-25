# Contexto: Catálogo (admin)

Listagem e moderação dos itens do grid (`user_main_grid`) no painel `designflix-admin`.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/admin-catalog.controller.js` |
| Service | `src/services/admin-catalog.service.js` |
| Sync Meili | `src/services/catalog/catalog-sync.js` |
| Storage | `src/utils/objectStorage.js` (`DeleteObjectCommand`) |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — envelope `{ success, message, data, pagination?, meta? }`.

---

## Semântica `activite`

| Valor | Admin UI | Flix (`/catalog/search`) |
|-------|----------|--------------------------|
| `0` / `false` | ativo | **visível** |
| `1` / `true` | desabilitado | **oculto** (arquivos no R2 permanecem) |

---

## Auth

Roles: **admin** / **super_admin**.

---

## `GET /admin/catalog`

Query:

| Param | Valores | Default |
|-------|---------|---------|
| `page` | ≥ 1 | `1` |
| `limit` | 1–100 | `24` |
| `status` | `all` \| `active` \| `disabled` | `all` |
| `q` | busca em nome/formato | — |

### Respostas

| Status | Quando |
|--------|--------|
| **200** | Lista (vazia continua 200) |
| **400** | `status` inválido |
| **500** | Erro interno |

```json
{
  "success": true,
  "message": "Catálogo listado",
  "data": [
    {
      "id": 10,
      "name": "Pack Social",
      "format": "psd",
      "availability": "paid",
      "disabled": false,
      "url_thumb": "https://…",
      "url_cover": "https://…",
      "user_id": 3,
      "contributor": { "id": 3, "name": "Ana", "email": "ana@…" },
      "createdAt": "2026-09-01T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 24, "total": 1, "totalPages": 1 },
  "meta": { "status": "all", "q": null }
}
```

---

## `PATCH /admin/catalog/:id`

Body: `{ "disabled": true | false }`

| Status | Quando |
|--------|--------|
| **200** | Atualizado + Meili sync |
| **400** | Id inválido / body sem `disabled` boolean |
| **404** | Item inexistente |
| **500** | Erro interno |

Desabilitar remove o doc do Meili; habilitar reindexa.

---

## `DELETE /admin/catalog/:id`

Hard delete:

1. Apaga `url_thumb`, `url_cover`, `url` no R2 (se storage configurado)
2. Limpa favorites / likes / downloads / ratings
3. `UserMainGrid.destroy`
4. Remove Meili + limpa cache Redis

| Status | Quando |
|--------|--------|
| **200** | Removido |
| **400** | Id inválido |
| **404** | Item inexistente |
| **500** | Erro interno |

---

## Front

- Admin UI: `designflix-admin` → `/catalog`
- Client: `designflix-admin/src/features/catalog/api.ts`
