# ADR-002 — Dois frontends Next.js (site + admin)

## Status

Aceito.

## Contexto

Site público e painel interno têm auth, UX e ciclos de release diferentes.

## Decisão

- `designflix-next-new` — cliente
- `designflix-admin` — staff
- Ambos consomem `designflix-api`

## Motivo

- Isolar auth user vs admin
- Evitar bundle/admin tools no site
- Permitir evoluir UI do painel sem arriscar o funil público

## Consequências

- Contratos compartilhados documentados na API
- Testes cross-cutting nos 3 repos quando a feature atravessa
- Docs de integração no Next (`docs/integrado/`); admin em `docs/ARCHITECTURE.md`
