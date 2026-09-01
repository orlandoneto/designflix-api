# E-mail local com Mailpit

Para testar OTP, recuperação de senha e boas-vindas **sem internet** e sem SMTP externo.

Com Docker publicando `-p 1025:1025` e `-p 8025:8025`, use **`localhost`** no `.env.development`:

```env
EMAIL_USE_MAILPIT=true
EMAIL_HOST_SMTP=localhost
EMAIL_PORT_SMTP=1025
```

O `yarn dev` corrige automaticamente se o host estiver com IP antigo do WSL (causa comum de `ETIMEDOUT` no `/forgot-password`).

> **Não use IP do WSL** em `EMAIL_HOST_SMTP` — o IP muda ao reiniciar o WSL e quebra o envio de e-mail.

## Atalho (recomendado)

Na pasta `designflix-api`:

```bash
yarn dev
```

Isso faz tudo de uma vez (somente em desenvolvimento):
1. Sobe o Mailpit no Docker (via WSL no Windows)
2. Garante `EMAIL_HOST_SMTP=localhost` no `.env.development`
3. Sincroniza `.env.development` → `.env`
4. Inicia a API com `nodemon`
5. **Ao encerrar a API (Ctrl+C), para o Mailpit** — se foi este comando que o iniciou

Se o Mailpit já estava rodando antes, ele **não** é parado ao sair.

Para subir só a API, sem Mailpit:

```bash
yarn dev:api
```

```bash
yarn mailpit:up      # só o Mailpit
yarn mailpit:down    # para o Mailpit
yarn mailpit:status  # status do container
```

PowerShell alternativo: `.\scripts\dev-with-mailpit.ps1`

## 1. Subir o Mailpit manualmente

```bash
docker run -d --name mailpit --restart unless-stopped \
  -p 8025:8025 -p 1025:1025 \
  axllent/mailpit
```

| Porta | Uso |
|-------|-----|
| `localhost:1025` | SMTP — o backend envia e-mails aqui |
| `localhost:8025` | Interface web — abra no navegador para ver a caixa de entrada |

No WSL, se o Docker estiver no Windows, use `host.docker.internal` ou o IP do host se `localhost` falhar.

## 2. Variáveis no `.env.development` da API

Copie `env.development.example` para `.env.development` e ajuste:

```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

EMAIL_USE_MAILPIT=true
EMAIL_HOST_SMTP=localhost
EMAIL_PORT_SMTP=1025
EMAIL_FROM=dev@designflix.local
```

Depois:

```bash
npm run dev
```

## 3. Front Next.js

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Front em `http://localhost:3001`.

## 4. Fluxos que usam e-mail

- Cadastro → código OTP (`/otps/send`)
- Esqueci senha → link em `/reset-password?token=...`
- Boas-vindas após `POST /user`

Todos aparecem no Mailpit em http://localhost:8025.

## 5. Produção

Remova `EMAIL_USE_MAILPIT` e configure Hostinger (ou outro SMTP) com `EMAIL_HOST_SMTP`, `EMAIL_PORT_SMTP=465`, usuário e senha.
