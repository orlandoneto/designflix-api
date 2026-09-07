# ADR-004 — Limite diário de download no backend

## Status

Aceito.

## Contexto

Plano free: N downloads/dia (padrão 3). Se a checagem ficar só no front, o usuário abre outra sessão/browser e burla.

## Decisão

- Contador em `plans_download_limits` (MySQL)
- Consumo atômico em `GET /signed/url` (JWT `userId`)
- Planos free/sem plano pago: metered; pago e `partner_code`: ilimitado
- Consulta sem consumir: `GET /user/plans/download-limits/me`

Doc de domínio: [../../contextos/download-daily-limit.md](../../contextos/download-daily-limit.md).

## Motivo

- Segurança da regra de negócio
- Reaproveitar tabela legada (sem grid nova)
- Mesmo caminho local e S3

## Consequências

- Front trata 400 “limite de downloads diários”; não incrementa contador na UI
- `plans.count_downloads` no free deve refletir o produto (ex.: 3)
- Status **400** (padrão do projeto), não 429 — alinhar envelope existente
