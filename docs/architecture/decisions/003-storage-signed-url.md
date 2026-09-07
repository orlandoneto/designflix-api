# ADR-003 — Storage com Signed URL

## Status

Aceito.

## Contexto

Arquivos limpos (PSD/ZIP/etc.) não devem ser servidos em massa pela API Node nem expostos em listagens públicas.

## Decisão

1. Listagens públicas: só `url_thumb` / `url_cover` (marca d’água).
2. Download autenticado: `GET /signed/url?key=` após validar usuário (e quota quando aplicável).
3. Storage: S3 em produção-like; `STORAGE_TYPE=local` no MVP local.

## Motivo

- Menos carga na API
- CDN/object storage escalável
- Não vazar arquivo limpo no catálogo

## Consequências

- Front sempre obtém URL via `/signed/url` (não inventar proxy ad hoc)
- Detalhe ainda pode carregar `url` em alguns fluxos legados — evoluir para só signed URL (follow-up)
- Ver também ADR-004 (limite diário no mesmo endpoint)
