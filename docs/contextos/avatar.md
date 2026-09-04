# Contexto: Avatar / foto de perfil

Upload e remoção da foto do usuário autenticado.

| Item | Caminho |
|------|---------|
| Controllers | `src/controller/upload.controller.js` (S3/R2), `upload.local.controller.js` (local) |
| Service resposta | `src/services/upload.service.js` |
| Remoção | `DELETE /user/:userId/photo` → `user.service.js` + `middleware/removeAvatar*` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — envelope `{ success, message, data }`, auth Bearer user, status 200/400/500.

---

## Fluxo (front)

```
1. DELETE /user/:userId/photo     → limpa foto anterior (ok se não havia)
2. POST   /upload/avatar/site     → multipart field "file" → data.url
3. PUT    /me                     → { photo: url }  (allowlist em colaborador.md)
```

Não usar `POST /unified-upload/*` para avatar.

---

## 1. `POST /upload/avatar/site`

Auth: **user** (Bearer).

Body: `multipart/form-data` com campo **`file`** (PNG/JPG).

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Avatar enviado` | `{ "url": "https://..." }` |
| **400** | `Nenhum arquivo enviado` / `Arquivo muito grande` / validação multer | — |
| **401** | token inválido/ausente (middleware auth) | — |
| **500** | `Erro ao enviar o avatar` | — |

```json
{
  "success": true,
  "message": "Avatar enviado",
  "data": { "url": "https://cdn.example/profile/….jpg" }
}
```

Storage: `STORAGE_TYPE=local|s3|r2` (ver `docs/ARCHITECTURE.md`).

---

## 2. `DELETE /user/:userId/photo`

Auth: **user**. Remove objeto no storage (best-effort) e zera `user.photo`.

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Foto removida com sucesso` | `{ "photo": null }` |
| **401** | token inválido | — |
| **500** | `Erro ao remover a foto` | — |

---

## Front de referência

- Client: `designflix-next-new/features/profile/avatarApi.ts`
- UI: `components/Forms/UploadProfileForm`
- Integração: `designflix-next-new/docs/integrado/avatar.md`
