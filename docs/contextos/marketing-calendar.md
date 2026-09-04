# Contexto: Calendário do Marketing

Datas comerciais na home. Clique no evento abre o **Explorer** filtrado pela `categorySlug` (query `niche`).

| Item | Caminho |
|------|---------|
| Controller | `src/controller/marketing-calendar.controller.js` |
| Service | `src/services/marketing-calendar.service.js` |
| Regras | `src/services/marketing-calendar/marketing-calendar-rules.js` |
| Model | `src/models/marketing_calendar_event.js` |
| Migration | `migrations/20260904180000-marketing-calendar-event.js` |
| Respostas | `src/utils/httpResponse.js` |

**Última revisão:** set/2026 — admin lista com `pagination` (`page`/`limit`), status 200/400/404/500.

---

## Modelo

```
marketing_calendar_event
  title, event_date (DATEONLY)
  icon (emoji), badge (opcional: "Mais buscado")
  category_slug  →  Explorer: /explorar?niche={category_slug}
  sort_order, active
```

**Regra de navegação:** clique em “Dia dos Pais” → `/explorar?niche=dia-dos-pais` (catálogo filtra por slug de categoria).

---

## Público

### `GET /marketing-calendar`

Query: `limit` (default 8, máx 120). Só `active=true`, ordenado por `sort_order`, `event_date`.

Seed canônico: Datas Comemorativas 2026 em `src/services/marketing-calendar/seed-datas-comemorativas.js` (migration `20260904193000-…`).


| Status | `message` |
|--------|-----------|
| **200** | `Calendário carregado` |
| **500** | `Erro ao carregar o calendário` |

```json
{
  "success": true,
  "message": "Calendário carregado",
  "data": [
    {
      "id": 2,
      "title": "Dia dos Pais",
      "eventDate": "2026-08-09",
      "icon": "👨‍👧‍👦",
      "badge": "Mais buscado",
      "categorySlug": "dia-dos-pais",
      "sortOrder": 20,
      "active": true
    }
  ],
  "meta": { "total": 8, "limit": 8 }
}
```

---

## Admin

Auth: **admin** / **super_admin**.

| Método | Rota |
|--------|------|
| GET | `/admin/marketing-calendar` |
| POST | `/admin/marketing-calendar` |
| PUT | `/admin/marketing-calendar/:id` |
| DELETE | `/admin/marketing-calendar/:id` |

### `GET /admin/marketing-calendar`

Query:

| Param | Default | Notas |
|-------|---------|-------|
| `page` | `1` | inteiro ≥ 1 |
| `limit` | `10` | inteiro ≥ 1, máx `50` |
| `active` | — | `1` lista só ativos |

```json
{
  "success": true,
  "message": "Eventos listados",
  "data": [ { "id": 1, "title": "Dia dos Pais" } ],
  "pagination": { "page": 1, "limit": 10, "total": 47, "totalPages": 5 },
  "meta": { "total": 47, "page": 1, "limit": 10 }
}
```

### Body create/update

```json
{
  "title": "Dia dos Pais",
  "eventDate": "2026-08-09",
  "icon": "👨‍👧‍👦",
  "badge": "Mais buscado",
  "categorySlug": "dia-dos-pais",
  "sortOrder": 20,
  "active": true
}
```

`categorySlug` é normalizado (slug). Se omitido no create, deriva do `title`.

| Status | Quando |
|--------|--------|
| **200** | OK |
| **400** | validação |
| **404** | id inexistente |
| **500** | erro interno |

---

## Front

- Site: `designflix-next-new` → `HomeMarketingCalendar` + `features/marketing-calendar/api.ts`
- Admin: `designflix-admin` → `/calendar`
