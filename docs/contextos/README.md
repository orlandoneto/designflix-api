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

### Próximos contextos

- Planos / checkout (legado de pagamento — última leva)
- Downloads / favoritos (cliente)
- Upload / grid do painel (já usado; contrato fino depois)

---

## Logout

Não existe endpoint de logout. Sessão **JWT**; cliente descarta token. Ver [auth-publico.md](./auth-publico.md).

## Front de referência

- Auth: `designflix-next-new/features/auth/api.ts`
- Home/Explorer: `designflix-next-new/features/catalog/api.ts`
- Colaborador: `designflix-next-new/features/contributor/api.ts`
- Docs integração: `designflix-next-new/docs/integrado/`
