# ADR-006 — Troca de plano sem pró-rata e teto mensal no plano pago

## Status

Aceito.

## Contexto

Com o catálogo local e o Asaas no lugar ([ADR-005](./005-plans-catalog-local-gateway-modular.md)),
sobraram duas lacunas que o assinante sentia direto:

1. **Trocar de plano exigia cancelar antes.** `POST /asaas/subscriptions` recusa
   quem já tem assinatura ativa (evita cobrança dupla), então subir de Pro para
   Studio significava cancelar, esperar o período pago terminar e assinar de
   novo. Suporte manual em cada upgrade — no fluxo que mais gera receita.
2. **Plano pago era ilimitado.** Cada download paga R$ 0,30 de comissão ao
   colaborador (`docs/contextos/colaborador-ganhos.md`). Num plano de R$ 29 a
   margem inverte por volta de 97 downloads no mês, e um único assinante
   intensivo consumia o resultado de vários.

O Asaas não oferece cálculo proporcional em troca de assinatura, e não temos
emissão de crédito.

## Decisão

**Troca de plano** (`PUT /asaas/subscriptions/me/plan`):

- Sem pró-rata. Cancela a recorrência atual, cria a do plano novo com vencimento
  hoje.
- **O direito de acesso não muda no request.** `user_plans.plan_id` e `status`
  ficam no plano antigo; quem efetiva a troca é o webhook, no primeiro evento de
  pagamento confirmado do plano novo (`plan_id` vem do `externalReference`).
- Cancela antes de criar, e não o contrário.
- `validatePlanChange` (regra pura em `plans-rules.js`) classifica em
  `upgrade` / `downgrade` / `lateral` e recusa destino inativo, gratuito, de
  outro gateway ou igual ao atual.

**Teto mensal** (`plans.monthly_download_cap`):

- Nulo = ilimitado, que é o comportamento histórico. O teto é opcional por plano.
- Contador mensal (`monthly_count_downloads` + `monthly_period`) mora na mesma
  linha de `plans_download_limits` que o contador diário.
- Estourar o teto devolve 400 e libera na virada do mês. Não suspende, não cobra
  excedente.

## Motivo

- **Acesso preservado na troca:** quem clica em trocar já pagou o mês corrente.
  Mover o `plan_id` na hora tiraria o que foi pago e, se o Pix novo nunca fosse
  pago, o assinante ficaria sem plano nenhum tendo pagado.
- **Cancelar antes de criar** troca um risco por outro, e escolhe o menor: duas
  recorrências vivas cobram duas vezes (dinheiro do cliente), enquanto ficar sem
  recorrência é recuperável — no erro, o service grava `plan_canceled` +
  `plan_finish_at` e o acesso termina no fim do período já pago.
- **Sem pró-rata** porque proporcional exigiria crédito manual e conciliação;
  no ticket médio atual isso custa mais que o benefício.
- **Teto opcional** em vez de global: a régua certa depende do preço, e um
  número no código viraria mentira no primeiro plano novo.
- **Contador na mesma linha** evita segunda tabela para o mesmo fato ("quantos
  downloads esse usuário fez").
- **Bloquear, não cobrar excedente:** cobrança variável exigiria fatura avulsa e
  muda a promessa de preço fixo do plano.

## Consequências

- O reset diário passou a **zerar** `current_count_downloads` em vez de apagar a
  linha — apagar levaria o contador mensal junto e daria teto novo todo dia.
- A quota exposta ao front ganhou `period` (`day` \| `month`): sem isso o mesmo
  "2 de 3" significaria coisas diferentes para free e assinante com teto.
- A troca de plano fica **pendente** entre o request e o pagamento. O site avisa
  isso na tela de troca; sem o aviso, o assinante acha que o upgrade falhou.
- Se o pagamento do plano novo nunca entrar, o assinante continua no plano antigo
  mas **sem recorrência ativa** — o acesso termina no fim do período pago.
- Downgrade não devolve dinheiro; o valor menor vale da próxima cobrança em
  diante.
- Plano legado da Stripe não entra na troca automática: o endpoint exige
  assinatura Asaas ativa, e o site manda cancelar pelo portal antigo.
