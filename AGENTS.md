# 🤖 AGENTS.md

Este arquivo orienta o agente de IA no Cursor a seguir as regras e práticas do time.

## Objetivo
Manter consistência, qualidade e segurança no código em todas as frentes: frontend, backend, testes, debugging e integração com GitHub.

## Frontend
- Use componentes funcionais com hooks.
- Estruture nomes em lowercase-com-dashes.
- Sempre tipar com TypeScript (strict).

## Backend
- Sempre validar inputs antes de processar.
- Usar early returns para simplificar lógica.
- Logar erros críticos (sem dados sensíveis).
- Manter segredos em variáveis de ambiente.

## Testes
- Todo novo código deve ter testes.
- CI/CD obrigatório antes de merge.
- Testes claros e independentes.

## Debugging
- Reproduzir o bug antes de corrigir.
- Criar teste que falha antes da correção.
- Documentar a causa raiz no PR.

## GitHub Workflow
- Trabalhar em feature branches.
- Seguir Conventional Commits.
- PRs pequenos, revisados e testados.
- CI/CD via GitHub Actions obrigatório antes de merge.

## Uso da IA (evitar alucinações)
- O agente deve sempre se basear no código e docs locais.
- Se não tiver certeza, pedir confirmação ao dev.
- Nunca inventar bibliotecas, APIs ou funções.
- Preferir mostrar exemplos reais do projeto.

---
> Estas diretrizes são aplicadas via `.cursor/rules` e servem como guia humano.
