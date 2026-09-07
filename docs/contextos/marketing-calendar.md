# Contexto: Calendário do Marketing

Datas comerciais na home. Clique no evento abre o **Explorer** filtrado pela `categorySlug` (query `niche`).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/marketing-calendar.controller.js` |
| Service | `src/services/marketing-calendar.service.js` |
| Catálogo recorrente | `src/services/marketing-calendar/marketing-calendar-catalog.js` |
| Materializar ano | `src/services/marketing-calendar/marketing-calendar-materialize.js` |
| Matemática (Páscoa / N-ésimo dia) | `src/services/marketing-calendar/marketing-calendar-date-math.js` |
| Regras / janela pública | `src/services/marketing-calendar/marketing-calendar-rules.js` |
| Model | `src/models/marketing_calendar_event.js` |
| Migration | `migrations/20260904180000-marketing-calendar-event.js` |
| Reseed catálogo | `migrations/20260907140000-marketing-calendar-regenerate-catalog.js` |
| Campanha de período (`end_date`) | `migrations/20260907150000-marketing-calendar-end-date.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — catálogo recorrente + `end_date` (campanha de mês) + `relativeLabel` + admin regenerate / filtro year-month.

---

## Modelo

```
marketing_calendar_event
  title, event_date (DATEONLY)   ← data materializada do ano
  end_date (DATEONLY, null)      ← fim da campanha de período
  icon (emoji), badge (opcional: "Mais buscado")
  category_slug  →  Explorer: /explorar?niche={category_slug}
  sort_order, active
```

**Fonte da verdade:** templates em `marketing-calendar-catalog.js` com regras:

| `rule` | Exemplo |
|--------|---------|
| `fixed` | Natal = 25/12 |
| `month_span` | Setembro Amarelo = 01/09 → 30/09 |
| `nth_weekday` | Dia das Mães = 2º domingo de maio |
| `easter_offset` | Carnaval = Páscoa − 47 |

`durationDays` transforma uma data fixa em período curto.

Admin/migration **regeneram** o ano → linhas DATEONLY. Home continua filtrando a janela.

**Regra de navegação:** clique em “Dia dos Pais” → `/explorar?niche=dia-dos-pais`.

---

## Público

### `GET /marketing-calendar`

A seção **Calendário do Marketing** na home destaca as **datas/categorias próximas** (semana/mês).

Query:

| Param | Default | Notas |
|-------|---------|-------|
| `limit` | `8` | inteiro ≥ 1, máx `120` |
| `daysAhead` | `45` | janela em dias a partir de **hoje** (`America/Sao_Paulo`), máx `365` |

Filtro: `active=true` **e** (`event_date` entre hoje e hoje+daysAhead **ou** campanha em andamento: `event_date < hoje` e `end_date >= hoje`).  
Ordem: `event_date` ASC.

Cada item inclui `relativeLabel`: `HOJE` \| `Amanhã` \| `Próximos dias` \| `null` (além do `badge` comercial).  
Campanha de período cujo intervalo contém hoje também recebe `HOJE`.

| Status | `message` |
|--------|-----------|
| **200** | `Calendário carregado` |
| **400** | `limit` / `daysAhead` inválido |
| **500** | `Erro ao carregar o calendário` |

```json
{
  "success": true,
  "message": "Calendário carregado",
  "data": [
    {
      "id": 2,
      "title": "Independência do Brasil",
      "eventDate": "2026-09-07",
      "endDate": null,
      "icon": "🇧🇷",
      "badge": null,
      "relativeLabel": "HOJE",
      "categorySlug": "independencia-do-brasil",
      "sortOrder": 20,
      "active": true
    }
  ],
  "meta": {
    "total": 8,
    "limit": 8,
    "from": "2026-09-07",
    "to": "2026-10-22",
    "daysAhead": 45
  }
}
```

---

## Admin

Auth: **admin** / **super_admin**.

| Método | Rota |
|--------|------|
| GET | `/admin/marketing-calendar` |
| POST | `/admin/marketing-calendar/regenerate` |
| POST | `/admin/marketing-calendar` |
| PUT | `/admin/marketing-calendar/:id` |
| DELETE | `/admin/marketing-calendar/:id` |

### `GET /admin/marketing-calendar`

| Param | Default | Notas |
|-------|---------|-------|
| `page` | `1` | ≥ 1 |
| `limit` | `10` | máx `100` |
| `year` | — | 2000–2100 |
| `month` | — | 1–12 (exige `year`) |
| `active` | — | `1` = só ativos |

### `POST /admin/marketing-calendar/regenerate`

Body: `{ "year": 2026 }`  
Substitui **toda** a tabela pelo catálogo materializado daquele ano.

```json
{
  "success": true,
  "message": "Catálogo regenerado para 2026",
  "data": { "year": 2026, "total": 88, "catalogSize": 88 }
}
```

### Body create/update

`endDate` é opcional e precisa ser ≥ `eventDate` (senão **400**).

```json
{
  "title": "Dia dos Pais",
  "eventDate": "2026-08-09",
  "endDate": null,
  "icon": "👨‍👧‍👦",
  "badge": "Mais buscado",
  "categorySlug": "dia-dos-pais",
  "sortOrder": 20,
  "active": true
}
```

| Status | Quando |
|--------|--------|
| **200** | OK |
| **400** | validação |
| **404** | id inexistente |
| **500** | erro interno |

---

## Front

- Site: `designflix-next-new` → `HomeMarketingCalendar` + `features/marketing-calendar/api.ts`
- Admin: `designflix-admin` → `/calendar` (filtro ano/mês + regenerar)
