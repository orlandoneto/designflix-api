# Contexto: Limite diário de downloads

Regra de produto: usuário **free** (ou sem plano pago) tem **N downloads por dia**  
(padrão **3**). O contador vive no **backend** — várias abas/sessões não burlar.

| Item | Caminho |
|------|---------|
| Regra / quota | `src/services/download/daily-download-limit.js` |
| Consumo no download | `src/services/downloadS3.service.js` (+ `.local`) |
| Consulta `me` | `src/services/plans-download-limit.service.js` |
| Controller | `src/controller/plans-download-limit.controller.js` |
| Tabela | `plans_download_limits` |
| Limite do plano | `plans.count_downloads` (planos free) |
| Respostas | `src/utils/httpResponse.js` |
| ADR (por quê) | [../architecture/decisions/004-download-daily-limit-backend.md](../architecture/decisions/004-download-daily-limit-backend.md) |
| Signed URL (ADR) | [../architecture/decisions/003-storage-signed-url.md](../architecture/decisions/003-storage-signed-url.md) |

**Última revisão:** set/2026 — enforço em `GET /signed/url` (JWT).

---

## Por que no backend

Se a checagem ficar só no front, o usuário abre outro browser/sessão e baixa de novo.  
O contador é por `user_id` autenticado (JWT → `req.params.userId`), não por cookie de UI.

---

## Quem é limitado

| Caso | Comportamento |
|------|----------------|
| `user.partner_code` preenchido | **Ilimitado** (não consome) |
| Plano pago sem `plans.monthly_download_cap` | **Ilimitado** |
| Plano pago com teto | **Metered no mês** — limite = `plans.monthly_download_cap` |
| Plano free / sem `user_plans` | **Metered no dia** — limite = `plans.count_downloads` se `> 0`, senão **3** |
| Contador ≥ limite da janela | **400** — não emite URL |

Reset diário: ao virar o dia civil após o `updated_at` do contador (meia-noite
seguinte no servidor), `current_count_downloads` é **zerado**. A linha não é mais
apagada porque o contador mensal mora nela — apagar daria teto novo todo dia.

Reset mensal: `monthly_period` guarda a janela (`YYYY-MM`). Contador de outra
janela vale zero, então a virada do mês não precisa de job.

O teto mensal existe porque plano pago é ilimitado por dia e a comissão de
R$ 0,30 por download (`colaborador-ganhos.md`) inverte a margem por volta de 97
downloads num plano de R$ 29. Detalhe da regra em `plans.md`.

---

## Rotas

### `GET /signed/url?key=` — canônico (consome)

Auth: Bearer **user**.

1. Valida `key`
2. `assertAndConsumeDailyDownload(userId)` — incrementa se permitido
3. Só então gera URL pré-assinada (S3) ou URL local

| Status | `message` | Notas |
|--------|-----------|--------|
| **200** | `URL gerada com sucesso` | `data.url` + `data.quota` |
| **400** | `Parâmetro key é obrigatório` / `Você usou o limite de downloads diários` | |
| **401** | token | middleware |
| **404** | `Usuário não encontrado` | raro |
| **500** | `Erro ao gerar URL…` | |

```json
{
  "success": true,
  "message": "URL gerada com sucesso",
  "data": {
    "url": "https://…",
    "quota": {
      "used": 2,
      "limit": 3,
      "remaining": 1,
      "unlimited": false,
      "period": "day",
      "skipped_reason": null
    }
  }
}
```

Quota ilimitada (pago/partner):

```json
{
  "used": 0,
  "limit": null,
  "remaining": null,
  "unlimited": true,
  "period": null,
  "skipped_reason": "paid_plan"
}
```

Plano pago com teto mensal (`period` muda a leitura do mesmo par de números):

```json
{
  "used": 40,
  "limit": 90,
  "remaining": 50,
  "unlimited": false,
  "period": "month",
  "plan_status": "active"
}
```

### `GET /user/plans/download-limits/me` — só consulta

Não incrementa. Mesmo shape de `quota` em `data`.

| Status | Quando |
|--------|--------|
| **200** | sempre que user ok |
| **400** | user inválido |
| **404** | user não encontrado |
| **500** | erro interno |

### CRUD legado — removido

O CRUD manual (`POST`/`GET` da coleção e `GET`/`PUT`/`DELETE` por `:user_id`) foi
removido: nenhum front chamava e o **PUT** ainda incrementava o contador, o que
permitia queimar quota fora do fluxo oficial. O consumo é só `/signed/url`.

---

## Front

| Peça | Papel |
|------|--------|
| `features/download/signedUrl.ts` | chama `/signed/url`, trata 400 |
| `views/Download/index.tsx` / `ModalDownload` | baixa via signed URL; alert/toast se limite |
| `GET …/me` | opcional (UI “X de 3 hoje”) |

**Não** incrementar contador no front antes do download.  
**Não** apagar contador no front para “reset” — o back reseta sozinho.

---

## Ops / dados

- Planos free no MySQL: preferir `count_downloads = 3` (alinhado ao marketing).
- Seeder antigo pode ter `1` — a API usa o valor do banco quando `> 0`.
- Constante de fallback: `DEFAULT_FREE_DAILY_LIMIT = 3` em `daily-download-limit.js`.

---

## Testes

`tests/download/daily-download-limit.test.js` — helpers, partner/pago bypass, consume, bloqueio, create na 1ª vez, get sem consumir.
