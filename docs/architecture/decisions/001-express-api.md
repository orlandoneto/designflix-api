# ADR-001 — API em Express (não Nest)

## Status

Aceito (MVP).

## Contexto

Precisávamos de uma API HTTP com auth, catálogo, upload e pagamentos, com time pequeno e custo baixo.

## Decisão

Manter **Express + Sequelize** em `designflix-api`, com controllers/services e docs por contexto.

## Motivo

- Já existe código e domínio no Express
- Menos cerimônia que Nest no estágio atual
- Deploy/local simples

## Consequências

- Organização por pastas + `docs/contextos/` (não módulos Nest)
- Envelope e status padronizados via `httpResponse.js`
- Reavaliar Nest/Fastify só se complexidade de DI/módulos justificar (novo ADR)
