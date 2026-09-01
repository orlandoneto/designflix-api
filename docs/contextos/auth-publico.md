# Contexto: Auth público

Login, cadastro com OTP, recuperação e redefinição de senha.  
**Sem autenticação Bearer** — rotas abertas.

| Item | Caminho |
|------|---------|
| Controller | `src/controller/auth-public.controller.js` |
| Service | `src/services/auth-public.service.js` |
| Respostas HTTP | `src/utils/authHttpResponse.js` |
| E-mail reset | `src/views/forgot.hbs` |
| E-mail OTP | `src/views/otps.hbs` |
| reCAPTCHA login | `src/middleware/recaptcha.js` (`SKIP_RECAPTCHA=true` em dev) |
| Mail dev | `docs/LOCAL-MAILPIT.md` |

**Última revisão:** set/2026 — envelope `{ success, message, data }`, status 200/400/500.

---

## Logout

| | |
|--|--|
| **Endpoint** | Nenhum |
| **Comportamento** | JWT RS256 no header `Authorization: Bearer` após login. Validade do token de sessão: **14 dias**. Logout = cliente remove token (`localStorage` + cookie `designflix_token` no Next). |

---

## Fluxo (ordem das chamadas)

```
LOGIN
  POST /user/authenticate

CADASTRO
  GET  /user/find/:email          → e-mail livre?
  GET  /otps/send?email=          → envia código
  GET  /otps/verify?email=&otp=   → valida código
  POST /user                      → cria conta + token

RECUPERAR SENHA
  POST /forgot-password           → envia link (15 min)
  GET  /forgot-check-token/:token → valida link na tela /reset-password
  PUT  /forgot-update-password/:token → nova senha
```

Parceiro opcional no cadastro: `GET /partners/verify-code/:code` (fora deste service; `partners.controller.js`).

---

## 1. `POST /user/authenticate`

Login.

### Request

```json
{
  "email": "user@email.com",
  "password": "senha123",
  "recaptchaToken": "token-google-ou-dev-bypass"
}
```

### Respostas

| Status | `message` (exemplos) | `data` |
|--------|----------------------|--------|
| **200** | `Login realizado com sucesso` | `{ "user": { ... }, "token": "JWT..." }` |
| **400** | `E-mail e senha são obrigatórios` | — |
| **400** | `E-mail ou senha incorretos` | — |
| **500** | `Erro ao autenticar usuário` | — |

---

## 2. `GET /user/find/:email`

Verifica se e-mail já está cadastrado (antes do cadastro).

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Usuário encontrado` | `{ "exists": true }` |
| **200** | `Usuário não encontrado` | `{ "exists": false }` |
| **400** | `E-mail é obrigatório` | — |
| **500** | `Erro ao verificar e-mail` | — |

---

## 3. `GET /otps/send?email={email}`

Envia código de 6 dígitos.

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Código enviado com sucesso` | `{ "devOtp": "123456" }` só em `NODE_ENV=development` |
| **200** | `Código gerado (e-mail falhou em dev — use o código retornado)` | `{ "devOtp", "emailError" }` em dev se SMTP falhar |
| **400** | `E-mail é obrigatório` | — |
| **500** | `Não foi possível enviar o e-mail de verificação` | prod, SMTP falhou |
| **500** | `Erro ao enviar código de verificação` | — |

---

## 4. `GET /otps/verify?email={email}&otp={code}`

Valida OTP (uso único; registro é apagado após sucesso).

### Respostas

| Status | `message` |
|--------|-----------|
| **200** | `Código verificado com sucesso` |
| **400** | `E-mail e código são obrigatórios` |
| **400** | `Código inválido ou expirado` |
| **500** | `Erro ao verificar código` |

---

## 5. `POST /user`

Cria conta (após OTP válido).

### Request (campos principais)

```json
{
  "fullName": "Nome",
  "email": "user@email.com",
  "password": "senha123",
  "phone": "11999999999",
  "countryCode": 55,
  "acceptTerms": 1,
  "privacyPolicy": 1,
  "code_partner": "OPCIONAL"
}
```

### Respostas

| Status | `message` (exemplos) | `data` |
|--------|----------------------|--------|
| **200** | `Conta criada com sucesso` | `{ "user": { ..., "token": "JWT..." } }` |
| **400** | `Nome, e-mail e senha são obrigatórios` | — |
| **400** | `É necessário aceitar os termos de uso` | — |
| **400** | `Já existe um usuário com o e-mail informado` | — |
| **400** | `Código do parceiro inválido` | — |
| **500** | `Erro ao criar conta` | — |

---

## 6. `POST /forgot-password`

Solicita link de redefinição. Link expira em **15 minutos** (`RESET_TOKEN_EXPIRES_IN = "15m"`).

### Request

```json
{ "email": "user@email.com" }
```

### Respostas

| Status | `message` |
|--------|-----------|
| **200** | `Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.` (sempre igual, evita enumeração de e-mails) |
| **400** | `E-mail é obrigatório` |
| **500** | `Erro ao processar a solicitação` |
| **500** | `Mailpit indisponível...` (só dev, SMTP off) |

Link gerado: `{FRONTEND_URL}/reset-password?token={JWT}`

---

## 7. `GET /forgot-check-token/:token`

Valida token antes de exibir formulário de nova senha.

### Respostas

| Status | `message` | `data` |
|--------|-----------|--------|
| **200** | `Token válido` | `{ "valid": true, "email": "...", "name": "..." }` |
| **400** | `Token é obrigatório` | — |
| **400** | `Token inválido ou expirado` | — |
| **400** | `Token inválido ou expirado. Solicite uma nova redefinição.` | — |

> Não retorna senha nem objeto `user` completo.

---

## 8. `PUT /forgot-update-password/:token`

Define nova senha.

### Request

```json
{
  "password": "novaSenha123",
  "confirmPassword": "novaSenha123"
}
```

### Respostas

| Status | `message` (exemplos) | `data` |
|--------|----------------------|--------|
| **200** | `Senha redefinida com sucesso. Faça login novamente.` | `{ "requiresReauth": true }` |
| **400** | `Token é obrigatório` | — |
| **400** | `Senha e confirmação de senha são obrigatórias` | — |
| **400** | `Senha e confirmação não coincidem` | — |
| **400** | `Senha deve ter pelo menos 6 caracteres` | — |
| **400** | `A nova senha deve ser diferente da senha atual` | — |
| **400** | `Token inválido ou expirado. Solicite uma nova redefinição.` | — |
| **500** | `Erro interno ao redefinir senha` | — |

---

## Removidos (não usar)

| Rota | Motivo |
|------|--------|
| `POST /user/reset-password` | Legado — gerava senha aleatória e enviava por e-mail. Substituído pelo fluxo `forgot-password`. |

---

## Variáveis de ambiente relevantes

```env
FRONTEND_URL=http://localhost:3001
SKIP_RECAPTCHA=true
EMAIL_USE_MAILPIT=true
EMAIL_HOST_SMTP=localhost
EMAIL_PORT_SMTP=1025
```

---

## Front (referência)

| Rota UI | Chamada API |
|---------|-------------|
| `/login` | `POST /user/authenticate` |
| `/register` | `GET /user/find`, `GET /otps/send` |
| `/valid-code` | `GET /otps/verify`, `POST /user` |
| `/recover-password` | `POST /forgot-password` |
| `/recover-password/sent` | (só UI) |
| `/reset-password` | `GET /forgot-check-token`, `PUT /forgot-update-password` |

Cliente: `designflix-next-new/features/auth/api.ts`
