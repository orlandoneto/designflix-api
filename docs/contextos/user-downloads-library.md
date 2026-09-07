# Contexto: Downloads do usuário (biblioteca)

Histórico de downloads do cliente — aba **↓ Downloads** no `/profile`.  
**Só acumula** (não há “desmarcar”).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/user-downloads.controller.js` |
| Service | `src/services/user-downloads.services.js` |
| Mapper grid | `src/services/library/map-library-grid-item.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — `GET /user/downloads/:user_id` envelope + item do grid.

---

## Auth

Bearer JWT perfil **user**. Só a própria conta (`user_id` = JWT).

## Rota (biblioteca)

| Método | Rota | Notas |
|--------|------|--------|
| GET | `/user/downloads/:user_id` | lista enriquecida; 400 se outro usuário |

```json
{
  "success": true,
  "message": "Downloads listados",
  "data": [
    {
      "id": 3,
      "user_main_grid_id": 16,
      "total_downloads": 2,
      "updatedAt": "2026-01-02T00:00:00.000Z",
      "item": {
        "id": 16,
        "name": "Pack",
        "format": "PSD",
        "availability": "free",
        "url_thumb": "…",
        "url_cover": null,
        "url": null,
        "count_download": 10
      }
    }
  ],
  "meta": { "count": 1 }
}
```

| Status | Quando |
|--------|--------|
| **200** | Lista (pode ser vazia) |
| **400** | ids inválidos / outro usuário |
| **500** | erro interno |

Contador do dash (`downloads` soma) continua em [account-stats.md](./account-stats.md).

## Front

`features/profile/libraryApi.ts` → `fetchDownloadsLibrary(userId)`.
