# ADR 007 — Saque do colaborador em Pix pelo Asaas, quitando o ledger

Status: **Aceito** · Data: 2026-09-08

## Contexto

O saque chamava `stripeModule.makeTransfer` com `stripe_account_id`, ou seja,
dependia de Stripe Connect: o colaborador precisaria ter conta conectada, o que
nunca foi cadastrado no produto. Na prática o endpoint não pagava ninguém.

Além disso:

- `req.body.userId` decidia de quem era o saldo — qualquer autenticado podia
  sacar a carteira de outro
- a resposta referenciava uma variável `transfer` inexistente
- toda comissão nascia `pending` em `user_commissions` e **nada** promovia para
  `paid`: o mesmo dinheiro podia ser sacado de novo no mês seguinte
- a taxa embutida (1,49% + R$ 0,25) era da Stripe

Assinatura já tinha migrado para o Asaas (ver
[ADR 005](./005-plans-catalog-local-gateway-modular.md)).

## Decisão

1. Saque vira **Pix** por `POST /v3/transfers` do Asaas, destino = `chave_pix`
   do próprio usuário. Sem conta conectada, sem onboarding de gateway.
2. O dono do saque vem **do token**, nunca do corpo.
3. O saque é o ponto que fecha o ciclo do ledger: promove comissões `pending`
   para `paid`, da mais antiga para a mais nova, até o valor pago.
4. Comissão é **indivisível** — a linha que estoura o valor sacado continua
   `pending` para o próximo saque.
5. Nenhuma escrita acontece antes da transferência retornar.
6. Taxa zero (`PAYOUT_FEE_REAIS = 0`), mantida como gancho.

## Motivo

- **Pix em vez de Connect:** o produto paga pessoa física brasileira; a chave
  Pix já estava no cadastro e o Asaas transfere direto.
- **Ledger antes do cache:** `user_commissions` é a verdade e `user.balance` é
  cache. Sem transição `pending → paid` o cache podia ser recarregado por
  qualquer recálculo e pagar duas vezes o mesmo download.
- **Quitação parcial não existe:** meia comissão paga é impossível de
  reconciliar contra o extrato do Asaas depois.
- **Ordem transferência → escrita:** o erro caro é debitar saldo e quitar
  comissão de um Pix que não saiu. O inverso (Pix que saiu sem registro) não
  acontece porque a resposta do Asaas é aguardada antes de gravar.

## Consequências

- Colaborador sem chave Pix cadastrada não saca; a recusa é 400 com a
  instrução, e a chave é editada no perfil do site.
- O saque nasce `paid` do nosso lado mesmo com a transferência ainda `PENDING`
  no Asaas: não há webhook de `TRANSFER_*` tratado, então recusa posterior é
  reconciliação manual. Ficou como pendência em
  [colaborador-ganhos.md](../../contextos/colaborador-ganhos.md).
- Stripe Connect sai do caminho do saque; a Stripe segue viva só para cobrar a
  base antiga de assinantes.
- A regra de um saque por mês passou a comparar mês **e** ano — só o mês fazia
  setembro/2025 bloquear setembro/2026.
