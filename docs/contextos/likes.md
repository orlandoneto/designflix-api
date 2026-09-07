# Contexto: Curtidas (like)

**Curtir** no detalhe do arquivo — domínio **separado** de favoritos (**Salvar**).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/likes.controller.js` |
| Service | `src/services/likes.services.js` |
| Model | `src/models/user_likes.js` |
| Migration | `migrations/20260907120000-user-likes.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — envelope `{ success, message, data }`, status 200/400/500.

---

## Auth

Bearer JWT perfil **user**.

## Rotas

| Método | Rota | Notas |
|--------|------|--------|
| POST | `/user/likes` | body `{ user_id, user_main_grid_id }` — idempotente se já curtido |
| GET | `/user/likes/:user_id/main_grid/:user_main_grid_id` | status `liked` |
| DELETE | `/user/likes/:user_id/main_grid/:user_main_grid_id` | remove (idempotente) |

### Status GET

| Status | Quando |
|--------|--------|
| **200** | Sempre (`liked` true\|false) |
| **400** | ids inválidos |
| **500** | erro interno |

```json
{ "success": true, "message": "Item não curtido", "data": { "liked": false, "like": null } }
```

## UI

| Botão | API |
|-------|-----|
| **Curtir** | `/user/likes` |
| **Salvar** | `/user/favorites` |

Front: `designflix-next-new/features/download/likesApi.ts` + `UserFavoritesService`.

Espelho: `designflix-next-new/docs/integrado/likes.md`
