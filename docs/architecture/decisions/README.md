# Architecture Decision Records (ADR)

Registros do **porquê** de decisões estruturais.

| Doc de domínio (`docs/contextos/`) | ADR |
|------------------------------------|-----|
| Como o sistema funciona **hoje** | Por que construímos **assim** |

## Índice

| ID | Título | Status |
|----|--------|--------|
| [001](./001-express-api.md) | API em Express (não Nest) | Aceito |
| [002](./002-nextjs-frontends.md) | Dois fronts Next (site + admin) | Aceito |
| [003](./003-storage-signed-url.md) | Storage + Signed URL | Aceito |
| [004](./004-download-daily-limit-backend.md) | Limite diário de download no backend | Aceito |

## Quando criar um ADR

- Nova peça de infra (fila, busca, storage, auth)
- Mudança que inviabiliza o caminho anterior
- Trade-off importante (MVP free vs paid managed)

Formato mínimo: **Contexto → Decisão → Motivo → Consequências**.
