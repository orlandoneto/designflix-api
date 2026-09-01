# Contextos da API — índice

Documentação **por domínio de negócio** (um arquivo por contexto).  
Objetivo: qualquer dev ou agente de IA ler um contexto e saber **rotas, códigos HTTP, payloads e onde está o código** — sem vasculhar o repositório.

## Como usar

1. Escolha o contexto abaixo.
2. Siga o contrato de status e envelope descrito em cada doc.
3. Ao criar um **novo** contexto, copie a estrutura de `auth-publico.md`.

## Regra global (contextos públicos padronizados)

| Status | Significado |
|--------|-------------|
| **200** | Sucesso |
| **400** | Erro do cliente (validação, credencial, token, regra de negócio) |
| **500** | Erro interno |

Envelope JSON:

```json
// 200
{ "success": true, "message": "opcional", "data": { } }

// 400 / 500
{ "success": false, "message": "descrição legível" }
```

Helper: `src/utils/authHttpResponse.js` (hoje usado no contexto auth público; replicar padrão em novos contextos).

---

## Contextos documentados

| Contexto | Arquivo | Código |
|----------|---------|--------|
| **Auth público** (login, cadastro, OTP, recuperar/redefinir senha) | [auth-publico.md](./auth-publico.md) | `src/controller/auth-public.controller.js`, `src/services/auth-public.service.js` |

### Próximos contextos (criar quando integrar no Next)

- Perfil logado (`PUT /user/:id`, troca de senha autenticada)
- Planos / checkout
- Grid / downloads
- Colaborador / upload

---

## Logout

Não existe endpoint de logout nesta API. A sessão é **stateless (JWT)**; o cliente descarta token + cookie. Documentado em [auth-publico.md](./auth-publico.md).

## Front de referência

O Next consome estes contratos via `designflix-next-new/features/auth/api.ts`.  
Docs de integração no front: `designflix-next-new/docs/integrado/`.
