# Contexto: Colaborador (conta + candidatura)

Programa de colaborador da Designflix: usuário comum solicita acesso, aceita **termos de colaboração** (distintos do LGPD da conta), equipe aprova, aí o painel `/contributor` libera.

Pagamento (Stripe, Mercado Pago, planos, saldo, Pix, comissões, saque) **permanece legado** e **não** faz parte deste contexto.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/contributor.controller.js` |
| Service | `src/services/contributor.service.js` |
| Regras | `src/services/contributor/contributor-rules.js` |
| Model | `src/models/contributor_application.js` + `user.contributor_status`, `user.username` |
| Migration | `migrations/20260903180000-contributor-application.js` |
| Respostas | `src/utils/httpResponse.js` |
| E-mails | `src/views/contributorRequest.hbs`, `contributorRequestAdmin.hbs` |

**Última revisão:** set/2026 — envelope `{ success, message, data }`, status 200/400/404/410/500; UI do Next deriva menu da aba pelo `contributorStatus` do `/me`. Painel admin de aprovação: **`designflix-admin`** (porta 3002).

---

## Modelo

```
user.contributor_status  →  none | pending | active | rejected
user.contributor         →  1 só quando active (compatível com painel/comissões)
user.username            →  handle do Figma (@usuario), opcional
user.accept_terms        →  ToS da CONTA (cadastro). Não usar para fila de colaborador.

contributor_application
  portfolio_url, instagram, behance, about (campos do Figma)
  terms_accepted_at, terms_version
  status: pending | approved | rejected | withdrawn
```

Um pedido `pending` por usuário. Reenvio só depois de `rejected`.

---

## Fluxo

```
CLIENTE
  GET  /me
  PUT  /me                         → nome, e-mail, telefone, foto, username, chavePix
  POST /contributor/applications   → candidatura (termos obrigatórios)
  GET  /contributor/application

ADMIN (UI: designflix-admin → /collaborators)
  GET  /admin/contributor/applications?status=pending
  POST /admin/contributor/applications/:id/approve
  POST /admin/contributor/applications/:id/reject
```

Painel de arquivos/ganhos: continua `GET /user-main-grid/user/:id`, `GET /user-commissions/:userId`, `GET /user/balance/:userId`, `POST /unified-upload/*` (pagamento/ledger na última leva).

**Front admin:** repositório `designflix-admin` — login via `POST /admin/authenticate`, fila de candidaturas e aprovar/rejeitar.

---

## 1. `GET /me`

Auth: user. `userId` vem do JWT.

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Conta carregada` | conta pública (abaixo) |
| **404** | `Usuário não encontrado` | — |
| **500** | `Erro ao carregar a conta` | — |

```json
{
  "id": 1,
  "name": "Marina Costa",
  "email": "marina@email.com",
  "photo": null,
  "phone": null,
  "countryCode": 55,
  "username": "marinacosta",
  "contributor": 0,
  "contributorStatus": "none",
  "acceptTerms": 1,
  "chavePix": null,
  "createdAt": "2024-08-01T00:00:00.000Z",
  "application": null
}
```

`GET /user/:id` devolve o **mesmo** `data` (auth user/admin).

---

## 2. `PUT /me`

Allowlist: `name`, `email`, `phone`, `countryCode`, `photo`, `username`, `chavePix`.

Campos fora da allowlist são ignorados. `contributor` / `contributorStatus` / `balance` / `password` / `acceptTerms` **não atualizam** a conta. Alias do Figma/front: `fullName` → `name`. `username` é normalizado (`@` removido, minúsculas).

`PUT /user/:userId` é o mesmo handler (token define o user).

| Status | `message` |
|--------|-----------|
| **200** | `Atualização concluída!` |
| **400** | Só campos proibidos (ex. `{ contributor: 1 }`) — use `POST /contributor/applications` |
| **400** | `Nenhum campo válido para atualizar` |
| **400** | `Este nome de usuário já está em uso` |
| **404** | `Usuário não encontrado` |
| **500** | `Erro ao atualizar a conta` |

---

## 3. `POST /contributor/applications`

### Request

```json
{
  "portfolioUrl": "https://seusite.com",
  "instagram": "@seuperfil",
  "behance": "behance.net/seuperfil",
  "about": "Fale sobre sua experiência (máx. 500).",
  "acceptCollaborationTerms": true
}
```

| Status | `message` |
|--------|-----------|
| **200** | `Solicitação enviada` — `data.contributorStatus` = `pending` |
| **400** | URL / about / termos inválidos |
| **400** | `Você já é colaborador` |
| **400** | `Você já tem uma solicitação em análise` |
| **500** | `Erro ao enviar a solicitação` |

---

## 4. `GET /contributor/application`

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Solicitação encontrada` | objeto da application |
| **200** | `Nenhuma solicitação` | `null` |
| **500** | `Erro ao carregar a solicitação` | — |

---

## 5. Admin

Auth: `admin` / `super_admin`.

| Método | Rota | 200 |
|--------|------|-----|
| GET | `/admin/contributor/applications?status=pending` | lista |
| POST | `/admin/contributor/applications/:id/approve` | user `contributor=1`, `contributorStatus=active` |
| POST | `/admin/contributor/applications/:id/reject` | `rejected` |

Body opcional: `{ "note": "..." }`.

---

## Removidos (410)

| Rota antiga | Usar |
|-------------|------|
| `GET /admin/users/contributor` | `GET /admin/contributor/applications?status=pending` |
| `PUT /user/internal` | `POST /admin/contributor/applications/:id/approve` |

Não existe mais “virar colaborador” via `PUT /user` com `{ contributor: 1 }`.

---

## Front (contrato de UI derivado do `/me`)

O Next **não** inventa status: lê `data.contributorStatus` (e `application`) do envelope.

| `contributorStatus` | UI `/profile` | UI `/contributor` |
|---------------------|---------------|-------------------|
| `none` / `rejected` | Aba Área do Colaborador **visível e desabilitada**; card “Quero ser colaborador” | Redireciona para apply |
| `pending` | Aba **visível e desabilitada**; card “Solicitação em análise” | Apply mostra sucesso / status |
| `active` | Aba **ativa** + selo **Colaborador verificado** → painel | Painel; aba **Área do Usuário** volta ao `/profile` |

Candidatura: `/contributor/apply` → `POST /contributor/applications`  
Perfil: `/profile` → `GET/PUT /me`  
Espelho: `designflix-next-new/docs/integrado/colaborador.md`  
Admin (aprovar/rejeitar): `designflix-admin` → `/collaborators`

---

## Padrão HTTP (igual auth/catálogo)

- Helper: `src/utils/httpResponse.js` — `ok` / `badRequest` / `notFound` / `gone` / `serverError`
- Envelope 200: `{ success: true, message, data }`
- Envelope erro: `{ success: false, message }` (sem stack)
- Status: **200 / 400 / 404 / 410 / 500** (sem 201/422 neste domínio)

## Testes API

| Arquivo | Cobre |
|---------|--------|
| `tests/contributor/contributor-rules.test.js` | allowlist, Figma body, `mapAccount`, status |
| `tests/contributor/contributor.service.test.js` | `GET/PUT /me`, apply, 410 legado, approve/reject |
