# E-mail do domínio `ongraph.com.br` — Cloudflare (DNS + Email Routing) e autenticação Brevo

O que foi configurado no Cloudflare em **2026-09-26** para o domínio receber e-mail (`contato@`) e para o Brevo enviar como `@ongraph.com.br`.

Relacionados: [email-smtp-brevo.md](./email-smtp-brevo.md) (envio SMTP da API) · [producao-urls.md](./producao-urls.md)

| Campo | Valor |
|-------|-------|
| Cloudflare (conta) | `orlandoneto23@gmail.com` |
| Zona | `ongraph.com.br` |
| Recebimento | Cloudflare **Email Routing** (só encaminha; não é caixa postal) |
| Envio | **Brevo** (SMTP `smtp-relay.brevo.com:587`) — domínio **Authenticated** |

---

## 1. Antes (domínio "sem e-mail")

A zona tinha os registros padrão de "este domínio não envia nem recebe e-mail":

| Tipo | Nome | Conteúdo |
|------|------|----------|
| MX | `@` | `0 .` (null MX — recusa tudo) |
| TXT | `@` | `v=spf1 -all` (ninguém pode enviar) |
| TXT | `_dmarc` | `v=DMARC1; p=reject;` |

Com isso, `contato@ongraph.com.br` não recebia nada e qualquer envio em nome do domínio seria rejeitado.

## 2. Mudanças no DNS

1. **Apagados:** o null MX (`MX 0 .`) e o TXT `v=spf1 -all`.
2. **Email Routing ativado** (Cloudflare → Email → Email Routing). Ele criou:

   | Tipo | Nome | Conteúdo | Prioridade |
   |------|------|----------|------------|
   | MX | `@` | `route1.mx.cloudflare.net` | 60 |
   | MX | `@` | `route2.mx.cloudflare.net` | 82 |
   | MX | `@` | `route3.mx.cloudflare.net` | 58 |
   | TXT | `cf2024-1._domainkey` | DKIM do Cloudflare (valor gerado pelo Email Routing) | — |
   | TXT | `@` | SPF (ver abaixo) | — |

3. **SPF editado para um único registro** (Cloudflare + Brevo):

   ```text
   v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all
   ```

   Regra: **um só** TXT `v=spf1` na raiz. Novo provedor de envio = acrescentar `include:` neste mesmo registro.

4. **`_dmarc` mantido sem alteração:** `v=DMARC1; p=reject;`.

## 3. Email Routing (receber `contato@`)

- **Destination address** verificado: `orlandoneto23@gmail.com`.
- **Regra ativa:** `contato@ongraph.com.br` → `orlandoneto23@gmail.com`.
- O Cloudflare **encaminha**; a mensagem chega no Gmail. Não há caixa postal no domínio.

### Adicionar outro alias

1. Cloudflare → `ongraph.com.br` → **Email → Email Routing → Routing rules → Create address**.
2. Custom address (ex.: `suporte`) → Action **Send to an email** → destino já verificado (ou verificar um novo em **Destination addresses** — o dono do destino recebe um link de confirmação).
3. Salvar. Funciona em segundos (os MX já existem).
4. Para **enviar** como o novo alias: adicionar o remetente em Brevo → **Senders** (o domínio já está autenticado) e, se for responder pelo Gmail, repetir a seção 4.

Catch-all (qualquer endereço → Gmail) existe em **Routing rules → Catch-all address**, mas atrai spam; hoje está desligado.

## 4. Responder como `contato@` pelo Gmail ("Enviar como")

Recebe-se no Gmail; para **responder com o remetente `contato@ongraph.com.br`**:

1. Gmail → ⚙️ **Ver todas as configurações → Contas e importação → Enviar e-mail como → Adicionar outro endereço de e-mail**.
2. Nome: `Designflix` · E-mail: `contato@ongraph.com.br` · **desmarcar** "Tratar como alias" (opcional) → Próxima.
3. Servidor SMTP:

   | Campo | Valor |
   |-------|-------|
   | Servidor SMTP | `smtp-relay.brevo.com` |
   | Porta | `587` (TLS) |
   | Usuário | `bb3c54001@smtp-brevo.com` |
   | Senha | a **chave SMTP** do Brevo (a mesma de `EMAIL_PASS_SMTP`) — está em `C:\projetos\designflix-api\.env.production` (gitignored) e na VM em `/home/opc/designflix-api/.env`; se preferir, gere uma chave **só para o Gmail** no Brevo (SMTP & API → SMTP → Generate) |

4. O Gmail envia um código de confirmação para `contato@` → chega no próprio Gmail pelo Email Routing → confirmar.
5. Opcional: "Ao responder, usar o mesmo endereço para o qual a mensagem foi enviada".

> ⚠️ O Brevo está com **bloqueio por IP ativo** (Security → Authorized IPs, só `168.75.82.5`). Os servidores do Gmail **não** estão nessa lista, então o "Enviar como" via Brevo falha com erro de autenticação enquanto o bloqueio estiver ativo. Opções: (a) usar uma chave SMTP separada e desativar o bloqueio por IP (menos seguro), ou (b) responder pelo Gmail normal. Decida antes de configurar.

Envios pelo Gmail contam no limite do Brevo (300/dia no plano Free).

## 5. Autenticação do domínio no Brevo

**Status: ✅ concluída (2026-09-26)** — domínio `ongraph.com.br` **Authenticated**; remetente `Designflix <contato@ongraph.com.br>` **Verified**.

Registros criados no Cloudflare:

| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| TXT | `@` | `brevo-code:84c9a44a5c44b905354e8aaafb6f9b05` | — |
| CNAME | `brevo1._domainkey` | `b1.ongraph-com-br.dkim.brevo.com` | **DNS only** (nuvem cinza) |
| CNAME | `brevo2._domainkey` | `b2.ongraph-com-br.dkim.brevo.com` | **DNS only** (nuvem cinza) |

- **SPF** já existente, sem mudança: `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all`.
- **DMARC** sem mudança: `v=DMARC1; p=reject;`. O Brevo sugeriu `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`, mas aceitou o existente. (Com `p=reject`, e-mail que falhar SPF/DKIM é rejeitado — por isso os CNAMEs DKIM precisam continuar **DNS only**.)
- Produção passou a usar `EMAIL_FROM="Designflix <contato@ongraph.com.br>"` (deploy 1.0.14); e-mail de teste da API enviado de `contato@` com sucesso (`250 … queued`).

Os CNAMEs DKIM **não podem** ficar com proxy laranja — o Cloudflare responderia com os próprios IPs e a assinatura DKIM falharia.

## 6. Como reverter

| Quero desfazer | Passos |
|----------------|--------|
| Parar de receber `contato@` | Email Routing → Routing rules → desativar/excluir a regra (ou **Disable Email Routing**, que remove os MX/DKIM dele) |
| Voltar ao estado "sem e-mail" | Desativar Email Routing; apagar MX `route*.mx.cloudflare.net`, TXT `cf2024-1._domainkey`, TXT `brevo-code`, CNAMEs `brevo1/brevo2._domainkey`; recriar `MX @ 0 .` e TXT `v=spf1 -all`; manter `_dmarc p=reject` |
| Tirar só o Brevo | Remover `include:spf.brevo.com` do SPF, apagar `brevo-code` e os CNAMEs `brevo*._domainkey`; no `.env.production` voltar `EMAIL_FROM` para um remetente verificado e rodar `npm run deploy:oracle` — **senão a API para de enviar** |

Antes de apagar qualquer registro, anotar o valor atual (Cloudflare → DNS → Export).
