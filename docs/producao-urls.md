# Produção — URLs Designflix / ON Graph

Status de fumaça dos frontends e da API em produção (Cloudflare + Vercel + OCI).

**Última verificação:** 2026-09-25 (migrations completas; `contributor_application` ok)

| URL | Status |
|-----|--------|
| https://www.ongraph.com.br | 200 |
| https://ongraph.com.br | 308 → www |
| https://admin.ongraph.com.br | 200 |
| https://api.ongraph.com.br | 200 |

## Stack

| Peça | Onde |
|------|------|
| Site | Vercel — projeto `designflix-next-new` |
| Admin | Vercel — projeto `designflix-admin` |
| API | OCI VM `designflix-api` — Nginx → PM2 `:4000` |
| DNS / SSL edge | Cloudflare (Full strict; API com Origin Cert) |
| E-mail transacional | Brevo SMTP `smtp-relay.brevo.com:587` (plano Free, 300/dia) |

## Acesso SSH (VM)

Ver [oci-ssh-access.md](./oci-ssh-access.md).  
**Nunca** fechar firewall/SSH — rule `vps-ssh-firewall-safety`.

## Deploy

`npm run deploy:oracle` — ver [deploy-oracle.md](./deploy-oracle.md). O `.env` da VM vem do `.env.production` local (gitignored; modelo em `env.production.example`).

## E-mail (SMTP)

Brevo — ver [email-smtp-brevo.md](./email-smtp-brevo.md). O IP da VM (`168.75.82.5`) precisa estar em **Authorized IPs** no Brevo.

## Auth admin

Seed e contas padrão: [contextos/admin-auth.md](./contextos/admin-auth.md).

## Health API

`GET https://api.ongraph.com.br/` → texto com versão (`VERSION_API` / `package.json`).
