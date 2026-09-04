# Contexto: Favoritos do usuário

Consulta / toggle de favoritos no detalhe do arquivo (`/download/:id`).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/favorites.controller.js` |
| Service | `src/services/favorites.services.js` |
| Model | `src/models/user_favorites.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — `GET` de status **não** usa 404 quando o item não está favoritado.

---

## Auth

Bearer JWT perfil **user**.

## Rotas

| Método | Rota | Notas |
|--------|------|--------|
| GET | `/user/favorites` | lista |
| POST | `/user/favorites` | body `{ user_id, user_main_grid_id }` |
| GET | `/user/favorites/:user_id/main_grid/:user_main_grid_id` | status favorito |
| DELETE | `/user/favorites/:user_id/main_grid/:user_main_grid_id` | remove (idempotente) |

### `GET .../main_grid/:id` — status

| Status | Quando |
|--------|--------|
| **200** | Sempre (favoritado ou não) |
| **400** | ids inválidos |
| **500** | erro interno |

```json
{
  "success": true,
  "message": "Item não favoritado",
  "data": { "favorited": false, "favorite": null }
}
```

```json
{
  "success": true,
  "message": "Item favoritado",
  "data": {
    "favorited": true,
    "favorite": { "id": 9, "user_id": 1, "user_main_grid_id": 16 }
  }
}
```

## Front

`designflix-next-new/services/UserFavoritesService.ts` → `isFavorited()` / `getById()` retorna `boolean`.
