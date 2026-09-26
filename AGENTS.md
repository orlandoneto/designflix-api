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
| Scripts npm (como usar) | [docs/scripts.md](./docs/scripts.md) |
| OCI — criar VCN / subnet / VM | [docs/oci-vm-setup.md](./docs/oci-vm-setup.md) |
| Produção — URLs e status | [docs/producao-urls.md](./docs/producao-urls.md) |
| Deploy produção (VM Oracle) + `.env.production` | [docs/deploy-oracle.md](./docs/deploy-oracle.md) — `npm run deploy:oracle` |
| E-mail produção (SMTP Brevo) | [docs/email-smtp-brevo.md](./docs/email-smtp-brevo.md) |
| OCI — SSH e chaves locais (`keys/`) | [docs/oci-ssh-access.md](./docs/oci-ssh-access.md) |
| PM2 na Oracle A1 (2 OCPU) | [ecosystem.oracle.config.js](./ecosystem.oracle.config.js) |
| Bootstrap VM (Node/MySQL/Nginx) | [scripts/oci-bootstrap.sh](./scripts/oci-bootstrap.sh) |
| Visão de arquitetura | [docs/architecture/overview.md](./docs/architecture/overview.md) |
| ADRs (por quê) | [docs/architecture/decisions/](./docs/architecture/decisions/) |
| Envelope HTTP | Rule `architecture-docs-and-tests` + `src/utils/httpResponse.js` |
| VM Always Free + R2 prod | Rule `vps-always-free-monitor-r2` (`.cursor/rules/`) — `STORAGE_TYPE=r2` na VM |
| CI (GitHub Actions) | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — `npm test` em push/PR `main` |

## Princípio

Código = implementação. Docs = verdade do sistema. Rules = comportamento do agente.  
AGENTS = mapa. Todo = estado da tarefa. Chat = contexto temporário.

**Rule ≠ regra de negócio.** Limite de downloads, planos, etc. ficam em `docs/contextos/`, não em `.mdc`.
