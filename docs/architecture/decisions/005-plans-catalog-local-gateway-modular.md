# ADR-005 — Catálogo de planos local e gateway como módulo isolado

## Status

Aceito.

## Contexto

O catálogo vivia na Stripe: `plans.stripe_price_id` era um ponteiro e o preço só
existia lá. Alterar preço exigia mexer no painel da Stripe, e o front carregava
`price_...` hardcoded.

Dois fatos mudaram o desenho:

1. A Stripe exige CNPJ para contas que operam como marketplace (Connect), e a
   operação hoje é CPF. O gateway de assinatura passou a ser o **Asaas**.
2. O Asaas **não tem catálogo remoto**. `POST /v3/subscriptions` recebe `value`
   e `cycle` no corpo — não existe objeto "plano" para consultar.

Além disso, assinatura de cartão não é portável entre gateways: a base já
existente continua sendo cobrada pela Stripe até cada assinante cancelar.

## Decisão

- **A tabela `plans` é a fonte de verdade do preço.** O gateway é espelho.
- **Sem rota de sincronizar.** Criar plano é `INSERT` local.
- **`user_plans` ganha `status` e `provider`** e permanece agnóstico de gateway.
- **Cada gateway é um módulo com tabelas próprias.** O Asaas usa
  `asaas_subscriptions` e `asaas_webhook_events` em vez de empilhar colunas na
  tabela compartilhada.
- **O legado é cercado, não reescrito.** O código Stripe move-se para
  `payments/gateways/stripe/` sem alteração interna; planos com
  `gateway = 'stripe'` são somente leitura no admin.
- **O contrato público não cita gateway.** O site faz checkout por `plans.id`.

Doc de domínio: [../../contextos/plans.md](../../contextos/plans.md).

## Motivo

- Ler preço vira uma query, não uma chamada de rede
- Admin altera preço sem deploy e sem tocar em painel de terceiro
- Trocar de gateway não muda o contrato do front (foi o que barateou o pivô)
- Refatorar código de dinheiro sem teste é risco puro; cercar é seguro
- Somar gateway novo = tabela nova, não migration na tabela compartilhada

## Consequências

- `plans.stripe_price_id` fica nullable e vira legado
- O gate de download passa a ler `user_plans.status`; antes um inadimplente
  mantinha download ilimitado até um cron apagar a linha
- `past_due` mantém acesso de propósito — quem corta é o job de suspensão
- Sem catálogo remoto, o preço de uma assinatura **já criada** não muda ao editar
  o plano; alterações valem para novas assinaturas (ou exigem `PUT` no Asaas)
- O Asaas não tem billing portal hospedado: as telas de gerenciamento passam a
  ser responsabilidade do site
