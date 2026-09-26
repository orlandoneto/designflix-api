# E-mail transacional em produção — SMTP Brevo

Como a API de produção envia e-mail (código de verificação do cadastro, reset de senha, avisos de plano) e onde está cada configuração.

Relacionados: [email-cloudflare.md](./email-cloudflare.md) (DNS, Email Routing, autenticação do domínio) · [deploy-oracle.md](./deploy-oracle.md) · [oci-ssh-access.md](./oci-ssh-access.md) · [producao-urls.md](./producao-urls.md) · dev local: [LOCAL-MAILPIT.md](./LOCAL-MAILPIT.md)

**Configurado em:** 2026-09-26 · **Remetente de produção:** `Designflix <contato@ongraph.com.br>` (domínio autenticado)

---

## 1. Problema e causa raiz

- **Sintoma:** no cadastro do site, "Erro ao enviar código de verificação".
- **Causa:** o `.env` da VM Oracle não tinha nenhuma configuração SMTP (`EMAIL_*` tinha ficado "para depois" na migração). Sem SMTP, o `nodemailer` não tem para onde enviar.
- **Restrições:**
  - A Oracle Cloud **bloqueia a porta 25** de saída → não dá para rodar/usar SMTP "direto" da VM.
  - O SMTP antigo (Hostinger) não existe mais.
- **Solução:** relay SMTP do **Brevo** (plano grátis) na porta **587** (STARTTLS).

---

## 2. Conta Brevo

| Campo | Valor |
|-------|-------|
| Painel | <https://app.brevo.com> |
| Conta / empresa | **Ongraph** |
| Login | **Google** — `orlandoneto23@gmail.com` (dono) |
| Telefone | verificado |
| Plano | **Free** — até **300 e-mails/dia** |

Se passar de 300/dia, os envios excedentes falham até o dia seguinte → avaliar plano pago (Starter) ou outro provedor.

---

## 3. Configuração SMTP

| Variável | Valor | Observação |
|----------|-------|------------|
| `EMAIL_USE_MAILPIT` | `false` | Mailpit é só dev |
| `EMAIL_HOST_SMTP` | `smtp-relay.brevo.com` | |
| `EMAIL_PORT_SMTP` | `587` | STARTTLS → `secure=false` (automático: `secure` só quando porta 465) |
| `EMAIL_USER_SMTP` | `bb3c5…@smtp-brevo.com` | login SMTP da conta (valor completo no `.env.production` / painel) |
| `EMAIL_PASS_SMTP` | chave SMTP **`designflix-vm`** | **segredo** — ver seção 4 |
| `EMAIL_FROM` | `"Designflix <contato@ongraph.com.br>"` | remetente verificado; domínio autenticado (seção 6) |

Código que usa: [`src/utils/mailTransport.js`](../src/utils/mailTransport.js) (`createMailTransport()` + `getEmailFrom()`).

---

## 4. Onde está a chave SMTP (nunca no Git)

A chave **não** está neste repositório (o repo é **público**). Ela existe em:

| Local | Caminho |
|-------|---------|
| PC do Orlando (fonte do deploy) | `C:\projetos\designflix-api\.env.production` — **gitignored**, ACL só do usuário |
| VM de produção | `/home/opc/designflix-api/.env` (`chmod 600`) |
| Brevo | **SMTP & API → SMTP → chave `designflix-vm`** (o Brevo não mostra a chave de novo; se perder, gere outra) |

**Rotacionar a chave:** Brevo → SMTP & API → gerar nova chave → atualizar `EMAIL_PASS_SMTP` no `.env.production` → `npm run deploy:oracle` → testar (seção 9) → apagar a chave antiga no Brevo.

Se a chave vazar (ex.: commit acidental): **revogar no Brevo imediatamente** e gerar outra — apagar o commit não basta.

---

## 5. IPs autorizados (Brevo)

- Brevo → **Security → Authorized IPs**: bloqueio por IP está **ATIVO**.
- IP liberado: **`168.75.82.5`** (VM Oracle `designflix-api`).
- **Qualquer servidor novo** (VM recriada, IP público novo, outro host) precisa ser adicionado lá, senão o envio falha com erro de autenticação / IP não autorizado.
- Envios a partir do PC local **não** funcionam com essa chave (IP não autorizado) — em dev use Mailpit.

---

## 6. Remetente e domínio

**Estado atual (2026-09-26):** domínio `ongraph.com.br` **Authenticated** no Brevo (TXT `brevo-code`, DKIM `brevo1`/`brevo2._domainkey` como CNAME DNS only, SPF com `include:spf.brevo.com`, DMARC `p=reject` existente). Remetente **`Designflix <contato@ongraph.com.br>`** verificado e em uso em produção (`EMAIL_FROM`).

Registros, Email Routing (receber `contato@`), "Enviar como" no Gmail e como reverter: **[email-cloudflare.md](./email-cloudflare.md)**.

Também verificado (legado/teste): `orlandoneto23@gmail.com`.

Trocar o remetente: o endereço precisa ser `@ongraph.com.br` (domínio autenticado) ou estar verificado em Brevo → **Senders**; depois atualizar `EMAIL_FROM` no `.env.production` e rodar `npm run deploy:oracle`.

---

## 7. O que foi alterado na VM (2026-09-26)

1. Backup do `.env`: `/home/opc/designflix-api/.env.bak.20260926122617` (depois `chmod 600` em todos os `.env.bak.*`).
2. Acrescentado ao `/home/opc/designflix-api/.env` (`chmod 600`):

   ```dotenv
   EMAIL_USE_MAILPIT=false
   EMAIL_HOST_SMTP=smtp-relay.brevo.com
   EMAIL_PORT_SMTP=587
   EMAIL_USER_SMTP=<login SMTP Brevo>
   EMAIL_PASS_SMTP=<chave designflix-vm>
   EMAIL_FROM="Designflix <orlandoneto23@gmail.com>"   # valor inicial; hoje contato@ongraph.com.br (item 6)
   ```

3. `pm2 restart designflix-api --update-env`.
4. Teste com `src/utils/mailTransport.js` → `250 … queued`; e-mail recebido. Health 200.
5. O `.env` da VM foi copiado para `C:\projetos\designflix-api\.env.production` (gitignored) — daqui para frente o deploy parte dele.
6. Após a autenticação do domínio: `EMAIL_FROM="Designflix <contato@ongraph.com.br>"` no `.env.production` → `npm run deploy:oracle` (1.0.14). E-mail de teste via `mailTransport` de `contato@` → `250 … queued`.

Nada de firewall / SSH / Security List foi alterado.

---

## 8. Deploy carrega as variáveis

`npm run deploy:oracle` ([deploy-oracle.md](./deploy-oracle.md)) envia o `.env.production` local como `.env` da VM e **recusa** o deploy se:

- faltar `EMAIL_HOST_SMTP`, `EMAIL_PORT_SMTP`, `EMAIL_USER_SMTP`, `EMAIL_PASS_SMTP` ou `EMAIL_FROM` (ou estiverem com placeholder `<...>`);
- `EMAIL_USE_MAILPIT=true`;
- a VM tiver alguma variável que não está no `.env.production` (proteção contra perder segredo).

Modelo sem segredos: [`env.production.example`](../env.production.example). Dev local continua em Mailpit (`.env.development`, [LOCAL-MAILPIT.md](./LOCAL-MAILPIT.md)).

---

## 9. SSH e teste de envio

SSH (PowerShell):

```powershell
ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5
```

Teste usando o transporte real da app (rodar na VM, dentro de `/home/opc/designflix-api`):

```bash
cd /home/opc/designflix-api
node -e '
require("dotenv").config({ path: ".env" });
const { createMailTransport, getEmailFrom } = require("./src/utils/mailTransport");
const t = createMailTransport();
t.verify()
  .then(() => t.sendMail({ from: getEmailFrom(), to: process.argv[1], subject: "Teste SMTP Brevo", text: "SMTP ok" }))
  .then((i) => console.log("OK:", i.response))
  .catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
' orlandoneto23@gmail.com
```

Esperado: `OK: 250 2.0.0 OK: queued as <…>` e o e-mail na caixa (olhar spam na primeira vez).

Do PC, sem sessão interativa (remover `\r` do Windows antes de mandar para o bash):

```powershell
$s = @'
cd /home/opc/designflix-api
node -e 'require("dotenv").config({path:".env"});const m=require("./src/utils/mailTransport");m.createMailTransport().sendMail({from:m.getEmailFrom(),to:"orlandoneto23@gmail.com",subject:"Teste SMTP Brevo",text:"ok"}).then(i=>console.log("OK:",i.response)).catch(e=>{console.error("FALHOU:",e.message);process.exit(1)})'
exit 0
'@
($s -replace "`r","") + "`n" | ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5 'bash -s'
```

Conferir as variáveis sem expor a chave:

```bash
grep -E '^EMAIL_' /home/opc/designflix-api/.env | sed -E 's/^(EMAIL_PASS_SMTP=).*/\1****/'
```

---

## 10. Troubleshooting

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| "Erro ao enviar código de verificação" no site | SMTP ausente/errado no `.env` da VM | Conferir `EMAIL_*` (grep acima) e `pm2 logs` |
| `535 Authentication failed` / "IP not authorized" / e-mail do Brevo avisando IP bloqueado | IP do servidor fora de **Authorized IPs** | Brevo → Security → Authorized IPs → adicionar o IP público |
| `535` mesmo com IP liberado | Chave errada/revogada ou login errado | Gerar nova chave `designflix-vm`, atualizar `.env.production`, deploy |
| Timeout em `:25` | Oracle bloqueia porta 25 | Usar **587** (nunca 25) |
| Timeout em `:587` | Rede de saída | Testar: `timeout 5 bash -c '</dev/tcp/smtp-relay.brevo.com/587' && echo aberto \|\| echo fechado` |
| `wrong version number` / erro TLS | `secure=true` na 587 | 587 = STARTTLS (`secure=false`); só 465 usa TLS direto |
| `Sender not valid` / e-mail não chega | `EMAIL_FROM` não verificado no Brevo | Usar remetente verificado (seção 6) |
| Cai no spam / rejeitado (`p=reject`) | DKIM/SPF quebrados (ex.: CNAME `brevo*._domainkey` com proxy laranja, SPF duplicado) | Conferir DNS em [email-cloudflare.md](./email-cloudflare.md); Brevo → Domains deve mostrar Authenticated |
| Parou de enviar no fim do dia | Limite 300/dia do plano Free | Brevo → estatísticas; esperar ou mudar de plano |

Logs da API:

```bash
pm2 logs designflix-api --lines 100 --nostream
grep -i -E 'mail|smtp' /home/opc/designflix-api/logs/error.log | tail -50
```

No Brevo: **Transactional → Logs** mostra cada envio (entregue, bounce, bloqueado).

---

## 11. Receber e-mail (caixa de entrada) — não é Brevo

O Brevo só **envia**. O recebimento de `contato@ongraph.com.br` é feito pelo **Cloudflare Email Routing**, que encaminha para `orlandoneto23@gmail.com` — ver [email-cloudflare.md](./email-cloudflare.md).

Se um dia precisar de caixa postal de verdade no domínio (vários usuários, IMAP): **Zoho Mail** (Forever Free, até 5 usuários) — exige trocar os MX do Cloudflare pelos do Zoho e acrescentar `include:zoho.com` no **mesmo** SPF.
