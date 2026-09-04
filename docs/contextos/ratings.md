# Contexto: Avaliações (estrelas) de arquivo

Nota de 1 a 5 estrelas por usuário no detalhe do arquivo (`/download/:id`).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/ratings.controller.js` |
| Service | `src/services/ratings.service.js` |
| Model | `src/models/user_file_ratings.js` |
| Migration | `migrations/20260904194500-user-file-ratings.js` |
| Respostas | `src/utils/httpResponse.js` |
| Detalhe catálogo | `GET /catalog/:id` inclui `average_rating` + `ratings_count` |

**Última revisão:** set/2026

---

## Status codes

| Status | Quando |
|--------|--------|
| **200** | Sucesso (inclui “ainda não avaliou”) |
| **400** | `score` fora de 1–5 / ids inválidos |
| **404** | Arquivo inexistente no upsert |
| **500** | Erro interno |

---

## Auth

Bearer JWT perfil **user** nas rotas `/user/ratings*`.  
`user_id` vem do token (`req.params.userId`) — **não** confiar em `user_id` do body.

---

## Rotas

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/user/ratings` | user | Upsert da nota |
| GET | `/user/ratings/main_grid/:user_main_grid_id` | user | Nota do usuário + média |

### `POST /user/ratings`

Body:

```json
{ "user_main_grid_id": 16, "score": 5 }
```

```json
{
  "success": true,
  "message": "Avaliação registrada",
  "data": {
    "id": 1,
    "user_id": 3,
    "user_main_grid_id": 16,
    "score": 5,
    "average_rating": 4.9,
    "ratings_count": 12
  }
}
```

### `GET /user/ratings/main_grid/:id`

```json
{
  "success": true,
  "message": "Sem avaliação do usuário",
  "data": {
    "my_rating": null,
    "average_rating": 4.9,
    "ratings_count": 12
  }
}
```

### Detalhe público

`GET /catalog/:id` → `data.average_rating` (0–5, 1 casa) e `data.ratings_count`.

---

## Front

`designflix-next-new/features/download/ratingApi.ts` + `StarRating` em `components/download/`.
