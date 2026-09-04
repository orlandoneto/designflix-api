# Contexto: Usuários (admin)

Listagem de contas públicas para o painel `designflix-admin`.  
Papéis **não são exclusivos**: todo usuário é **cliente** (`customer`); pode ser também **colaborador** (`contributor`).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/user.controller.js` → `GET /admin/users` |
| Service | `src/services/user.service.js` (`getAll`) |
| Mapper | `src/services/user/admin-user-list.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — envelope `{ success, message, data, meta }`, status 200/400/500.

---

## Papéis

| Flag | Significado |
|------|-------------|
| `roles.customer` | Sempre `true` — usuário comum da plataforma |
| `roles.contributor` | `true` quando `contributorStatus === active` |

---

## `GET /admin/users`

Auth: **admin** / **super_admin**.

Query:

| Param | Valores | Default |
|-------|---------|---------|
| `role` | `all` \| `contributor` \| `customer_only` | `all` |
| `q` | busca em nome, e-mail, username | — |

### Respostas

| Status | `message` |
|--------|-----------|
| **200** | `Usuários listados` |
| **400** | `role` inválido |
| **500** | `Erro ao listar usuários` |

```json
{
  "success": true,
  "message": "Usuários listados",
  "data": [
    {
      "id": 2,
      "name": "Jose",
      "email": "jose@email.com",
      "photo": null,
      "username": "jose",
      "phone": null,
      "contributor": 1,
      "contributorStatus": "active",
      "roles": { "customer": true, "contributor": true },
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "role": "all", "q": null }
}
```

---

## Front

- Admin UI: `designflix-admin` → `/users`
- Client: `designflix-admin/src/features/users/api.ts`
