# Contextos da API — índice

Documentação **por domínio de negócio** (um arquivo por contexto).  
Objetivo: qualquer dev ou agente de IA ler um contexto e saber **rotas, códigos HTTP, payloads e onde está o código** — sem vasculhar o repositório.

## Como usar

1. Escolha o contexto abaixo.
2. Siga o contrato de status e envelope descrito em cada doc.
3. Ao criar um **novo** contexto, copie a estrutura de `auth-publico.md`.

## Regra global (contextos públicos padronizados)

| Status | Significado | Uso típico |
|--------|-------------|------------|
| **200** | Sucesso | Toda operação OK (inclui lista vazia) |
| **400** | Erro do cliente | Validação, credencial, parâmetro inválido |
| **404** | Não encontrado | Recurso por id (ex.: `/catalog/:id`) |
| **410** | Removido | Endpoint legado descontinuado |
| **500** | Erro interno | Falha inesperada no servidor |

Auth público usa **200 / 400 / 500**. Catálogo/home também usa **404 / 410** quando aplicável.

Envelope JSON:

```json
// 200
{ "success": true, "message": "opcional", "data": { }, "pagination": {}, "meta": {} }

// 400 / 404 / 410 / 500
{ "success": false, "message": "descrição legível" }
```

Helper canônico: `src/utils/httpResponse.js`  
Alias legado de auth: `src/utils/authHttpResponse.js` (reexporta o mesmo helper).

---

## Contextos documentados

| Contexto | Arquivo | Código |
|----------|---------|--------|
| **Auth público** (login, cadastro, OTP, recuperar/redefinir senha) | [auth-publico.md](./auth-publico.md) | `src/controller/auth-public.controller.js`, `src/services/auth-public.service.js` |
| **Home / Explorer público** (feed, busca, explorar, detalhe) | [home-publico.md](./home-publico.md) | `src/controller/catalog.controller.js`, `src/services/catalog/` |
| **Catálogo HTTP** (contrato `/catalog/*`) | [catalog.md](./catalog.md) | idem |
| **Colaborador / conta** (candidatura, `/me`, aprovação) | [colaborador.md](./colaborador.md) | `src/controller/contributor.controller.js`, `src/services/contributor.service.js` |
| **Avatar / foto de perfil** | [avatar.md](./avatar.md) | `src/controller/upload.controller.js`, `src/services/upload.service.js`, `DELETE /user/:userId/photo` |
| **Produção (URLs)** | [../producao-urls.md](../producao-urls.md) | Site / admin / API em ongraph.com.br |
| **Auth admin** (login painel) | [admin-auth.md](./admin-auth.md) | `POST /admin/authenticate`, seed `seed:admins` |
| **Usuários (admin)** | [admin-users.md](./admin-users.md) | `GET /admin/users`, `src/services/user/admin-user-list.js` |
| **Calendário do Marketing** | [marketing-calendar.md](./marketing-calendar.md) | `GET /marketing-calendar`, CRUD `/admin/marketing-calendar` |
| **Favoritos** | [favorites.md](./favorites.md) | `GET/POST/DELETE /user/favorites…` |
| **Curtidas (like)** | [likes.md](./likes.md) | `GET/POST/DELETE /user/likes…` |
| **Stats da conta (perfil)** | [account-stats.md](./account-stats.md) | `GET /user/account/stats` |
| **Downloads (biblioteca perfil)** | [user-downloads-library.md](./user-downloads-library.md) | `GET /user/downloads/:user_id` enriquecido |
| **Avaliações (estrelas)** | [ratings.md](./ratings.md) | `POST/GET /user/ratings…`, campos no `GET /catalog/:id` |
| **Limite diário de downloads** | [download-daily-limit.md](./download-daily-limit.md) | `GET /signed/url`, `GET /user/plans/download-limits/me`, `plans_download_limits` |
| **Planos e assinaturas** | [plans.md](./plans.md) | `GET /plans`, CRUD `/admin/plans`, `src/services/payments/gateways/asaas/` |
| **Ganhos do colaborador** (comissão por download, saldo, saque) | [colaborador-ganhos.md](./colaborador-ganhos.md) | `GET /user-commissions/:userId`, `src/services/contributor/contributor-earnings-rules.js` |
| **Metadados no upload** | [upload-image-meta.md](./upload-image-meta.md) | `width` / `height` / `file_size` via Sharp (sem OCR) |

### Arquitetura e ADRs

| Doc | Uso |
|-----|-----|
| [architecture/overview.md](../architecture/overview.md) | Visão da stack |
| [architecture/decisions/](../architecture/decisions/) | Por quê (ADR) — ex.: signed URL, limite diário |

### Próximos contextos

- Checkout / tokenização de cartão (ver pendências em [plans.md](./plans.md))
- Upload / grid do painel (já usado; contrato fino depois)

---

## Logout

Não existe endpoint de logout. Sessão **JWT**; cliente descarta token. Ver [auth-publico.md](./auth-publico.md).

## Front de referência

- Auth: `designflix-next-new/features/auth/api.ts`
- Home/Explorer: `designflix-next-new/features/catalog/api.ts`
- Colaborador (cliente): `designflix-next-new/features/contributor/api.ts`
- Colaborador (admin — aprovar/rejeitar): `designflix-admin` (`/collaborators`, auth `POST /admin/authenticate`)
- Avatar: `designflix-next-new/features/profile/avatarApi.ts`
- Usuários (admin): `designflix-admin` (`/users`, `GET /admin/users`)
- Calendário: `designflix-next-new` (home) + `designflix-admin` (`/calendar`)
- Docs integração: `designflix-next-new/docs/integrado/`
- Favoritos: `designflix-next-new/services/UserFavoritesService.ts`
- Avaliações: `designflix-next-new/features/download/ratingApi.ts`
- Arquitetura admin: `designflix-admin/docs/ARCHITECTURE.md`
