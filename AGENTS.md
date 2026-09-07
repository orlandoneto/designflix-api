# Designflix API

Backend Express — catálogo, auth, downloads, planos, colaborador, admin APIs.

## Repositórios irmãos

- `designflix-next-new` — site (Next)
- `designflix-admin` — painel admin (Next)

## Antes de alterar código

1. Ler este arquivo.
2. Rules do workspace: `C:/projetos/.cursor/rules/` (como trabalhar).
3. Doc do domínio em `docs/contextos/` (o que o sistema faz).
4. Se for decisão estrutural: `docs/architecture/decisions/`.
5. Não inventar contrato se o doc já define.
6. Checklist da tarefa (`TodoWrite`) — efêmera.

## Depois de alterar código

1. `npm test` (e nos irmãos se a mudança for cross-cutting).
2. Atualizar `docs/contextos/` e, se mudou o “porquê”, um ADR.
3. Espelhar consumo no Next/Admin (`docs/integrado/` / docs do admin) quando aplicável.

## Mapa de documentação

| O quê | Onde |
|-------|------|
| Índice de contextos | [docs/contextos/README.md](./docs/contextos/README.md) |
| Visão de arquitetura | [docs/architecture/overview.md](./docs/architecture/overview.md) |
| ADRs (por quê) | [docs/architecture/decisions/](./docs/architecture/decisions/) |
| Envelope HTTP | Rule `architecture-docs-and-tests` + `src/utils/httpResponse.js` |

## Princípio

Código = implementação. Docs = verdade do sistema. Rules = comportamento do agente.  
AGENTS = mapa. Todo = estado da tarefa. Chat = contexto temporário.

**Rule ≠ regra de negócio.** Limite de downloads, planos, etc. ficam em `docs/contextos/`, não em `.mdc`.
