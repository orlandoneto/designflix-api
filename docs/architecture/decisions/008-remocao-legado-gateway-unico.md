# ADR 008 — Mercado Pago fora, Stripe contida, superfície morta removida

Status: **Aceito** · Data: 2026-09-08

## Contexto

Depois da migração para o Asaas ([ADR 005](./005-plans-catalog-local-gateway-modular.md)),
o código carregava **três** gateways: Asaas (novo), Stripe (base antiga) e
Mercado Pago (Pix legado). Levantamento cruzando as rotas do `main.js` com o que
site e admin realmente chamam encontrou **32 endpoints sem nenhum consumidor**,
incluindo os quatro do Mercado Pago.

Consulta ao banco antes de decidir:

- `user_plans` — **zero** linhas
- `mercadopago_customer_id` preenchido — **zero**
- `stripe_customer_id` preenchido — **zero**
- `user_pix_payment_mercadopago` — **zero** linhas

Ou seja: nenhum assinante em nenhum gateway. Não havia migração de dados a
fazer nem cobrança viva para quebrar.

Dois achados agravaram o quadro:

- `GET /user-plan-all` listava todos os planos **sem autenticação**
- `PUT /user/plans/download-limits/:user_id` **incrementava** o contador diário,
  permitindo queimar quota fora do caminho oficial (`GET /signed/url`)

## Decisão

1. **Mercado Pago sai por completo** — 4 rotas, `paymentMercadopago.service.js`,
   `config/mercadopago.js`, o model `user_pix_payment_mercado_pago.js`, o cron
   `upgradeMercadopagoPlansJob.js` e a dependência `mercadopago`.
2. **Stripe continua como módulo isolado**: `paymentStripe.service.js` fica
   íntegro, mas só três rotas seguem registradas — as que têm consumidor.
3. **Rotas sem chamador são removidas**, não marcadas como deprecated. Onde só
   parte do controller morreu (parceiros, quota de download, grid), sobrou
   exatamente o que o front chama.
4. `paymentStripe.service.js` não é refatorado nem enxugado: método sem rota
   continua lá. A Stripe é um caminho dormente, não um caminho em manutenção.

## Motivo

- **Três gateways = três superfícies para manter em sincronia** e auditar. Com
  banco vazio, o custo de remover era o menor que ia existir.
- **Deprecated não protege** endpoint que ninguém chama: só mantém código sem
  teste e sem dono no caminho de request.
- **Stripe íntegra, mas desligada:** o pedido do produto é poder voltar à Stripe
  sem começar do zero. Isso exige o serviço preservado — não as rotas expostas.
- **`/user-plan-grouped/:id` mora no serviço da Stripe e não pode sair:** é o que
  alimenta o `useUserData` e o checkout Asaas no site. A herança é histórica; o
  endpoint hoje lê `user_plans`, que é agnóstico de gateway.

## Consequências

- Superfície pública caiu para 124 rotas registradas; 440 testes seguem verdes.
- A tabela `user_pix_payment_mercadopago` e a coluna
  `user_plans.mercadopago_customer_id` **permanecem** no banco. Sem migração de
  drop: são vazias, inertes, e derrubar coluna é irreversível sem backup.
- `mercadopago` continua no `provider` de `user_plans` como valor histórico
  possível — nada escreve mais esse valor.
- **Pendência aberta:** `POST /stripe/webhook` segue registrado e **não valida
  assinatura** — `STRIPE_WEBHOOK_SECRET` existe no `.env` e não é lido por
  `handleWebhook`. Enquanto a Stripe estiver dormente o risco é baixo, mas a
  rota é pública e precisa de `constructEvent` antes de qualquer reativação.
- O middleware `verifyWebhook.js` (captura de raw body, pré-requisito dessa
  validação) foi removido junto: importava `raw-body`, que nem é dependência
  direta. Reativar a Stripe implica reescrever essa captura com `express.raw()`.
