# Ganhos do colaborador (comissões e saldo)

Quanto o dono de um arquivo recebe quando alguém baixa, e como esse dinheiro
chega ao saque.

Código:

| O quê | Onde |
|-------|------|
| Regras puras (matemática, guardas) | `src/services/contributor/contributor-earnings-rules.js` |
| Consulta / envelope | `src/services/user-commissions.service.js` |
| Rotas | `src/controller/user-commissions.controller.js` |
| Crédito no download | `src/services/user-downloads.services.js` (`createOrUpdateDownload`) |
| Incremento de carteira | `src/services/user.service.js` (`_updateBalance`) |
| Regras de saque (puras) | `src/services/payouts/payout-rules.js` |
| Saque (Pix via Asaas) | `src/services/user-payouts.service.js` |
| Rotas de saque | `src/controller/user-payouts.controller.js` |

## Valores do produto

Fonte única: `PALN_COMMISSION` em `src/utils/constants/constants.js`.

| Regra | Valor |
|-------|-------|
| Comissão por download | R$ 0,30 |
| Mínimo para solicitar saque | R$ 100,00 |
| Saques por mês | 1 |

## Três valores de dinheiro que não são sinônimos

Confundir os três num campo só foi a causa de o painel mostrar zero.

| Campo | Significado | Diminui? |
|-------|-------------|----------|
| `totalGeneral` | Histórico bruto de comissões | Nunca |
| `balance` | Carteira atual (`user.balance`) | Sim, ao sacar |
| `availableBalance` | Sacável agora — **0 abaixo do mínimo** | Sim |

`user_commissions` é o **livro-caixa** (verdade) e `user.balance` é o **cache**
que o saque consulta. Por isso a comissão é gravada antes do incremento de
saldo: se o cache falhar, o ledger ainda permite reconciliar. O contrário
deixaria saldo sacável sem lastro.

## Como a comissão nasce

`POST /user/downloads/increment` recebe:

```json
{ "user_id": 5, "contributor_image_user_id": 9, "user_main_grid_id": 77 }
```

`user_id` é **quem baixou**; `contributor_image_user_id` é **quem recebe**.
Confundir os dois foi o bug corrigido: o saldo ia para o downloader enquanto a
linha de comissão ia para o colaborador, e os dois divergiam.

Ordem de execução:

1. `UserDownloads.findOrCreate` — registra/incrementa o download
2. `_createCommission(contributorId, { downloaderUserId })` — grava R$ 0,30 `pending`
3. `_updateBalance(contributorId)` — incrementa a carteira

### Auto-download não gera comissão

Se `user_id === contributor_image_user_id`, o download é registrado e a
comissão é **pulada** (`skipped: true`, resposta 201). Sem essa trava o
colaborador baixa o próprio arquivo em loop e saca dinheiro que ninguém pagou.

`_updateBalance` também **nunca cria usuário**: id sem cadastro é erro do
chamador, e inventar a linha faria dinheiro parar numa conta que ninguém opera.

## Rotas

### `GET /user-commissions/:userId`

Auth: `user`. Resumo de ganhos do painel do colaborador.

| Status | Quando |
|--------|--------|
| 200 | Sucesso (colaborador sem comissão volta zerado) |
| 400 | `userId` inválido |
| 404 | Usuário não existe |
| 500 | Erro interno (mensagem genérica) |

```json
{
  "success": true,
  "message": "Ganhos do colaborador",
  "data": {
    "balance": 12.6,
    "availableBalance": 0,
    "missingForPayout": 87.4,
    "canRequestPayout": false,
    "payoutMinimum": 100,
    "commissionPerDownload": 0.3,
    "totalGeneral": 12.6,
    "today": { "total": 0.6, "downloads": 2 },
    "last7Days": { "total": 3, "downloads": 10 },
    "last30Days": { "total": 12.6, "downloads": 42 },
    "commissionsLast30Days": [{ "amount": "0.30", "created_at": "…" }],
    "commissionsLast30DaysCount": 42
  }
}
```

Os períodos são **objeto** (`{ total, downloads }`), não número. O front lê
`.total` para dinheiro e `.downloads` para contagem.

`missingForPayout` existe para a tela dizer *quanto falta* em vez de só exibir
`availableBalance: 0` sem explicação.

### `POST /user-commissions/create/:userId`

Auth: `user`. Criação manual de comissão (sem contexto de download, então sem
trava de auto-download). Responde **200** com envelope — antes respondia 201.

## Saque (Pix via Asaas)

### `POST /request-payout`

Auth: `user`. Corpo: `{ "amount": 150 }` — valor em reais.

O `userId` vem **do token** (`req.params.userId`, injetado pelo middleware).
Antes vinha de `req.body.userId`, o que deixava qualquer autenticado sacar a
carteira de outro.

| Status | Quando |
|--------|--------|
| 200 | Transferência criada no Asaas e comissões quitadas |
| 400 | Valor inválido, abaixo do mínimo, saldo insuficiente, saque já feito no mês, sem chave Pix, ou recusa do Asaas |
| 404 | Usuário não existe |
| 500 | Erro interno — inclui Asaas sem chave de API configurada |

```json
{
  "success": true,
  "message": "Saque de R$ 150,00 enviado via Pix.",
  "data": {
    "payoutId": 12,
    "amount": 150,
    "status": "paid",
    "paidAt": "2026-09-08T12:00:00.000Z",
    "balance": 0,
    "transferId": "tra_000001",
    "transferStatus": "PENDING",
    "settledCommissions": 500,
    "settledTotal": 150
  }
}
```

### Ordem que fecha o ciclo

1. Valida (`validatePayoutRequest`): valor, mínimo, saldo, um saque por mês, chave Pix
2. `POST /v3/transfers` no Asaas (`operationType: PIX`)
3. Grava `user_payouts` com `status: paid`
4. Promove comissões `pending` → `paid` da mais antiga para a mais nova
5. Debita `user.balance` e grava `last_payout`

**Nada é escrito antes da transferência.** Transfer que falha não pode consumir
saldo nem quitar comissão — o colaborador ficaria sem dinheiro e sem ledger.

Comissão é indivisível: a linha que estoura o valor sacado continua `pending`
para o saque seguinte, em vez de virar quitação parcial impossível de
reconciliar.

### Taxa

Zero. A taxa de 1,49% + R$ 0,25 era da Stripe e foi embora com ela;
`PAYOUT_FEE_REAIS` fica como gancho caso o Asaas passe a cobrar.

### `POST /user/:userId/update-payout-method`

Auth: `user`. Só cadastra a chave Pix (`{ "pixKey": "..." }`) — com Pix não há
método a escolher no gateway. O `:userId` da URL é decorativo: o middleware o
sobrescreve com o id do token.

## Consumo no front

`designflix-next-new/features/contributor/api.ts`:

| Card do painel | Campo |
|----------------|-------|
| Ganhos acumulados | `totalGeneral` |
| Disponível | `balance` (+ legenda com `missingForPayout`) |
| Hoje / 7 dias / 30 dias | `today.total`, `last7Days.total`, `last30Days.total` |

## Pendências

- **"Aguardando revisão"** — não existe status nativo de revisão; o painel
  aproxima por `activite` truthy.
- **Extrato de saques** — não há `GET` de histórico; `user_payouts` só é
  escrito. O painel mostra saldo, não a lista de saques.
- **Sobra de arredondamento** — quando as comissões não fecham o valor sacado, a
  última fica `pending` e o saldo cai pelo valor cheio. É conservador (nunca
  quita o que não foi pago), mas `sum(comissões paid) <= sum(saques)`.
- **Confirmação da transferência** — a resposta do Asaas costuma vir `PENDING`
  e não há webhook de `TRANSFER_*` tratado. O saque já nasce `paid` do nosso
  lado; transferência recusada depois disso é reconciliação manual.
