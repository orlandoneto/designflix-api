# Contexto: Limite diário de downloads

Regra de produto: usuário **free** (ou sem plano pago) tem **N downloads por dia**  
(padrão **3**). O contador vive no **backend** — várias abas/sessões não burlar.

| Item | Caminho |
|------|---------|
| Regra / quota | `src/services/download/daily-download-limit.js` |
| Consumo no download | `src/services/downloadS3.service.js` (+ `.local`) |
| CRUD legado + `me` | `src/services/plans-download-limit.service.js` |
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
| Plano pago (`plan_name` sem `free`/`gratuito`) | **Ilimitado** |
| Plano free / sem `user_plans` | **Metered** — limite = `plans.count_downloads` se `> 0`, senão **3** |
| Contador ≥ limite no mesmo dia | **400** — não emite URL |

Reset: ao virar o dia civil após o `updated_at` do contador (meia-noite seguinte no servidor), o registro é apagado e a contagem recomeça.

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
  "skipped_reason": "paid_plan"
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

### Legado (manter, com guard de dono)

| Método | Rota | Nota |
|--------|------|------|
| GET/PUT/DELETE | `/user/plans/download-limits/:user_id` | só o próprio `user_id` (= JWT) |
| POST | `/user/plans/download-limits` | create manual |
| GET | `/user/plans/download-limits` | lista |

O **PUT** legado ainda incrementa, mas o front **não** deve mais usá-lo para liberar download — o consumo oficial é o `/signed/url`.

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
