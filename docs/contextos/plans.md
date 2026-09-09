# Planos e assinaturas

Catálogo de planos, direito de acesso e o módulo de cobrança (Asaas).

| Item | Caminho |
|------|---------|
| Regras do catálogo | `src/services/plans/plans-rules.js` |
| CRUD | `src/services/admin-plans.service.js`, `src/controller/admin-plans.controller.js` |
| Módulo Asaas | `src/services/payments/gateways/asaas/` |
| Gate de acesso | `src/services/download/daily-download-limit.js` |
| Front (site) | `designflix-next-new/features/plans/api.ts` |
| Front (admin) | `designflix-admin/src/features/plans/` |

## Modelo mental

**A tabela `plans` é a fonte de verdade do preço. O gateway é espelho.**

Na Stripe o preço morava lá (`Product` + `Price`) e o banco guardava só o ponteiro
`stripe_price_id` — para saber quanto custava o plano era preciso perguntar pela
rede. O Asaas não tem catálogo remoto: `POST /v3/subscriptions` recebe `value` e
`cycle` no corpo, e o preço passa a viver em cada assinatura.

Consequência prática: **não existe rota de sincronizar**. Criar plano no admin é
`INSERT` local e nada mais.

## Tabelas

### `plans` — catálogo

| Coluna | Observação |
|---|---|
| `plan_name` | slug interno, único |
| `display_name` | nome exibido |
| `tier` | `free` \| `pro` \| `studio` (livre) |
| `price_cents` | inteiro, em centavos — nunca float |
| `currency` | só `BRL` hoje |
| `billing_interval` | `month` \| `year` |
| `features` | JSON em TEXT (getter devolve array) |
| `sort_order`, `active` | ordenação e visibilidade |
| `gateway` | `asaas` \| `stripe` \| `null` (plano gratuito) |
| `count_downloads` | limite diário do free |
| `monthly_download_cap` | teto mensal do plano pago; `null` = ilimitado |
| `stripe_price_id` | **legado**, nullable |

### `user_plans` — direito de acesso (agnóstico)

Ganhou `status` e `provider`. Antes o acesso era inferido de "existe linha e
alguma coluna `*_customer_id` não é nula", o que tornava impossível representar
inadimplência.

| `status` | Acesso | Quem define |
|---|---|---|
| `pending` | **cortado** | criação da assinatura |
| `active` | liberado | webhook de pagamento confirmado |
| `past_due` | **liberado** (tolerância) | webhook `PAYMENT_OVERDUE` |
| `suspended` | cortado | job de suspensão após a tolerância |
| `canceled` | cortado | cancelamento / assinatura removida |
| `expired` | cortado | fim de vigência |

`past_due` continua liberando de propósito: vencer não corta na hora.

`pending` corta de propósito: criar assinatura não confirma pagamento nenhum. No
Pix o QR pode simplesmente nunca ser pago — se `pending` liberasse acesso, bastava
criar assinatura e ignorar a cobrança para ter plano de graça.

Status **vazio** conta como liberado (`isEntitledPlanStatus`): é linha anterior à
coluna, e trancar assinante legítimo por backfill incompleto é pior que liberar.

O front usa a mesma regra. `GET /user-plan-grouped/:id` (rota legada, mas é dela
que o site tira o estado do plano) devolve `status`, `provider` e, no `plans`
incluído, `price_cents` e `tier` — sem o preço, o site voltaria a deduzir
"é assinante" de `stripe_customer_id` e deixaria assinante Asaas como gratuito.

### `asaas_subscriptions` e `asaas_webhook_events` — módulo Asaas

O Asaas **não** divide espaço com o legado. Em vez de empilhar colunas em
`user_plans` (como Stripe e Mercado Pago fizeram), o módulo tem tabelas
próprias. `asaas_webhook_events` existe só para idempotência: o Asaas reentrega
o evento até receber 200, e sem trava de unicidade em `asaas_event_id` isso
vira e-mail duplicado e acesso concedido duas vezes.

## Rotas

### Público

| Método | Rota | Status |
|---|---|---|
| GET | `/plans` | 200 (lista vazia também), 500 |

Retorna só planos ativos e **não expõe nada de gateway** — o site faz checkout
por `plans.id`, então trocar de gateway não muda o contrato do front.

### Admin (`admin` ou `super_admin`)

Mesma régua de `/admin/users`: planos são dado de produto. O gate exclusivo de
`super_admin` fica reservado para gerenciar os próprios admins.

| Método | Rota | Status |
|---|---|---|
| GET | `/admin/plans` | 200, 500 |
| GET | `/admin/plans/:id` | 200, 400, 404, 500 |
| POST | `/admin/plans` | 200, 400, 500 |
| PUT | `/admin/plans/:id` | 200, 400, 404, 500 |
| DELETE | `/admin/plans/:id` | 200, 400, 404, 500 |

### Assinatura (usuário autenticado)

| Método | Rota | Status |
|---|---|---|
| POST | `/asaas/credit-card/token` | 200, 400, 404, 500 |
| POST | `/asaas/subscriptions` | 200, 400, 404, 500 |
| PUT | `/asaas/subscriptions/me/plan` | 200, 400, 404, 500 |
| PUT | `/asaas/subscriptions/me/billing-type` | 200, 400, 404, 500 |
| GET | `/asaas/subscriptions/me` | 200, 404, 500 |
| GET | `/asaas/subscriptions/me/payments` | 200, 400, 404, 500 |
| DELETE | `/asaas/subscriptions/me` | 200, 400, 404, 500 |
| POST | `/asaas/webhook` | 200, 400, 500 |

O usuário vem sempre de `req.params.userId` (injetado pelo JWT), **nunca do
corpo** — senão qualquer um assina ou cancela em nome de outro.

`POST /asaas/subscriptions` recebe `{ planId, billingType, creditCardToken? }`
mais os campos de cobrança opcionais e devolve `meta.invoiceUrl` (link do
Pix/boleto).

### De onde sai o `meta.invoiceUrl`

Da **cobrança**, via `GET /subscriptions/{id}/payments` — não da assinatura. O
objeto de assinatura do Asaas não tem `invoiceUrl`, e lê-lo de lá devolvia
sempre `null`: o checkout ficava sem nenhum caminho para pagar e o assinante só
achava o Pix pelo e-mail do gateway.

A primeira cobrança pode não existir no instante em que a recorrência é criada.
Isso **não** é erro: a resposta é 200 com `invoiceUrl: null` e o site relê a
lista de cobranças até o link aparecer. Falha ao consultar a cobrança também
não derruba a resposta — a assinatura já existe no Asaas, e devolver erro faria
o usuário tentar assinar de novo.

Ao mockar esse fluxo em teste, não injete `invoiceUrl` no retorno de
`createSubscriptionAsaas`: era esse mock que escondia o checkout mudo.

Recusa assinar quem já tem assinatura ativa: trocar de plano é outro fluxo
(abaixo), e criar duas assinaturas resulta em cobrança dupla.

## Troca de plano

`PUT /asaas/subscriptions/me/plan` com `{ planId, billingType?, creditCardToken? }`.
Sem `billingType` no corpo, repete o meio de pagamento da assinatura atual.

**Não há pró-rata.** O Asaas não calcula proporcional, e implementar isso aqui
significaria emitir crédito manual — decisão de produto que não vale a
complexidade nesse ticket médio.

A sequência é:

1. `validatePlanChange` confere o destino (ativo, pago, gateway `asaas`, e
   diferente do atual) e classifica em `upgrade` \| `downgrade` \| `lateral`
2. a recorrência atual é cancelada no Asaas e a linha local vira `INACTIVE`
3. a assinatura do plano novo é criada com vencimento hoje
4. **`user_plans` não é tocado**: `plan_id` e `status` continuam no plano antigo

O passo 4 é o ponto todo. Quem clica em trocar já pagou o plano atual; mover o
`plan_id` na hora tiraria o acesso pago e, se o Pix novo nunca fosse pago, o
assinante ficaria sem nada. Quem efetiva a troca é o webhook: em evento que
libera acesso (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`), o `plan_id` passa a ser
o do `externalReference`.

Cancelar antes de criar é proposital — o risco inverso é cobrança dupla. Se a
criação falhar, o service grava `plan_canceled` + `plan_finish_at` para o acesso
terminar no fim do período já pago, em vez de deixar plano ativo que ninguém
mais cobra.

Resposta: `meta.invoiceUrl` (cobrança nova) e `meta.planChange` com
`{ kind, fromPlanId, toPlanId, effective: 'on_payment' }`.

## Trocar a forma de pagamento

`PUT /asaas/subscriptions/me/billing-type` com `{ billingType, creditCardToken? }`.

Serve a quem assinou no Pix ou boleto, **não pagou** e prefere cartão — que
confirma na hora em vez de esperar compensação. Não confundir com troca de
plano: aqui o plano é o mesmo e muda só como se paga.

Por que endpoint próprio: assinar de novo bate no guarda de assinatura ativa
(400) e `validatePlanChange` recusa plano igual (400). Cancelar para reassinar
perderia o histórico da recorrência.

Mecanismo: `PUT /v3/subscriptions/{id}` com **`updatePendingPayments: true`**.
Sem esse parâmetro o Asaas muda só as cobranças futuras e a pendente sobrevive
— o assinante ficaria com um boleto em aberto e uma fatura de cartão no mesmo
mês. Verificado no sandbox: a cobrança pendente **muda de tipo mantendo o mesmo
id**, não é duplicada. Cobrança paga, vencida ou cancelada o Asaas não altera.

| Situação | Resposta |
|---|---|
| Trocou | 200 + `meta.invoiceUrl` (a cobrança convertida, `null` no cartão) |
| Cartão sem `creditCardToken` | 400 |
| `billingType` inválido ou `UNDEFINED` | 400 |
| Já usa essa forma de pagamento | 400 |
| Sem assinatura ativa | 404 |

Risco que o front precisa avisar: boleto pago no banco continua `PENDING` até
compensar (até 3 dias úteis). Trocar nessa janela cobra de novo, agora no
cartão. O checkout mostra o aviso antes de oferecer a troca.

O acesso continua sendo liberado só pelo webhook do pagamento confirmado.

## Teto mensal de downloads no plano pago

Plano pago é ilimitado por dia. Com comissão de R$ 0,30 por download
(`docs/contextos/colaborador-ganhos.md`), um plano de R$ 29 fica negativo por
volta de 97 downloads no mês — daí `plans.monthly_download_cap`.

| Plano | Janela | Fonte do limite |
|---|---|---|
| gratuito (ou pago suspenso) | dia | `plans.count_downloads` |
| pago com teto | mês | `plans.monthly_download_cap` |
| pago sem teto | — | ilimitado (comportamento histórico) |

Contadores em `plans_download_limits`: `current_count_downloads` (diário) e
`monthly_count_downloads` + `monthly_period` (`YYYY-MM`). A janela gravada é o
que permite saber se o número é do mês corrente; contador de outro mês vale
zero.

O reset diário passou a **zerar** a coluna em vez de apagar a linha: o contador
mensal mora na mesma linha, e apagar daria teto novo todo dia.

Bater o teto devolve 400 com `Você atingiu o limite de downloads do seu plano
neste mês` — não suspende nem cobra nada, libera na virada do mês. A quota
(`GET /user/plans/download-limits/me` e o `quota` de `/signed/url`) ganhou
`period: 'day' | 'month'`, senão o mesmo "2 de 3" significaria coisas
diferentes para free e assinante.

## Dados de cobrança: pedidos no checkout

O registro público nunca coletou CPF, então **não há backfill possível** — é
dado que só o titular tem. Em vez de travar o cadastro (atrito no topo do funil
de um produto freemium, e coleta sem finalidade pela LGPD), o checkout completa
o que falta.

`resolveBillingIdentity` combina cadastro e corpo da request:

| Campo | Origem | Persistido? |
|---|---|---|
| `cpf` | cadastro tem precedência; corpo é fallback | sim, em `users.cpf` |
| `phone` | cadastro tem precedência; corpo é fallback | sim, em `users.phone` |
| `postalCode` | `user_address` tem precedência | não |
| `addressNumber` | `user_address` tem precedência | não |

CPF salvo mas **inválido** (lixo do cadastro por admin) é tratado como ausente e
substituído pelo do checkout. A base se cura sozinha, e só nos usuários que
importam: quem paga.

Aceitar CPF do corpo não contradiz a regra de não confiar na request — a regra
vale para **identidade** (`userId`, sempre do JWT), não para o titular informar
o próprio documento.

### CPF repetido entre contas é permitido

Sem checagem de unicidade, de propósito: bloquear não impede fraude (quem quer
burlar usa outro documento) e quebra o caso legítimo de quem assina em conta
nova por ter perdido acesso ao e-mail antigo.

Consequência: duas contas com o mesmo CPF compartilham o cliente no Asaas
(`findCustomerByCpfCnpjAsaas` reaproveita por documento). Assinaturas e
cobranças seguem separadas, e o roteamento de status é seguro porque o
`externalReference` carrega o `userId`.

> Não copiar a checagem de `user.service.js:272` (`findOne({ where: { cpf } })`):
> com `cpf` nulo ela casa com o primeiro usuário sem documento e recusa
> indevidamente.

### Validação de documento

`sanitizeCpfCnpjAsaas` confere **dígito verificador** de CPF e CNPJ, não só o
tamanho. Sem isso `00000000000` passaria e o erro só apareceria como 400 opaco
do Asaas, no meio do pagamento, sem dizer qual campo está errado.

## Tokenização de cartão

`POST /asaas/credit-card/token` → `POST /v3/creditCard/tokenize`.

A chave de API não pode ir para o browser, então o número do cartão passa por
esta API. É escopo PCI assumido conscientemente (SAQ-D). As mitigações:

- `buildTokenizePayloadAsaas` copia os campos **um por um**; espalhar o corpo da
  request faria qualquer chave extra do cliente vazar num payload com PAN
- nenhum log do corpo: no `catch` vai só `error.message`, nunca o objeto inteiro
  (o stack pode carregar o payload)
- `morgan("combined")` não registra corpo de request
- o PAN não é persistido: guarda-se só o `creditCardToken`
- resposta devolve apenas token, últimos dígitos e bandeira

Campos exigidos pelo Asaas no `creditCardHolderInfo`: nome, e-mail, CPF, CEP,
número do endereço e telefone. Por isso o cartão pede mais dados que o Pix.

### Substituto do Billing Portal

A Stripe entregava uma página hospedada (`billingPortal.sessions.create`). O
Asaas não tem equivalente, então `GET /asaas/subscriptions/me/payments` devolve
o histórico de cobranças e o site renderiza a tela.

### Cancelamento não corta na hora

`DELETE /asaas/subscriptions/me` encerra a recorrência no Asaas e grava
`plan_canceled = true` + `plan_finish_at`, mas **mantém `status` liberado** até o
fim do período já pago. Quem vira para `expired` é o job.

## Validação

- `plan_name`, `display_name` e `tier` obrigatórios; `plan_name` segue o padrão
  abaixo e é único
- `price_cents` inteiro ≥ 0
- `billing_interval` só `month` ou `year`
- Plano **pago** sem gateway explícito nasce em `asaas`
- Plano **gratuito** com gateway é recusado (400)
- `monthly_download_cap` vazio = ilimitado; se vier, inteiro ≥ 1. No plano
  gratuito é forçado a `null` — lá quem limita é o contador diário

### Padrão de `plan_name`

`plan_name` é chave interna (aparece em código, log e comparação de tier), então
o formato é fechado: `/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/`, de 3 a 40 caracteres.

| Entrada | Resultado |
|---|---|
| `pro_mensal`, `free`, `studio_anual` | aceito |
| `Pro Mensal`, `  pro__mensal_ ` | normalizado para `pro_mensal` |
| `pro-mensal`, `pró_mensal`, `1pro`, `pro mensal!` | 400 |

A normalização só corrige o cosmético (caixa, espaço, underscore repetido e das
pontas). Acento, hífen, símbolo ou início com número são **erro** — quem cadastra
precisa seguir o padrão, não ter o nome adivinhado.

Enforço em `src/services/plans/plans-rules.js` (`validatePlanName`). O admin
espelha as mesmas regras em `src/features/plans/planName.ts` só para avisar antes
do submit, com um `?` ao lado do campo mostrando o padrão e exemplos.

## Remoção: arquiva em vez de apagar

`DELETE /admin/plans/:id` com assinantes faz `active = false` e devolve
`meta.archived = true`. Apagar quebraria o histórico e deixaria
`user_plans.plan_id` órfão. Sem assinantes, apaga de verdade.

## Convenção de nomenclatura do módulo Asaas

Para diferenciar o módulo no código: constantes `ASAAS_*`, funções com sufixo
`Asaas`, variáveis com prefixo `asaas`, arquivos `asaas-*.js`.

| Arquivo | Responsabilidade |
|---|---|
| `asaas-config.js` | env, URLs, `isConfiguredAsaas` |
| `asaas-client.js` | transporte HTTP, `AsaasError` |
| `asaas-api.js` | wrappers de endpoint |
| `asaas-rules.js` | regras puras (ciclo, valor, payloads, `externalReference`) |
| `asaas-webhook-verify.js` | autenticação do webhook |
| `asaas-subscription.service.js` | assinatura, identidade de cobrança, tokenização |
| `asaas-webhook.service.js` | recebe evento, deduplica, aplica status |

Sem retry automático no client: são operações que movem dinheiro, e repetir um
POST cegamente cria cobrança duplicada.

## Webhook

O Asaas **não assina o corpo** como a Stripe. Ele manda um token estático no
header `asaas-access-token`, comparado em tempo constante contra
`ASAAS_WEBHOOK_TOKEN`. Sem token configurado a rota responde 500 — não passa
direto. `ASAAS_WEBHOOK_ALLOW_UNVERIFIED=true` libera só fora de produção.

Mapa de evento → `user_plans.status` em `ASAAS_PLAN_STATUS_BY_EVENT`.

### Contrato de status da resposta

O Asaas reentrega o evento até receber 200. Por isso:

| Situação | Resposta | Por quê |
|---|---|---|
| Evento aplicado | 200 | fim |
| Evento já processado | 200 + `meta.duplicated` | reentrega; não reprocessa |
| Evento sem efeito (`PAYMENT_CREATED`) | 200 + `meta.applied: false` | entendido, nada a fazer |
| Dono não encontrado | 200 + `meta.applied: false` | reentregar não vai achar o usuário |
| Token inválido | 400 | não é do Asaas |
| Falha de banco | 500 | aí sim queremos reentrega |

Devolver erro para evento que nunca vai funcionar prende a fila do Asaas em
loop infinito. Só erro **transitório** merece status de erro.

Idempotência: `findOrCreate` em `asaas_webhook_events` por `asaas_event_id`, e o
`asaas_processed_at` só é gravado depois de aplicar. Evento interrompido no meio
é reprocessado na reentrega, em vez de ficar marcado como pronto.

## Tolerância e suspensão

`src/services/plans/plan-suspension.js`, agendado por
`src/cron/planSuspensionJob.js` (diário, 01h, America/Sao_Paulo).

Mora fora do módulo Asaas porque a regra é de produto, não de gateway.

| Transição | Condição |
|---|---|
| `past_due` → `suspended` | passou `PLAN_GRACE_PERIOD_DAYS` (default 5) desde a marcação |
| qualquer → `expired` | `plan_canceled` e `plan_finish_at` já passou |

### Quem expira o quê

Convivem dois crons diários que olham plano cancelado, e a divisão importa:

| Cron | Horário | Age em | Faz |
|---|---|---|---|
| `planSuspensionJob.js` | 01h | qualquer provider | marca `status = 'expired'`, mantém a linha |
| `removeStripeExpiredPlansJob.js` | 00h | só legado (`provider` ≠ `asaas`, inclui `null`) | manda o e-mail antigo e **apaga** a linha |

O filtro por provider no job legado não é detalhe: ele roda uma hora antes e
destrói a linha, então sem a guarda o assinante Asaas era apagado antes de a
regra nova rodar — e recebia o e-mail de "Plano Removido" em vez do aviso de
expiração. `provider` nulo conta como legado, porque é linha de antes da coluna
existir.

### Cron em cluster

Produção roda PM2 com `exec_mode: "cluster"` e `instances: "max"`, e `main.js`
é carregado uma vez por vCPU. Os crons só são agendados no worker líder
(`src/cron/cron-leader.js`): `NODE_APP_INSTANCE` vazio ou `0`. Sem isso, cada
worker agendaria os mesmos jobs e o assinante receberia um e-mail por worker.

`CRON_ENABLED=false` desliga os crons do processo. Dois dos jobs também rodam
uma vez no boot, então eles disparam a cada `pm2 reload`, não só no horário.

## Avisos por e-mail

`src/services/plans/plan-notifications.js` + template
`src/views/planStatusNotice.hbs`.

O Asaas manda os avisos de **cobrança** dele. O que sai daqui são os avisos de
**acesso** — o assinante precisa saber que vai perder (ou perdeu) o produto, e
isso é regra nossa, não do gateway.

O checkout do site avisa que a cobrança também chega por e-mail, e o texto
atribui o envio ao Asaas de propósito: quem dispara é ele, por configuração no
painel dele. Se essas notificações forem desligadas lá, o aviso da tela precisa
sair junto — ou vira promessa que ninguém cumpre.

| Aviso | Disparado por | Quando |
|---|---|---|
| `past_due` | `asaas-webhook.service.js` | evento marcou a assinatura como vencida (leva o `invoiceUrl` da cobrança) |
| `suspended` | `plan-suspension.js` (cron) | acabou a tolerância |
| `expired` | `plan-suspension.js` (cron) | terminou o período já pago de um cancelamento |
| `canceled` | `asaas-subscription.service.js` | cancelamento confirmado (informa até quando o acesso vale) |

`buildPlanNotice` é puro (texto) e `sendPlanNotice` engole a falha de envio: os
chamadores são cron e webhook, e e-mail que não sai não pode derrubar a
suspensão nem fazer o Asaas reentregar o evento.

O nome que vai no e-mail é `plans.display_name`; `plan_name` é slug interno
(`pro_mensal`) e não é como o assinante chama o plano.

Data sem hora (`2026-10-07`, formato do Asaas) é formatada por regex, nunca por
`new Date`: o parse em UTC volta um dia no fuso do Brasil.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `ASAAS_API_KEY` | chave da conta; sem ela o módulo fica inerte |
| `ASAAS_ENV` | `sandbox` (default) \| `production` |
| `ASAAS_BASE_URL` | override opcional |
| `ASAAS_WEBHOOK_TOKEN` | token do header, mínimo 16 caracteres |
| `ASAAS_WEBHOOK_ALLOW_UNVERIFIED` | escape hatch de dev |
| `PLAN_GRACE_PERIOD_DAYS` | tolerância de inadimplência (default 5) |
| `ASAAS_TLS_INSECURE` | dev com antivírus/proxy fazendo inspeção HTTPS; ignorado em produção |
| `ASAAS_WEBHOOK_DEV_DOMAIN` | domínio estático do ngrok, para a URL do webhook não mudar |
| `ASAAS_WEBHOOK_DEV_URL` | URL do webhook em dev; escrita por `scripts/ngrok.js` |

## Desenvolvimento local

| Comando | O quê |
|---|---|
| `npm run dev` | Mailpit + túnel do webhook + API (nodemon) |
| `npm run asaas:check` | valida a chave e mostra conta e saldo (só GET) |
| `npm run ngrok:up` / `:down` / `:status` | túnel do webhook isolado |
| `npm run asaas:webhook -- PAYMENT_CONFIRMED --user=5 --plan=10` | simula evento do gateway contra a API local |

O boot da API imprime a URL do webhook do túnel ativo
(`src/utils/devWebhookNotice.js`), que é o endereço a cadastrar no painel. Túnel
ativo tem prioridade sobre `ASAAS_WEBHOOK_DEV_URL`: o valor do `.env` pode ser
de uma sessão antiga, e anunciar URL morta é pior que não anunciar.

Sem túnel (rede com inspeção HTTPS bloqueando o agente), `npm run asaas:webhook`
exercita o nosso lado — roteamento de status, idempotência e e-mails. O payload
é nosso, então isso **não** substitui o teste em sandbox: o que fica de fora é
justamente o que o gateway envia.

`DEV_SKIP_NGROK=true npm run dev` sobe sem túnel. Falha no túnel **não** derruba
o dev: quase nada em desenvolvimento depende de webhook, e travar o boot por
isso seria pior que avisar.

O saque do colaborador sai do **saldo da conta Asaas**, não do cartão do
assinante — em sandbox o saldo começa zerado, então testar saque exige gerar
saldo antes.

Antivírus com inspeção HTTPS (ex.: Avast Web Shield) reassina o TLS e quebra
tanto o client (`ASAAS_TLS_INSECURE` resolve) quanto o próprio agente do ngrok
(aí só liberando `*.ngrok-agent.com` no antivírus).

## Por que a Stripe continua viva

Assinatura de cartão **não é portável entre gateways** — você não tem o cartão
do assinante. A base antiga continua sendo cobrada pela Stripe até cada um
cancelar. Por isso o legado foi cercado, não removido, e planos com
`gateway = 'stripe'` são somente leitura no admin.

## Pendências

- Testar Pix e cartão ponta a ponta em sandbox (depende de `ASAAS_API_KEY`
  preenchida no ambiente local)
- Boleto que confirma dias depois: a tela de espera desiste em 5 minutos e joga
  o acompanhamento para o perfil — funciona, mas não avisa quando confirma
