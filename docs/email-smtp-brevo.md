# E-mail transacional em produção — SMTP Brevo

Como a API de produção envia e-mail (código de verificação do cadastro, reset de senha, avisos de plano) e onde está cada configuração.

Relacionados: [deploy-oracle.md](./deploy-oracle.md) · [oci-ssh-access.md](./oci-ssh-access.md) · [producao-urls.md](./producao-urls.md) · dev local: [LOCAL-MAILPIT.md](./LOCAL-MAILPIT.md)

**Configurado em:** 2026-09-26

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
| `EMAIL_FROM` | `"Designflix <orlandoneto23@gmail.com>"` | precisa ser remetente verificado (seção 6) |

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

**Hoje:** o único remetente verificado é `orlandoneto23@gmail.com` → `EMAIL_FROM="Designflix <orlandoneto23@gmail.com>"`.

**Pendente — autenticar `ongraph.com.br`** para enviar como `contato@ongraph.com.br` (melhor entregabilidade, menos spam):

1. Brevo → **Senders, Domains & Dedicated IPs → Domains → Add a domain** → `ongraph.com.br`.
2. O Brevo mostra os registros DNS. No **Cloudflare** (DNS de `ongraph.com.br`), criar como **DNS only** (nuvem cinza):
   - **TXT** `brevo-code` de verificação (valor dado pelo Brevo);
   - **DKIM** (TXT/CNAME `…._domainkey` dado pelo Brevo);
   - **SPF**: um único TXT na raiz `v=spf1 include:spf.brevo.com ~all` (se já existir SPF, **acrescentar** o `include:` no mesmo registro — nunca dois SPF);
   - **DMARC**: TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:<seu-email>` (começar com `p=none`, endurecer depois).
3. Voltar no Brevo → **Authenticate** / verificar até ficar tudo verde.
4. Adicionar o remetente `contato@ongraph.com.br` (Senders).
5. Trocar no `.env.production`: `EMAIL_FROM="Designflix <contato@ongraph.com.br>"` → `npm run deploy:oracle` → testar.

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
   EMAIL_FROM="Designflix <orlandoneto23@gmail.com>"
   ```

3. `pm2 restart designflix-api --update-env`.
4. Teste com `src/utils/mailTransport.js` → `250 … queued`; e-mail recebido. Health 200.
5. O `.env` da VM foi copiado para `C:\projetos\designflix-api\.env.production` (gitignored) — daqui para frente o deploy parte dele.

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
| Parou de enviar no fim do dia | Limite 300/dia do plano Free | Brevo → estatísticas; esperar ou mudar de plano |

Logs da API:

```bash
pm2 logs designflix-api --lines 100 --nostream
grep -i -E 'mail|smtp' /home/opc/designflix-api/logs/error.log | tail -50
```

No Brevo: **Transactional → Logs** mostra cada envio (entregue, bounce, bloqueado).

---

## 11. Receber e-mail (caixa de entrada) — não é Brevo

O Brevo só **envia**. Não existe caixa `contato@ongraph.com.br` para **receber** respostas.

Quando precisar: **Zoho Mail** (plano Forever Free, até 5 usuários, domínio próprio) — cria registros **MX** (+ SPF do Zoho no mesmo TXT do SPF: `v=spf1 include:spf.brevo.com include:zoho.com ~all`) no Cloudflare. Alternativa simples: Cloudflare Email Routing (só encaminha para o Gmail). Enquanto isso, respostas vão para o remetente atual (`orlandoneto23@gmail.com`).
