# Contexto: Favoritos do usuário

Consulta / toggle de favoritos no detalhe do arquivo e **grid Salvos** no `/profile`.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/favorites.controller.js` |
| Service | `src/services/favorites.services.js` |
| Model | `src/models/user_favorites.js` |
| Mapper grid | `src/services/library/map-library-grid-item.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — lista enriquecida com item do grid (`url` limpo redigido).

---

## Auth

Bearer JWT perfil **user**.

## Rotas

| Método | Rota | Notas |
|--------|------|--------|
| GET | `/user/favorites` | lista **só do usuário autenticado** + `item` do grid + `meta.count` |
| POST | `/user/favorites` | body `{ user_id, user_main_grid_id }` — toggle **+1** |
| GET | `/user/favorites/:user_id/main_grid/:user_main_grid_id` | status favorito |
| DELETE | `/user/favorites/:user_id/main_grid/:user_main_grid_id` | remove (idempotente) — toggle **−1** |

### `GET /user/favorites` — biblioteca

```json
{
  "success": true,
  "message": "Favoritos listados",
  "data": [
    {
      "id": 9,
      "user_main_grid_id": 16,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "item": {
        "id": 16,
        "name": "Pack",
        "format": "PSD",
        "availability": "paid",
        "url_thumb": "…",
        "url_cover": null,
        "url": null,
        "count_download": 2
      }
    }
  ],
  "meta": { "count": 1 }
}
```

### `GET .../main_grid/:id` — status

| Status | Quando |
|--------|--------|
| **200** | Sempre (favoritado ou não) |
| **400** | ids inválidos |
| **500** | erro interno |

**Atenção de rota:** `GET /user/:id` no user.controller aceita **somente id numérico** (`/user/:id(\\d+)`), para não engolir `GET /user/favorites`.

## Front

- Status: `UserFavoritesService.getById()` → `boolean`
- Grid perfil: `features/profile/libraryApi.ts` → `fetchSavedLibrary()`
