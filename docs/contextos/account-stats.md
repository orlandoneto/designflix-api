# Contexto: Estatísticas da conta (dash perfil)

Contadores do painel **Meu Perfil** (`/profile`): Downloads e Salvos.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/account-stats.controller.js` |
| Service | `src/services/account-stats.service.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — envelope `{ success, message, data }`, status 200/400/500.

---

## Auth

Bearer JWT perfil **user**. Conta sempre do token (`req.params.userId`).

## Rota

| Método | Rota | Notas |
|--------|------|--------|
| GET | `/user/account/stats` | `{ downloads, saved }` |

| Status | Quando |
|--------|--------|
| **200** | Sempre (zeros se vazio) |
| **400** | JWT sem userId |
| **500** | erro interno |

```json
{
  "success": true,
  "message": "Estatísticas da conta",
  "data": { "downloads": 5, "saved": 2 }
}
```

| Campo | Origem |
|-------|--------|
| `downloads` | Soma de `user_downloads.total_downloads` do usuário |
| `saved` | `COUNT` em `user_favorites` do usuário |

**Plano / Status / Membro desde** vêm do payload do usuário e do plano no front (não deste endpoint).

## Front

`designflix-next-new/features/profile/accountStatsApi.ts` → `views/Profile`.

Espelho: `designflix-next-new/docs/integrado/account-stats.md`
