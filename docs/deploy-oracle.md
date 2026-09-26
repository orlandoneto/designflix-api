# Deploy — API na VM Oracle (produção) — como usar

Passo a passo para colocar uma versão nova da `designflix-api` na VM `designflix-api` (`opc@168.75.82.5`), mudar variáveis de produção e voltar atrás se der errado.

Relacionados: [oci-ssh-access.md](./oci-ssh-access.md) · [producao-urls.md](./producao-urls.md) · [email-smtp-brevo.md](./email-smtp-brevo.md) · [pentest/](./pentest/README.md) · PM2: [`ecosystem.oracle.config.js`](../ecosystem.oracle.config.js)

---

## Resumo

| Item | Valor |
|------|-------|
| Comando | `npm run deploy:oracle` (PowerShell no PC Windows, na pasta do repo) |
| Script | [`scripts/deploy-oracle.ps1`](../scripts/deploy-oracle.ps1) |
| Código enviado | `git archive HEAD` (só arquivos **commitados**) → `/home/opc/designflix-api` |
| `.env` da VM | gerado a partir do **`.env.production` local** (gitignored) |
| Modelo do env | [`env.production.example`](../env.production.example) (placeholders, commitado) |
| Backups na VM | `/home/opc/deploy-backups/code-<TS>.tar.gz` + `env-<TS>` (guarda os 5 últimos) |
| Processo | PM2 `designflix-api` (cluster x2) — `pm2 reload ecosystem.oracle.config.js --update-env` |
| Health | `https://api.ongraph.com.br/health` (e `GET /` mostra a versão) |

A VM **não** é um clone git: o código chega por pacote (`tar.gz`) via `scp`.
O CI do GitHub ([`ci.yml`](../.github/workflows/ci.yml)) só roda `npm test` — **não** faz deploy e **não** usa secrets.

> Histórico: até set/2026 a API rodava num VPS da Hostinger (`46.202.146.92`, deploy via `pm2 deploy`). O servidor foi **desativado** e os scripts `deploy-prd`/`deploy-stg` e os `ecosystem.production/development.config.js` foram removidos (API 1.1.0). O único deploy é `npm run deploy:oracle`.

---

## 1. Pré-requisitos (uma vez por PC)

1. **Chave SSH** em `C:\projetos\designflix-api\keys\designflix-oci.key` (pasta `keys/` é gitignored) — [oci-ssh-access.md](./oci-ssh-access.md). Teste:

   ```powershell
   ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5 "uptime"
   ```

2. **`.env.production`** na raiz do repo (gitignored). O mais seguro é copiar da VM, que já tem tudo:

   ```powershell
   scp -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5:/home/opc/designflix-api/.env .env.production
   git check-ignore -v .env.production   # tem que responder com a regra do .gitignore
   ```

   Ou partir de [`env.production.example`](../env.production.example) e preencher (todo `<...>` precisa virar valor real).

3. **Node + npm** instalados (para `npm run`) e **git**.

## 2. Deploy normal

```powershell
cd C:\projetos\designflix-api
npm test                                # tem que passar
git status                              # só o que está COMMITADO vai para a VM
npm run deploy:oracle -- -DryRun        # confere recursos, env e pacote; não altera nada
npm run deploy:oracle                   # deploy do HEAD + .env.production
```

Antes de um deploy de versão: subir `version` no `package.json` (semver). O `VERSION_API` do `.env` da VM é sobrescrito automaticamente com essa versão.

### Todas as opções

| Comando | Quando usar |
|---------|-------------|
| `npm run deploy:oracle -- -DryRun` | Sempre antes. Mostra recursos da VM, variáveis que vão mudar (só nomes), conteúdo do pacote |
| `npm run deploy:oracle` | Deploy do `HEAD` + `.env.production` |
| `npm run deploy:oracle -- -Migrate` | Deploy + `sequelize db:migrate` (com `NODE_ENV=production`) — quando há migration nova |
| `npm run deploy:oracle -- -SkipEnv` | Só código; mantém o `.env` atual da VM |
| `npm run deploy:oracle -- -SkipInstall` | Não roda `npm ci` mesmo se o `package-lock.json` mudou |
| `npm run deploy:oracle -- -Force` | Segue mesmo em zona vermelha de recursos ou com chaves na VM que não estão no `.env.production` (**só com OK explícito**) |
| `npm run deploy:oracle -- -Rollback` | Volta código + `.env` para o backup mais recente (seção 5) |
| `npm run deploy:oracle -- -Rollback -BackupTs 20260926125308` | Volta para um backup específico |
| `npm run deploy:oracle -- -Rollback -DryRun` | Lista os backups disponíveis |

Outros parâmetros: `-Ref <commit|tag>` (default `HEAD`), `-HostIp` (default `168.75.82.5`), `-KeyPath` (default `keys\designflix-oci.key`), `-EnvFile` (default `.env.production`), `-HealthUrl`.

Se o PowerShell bloquear scripts, o `npm run` já usa `-ExecutionPolicy Bypass`.

## 3. O que o script faz (em ordem)

1. **Pré-requisitos:** chave SSH, `.env.production`, ref git válida; avisa se há alteração não commitada (ela **não** vai).
2. **Recursos da VM** (disco / RAM / load / swap, absoluto + %). Zona vermelha (disco ≥ 85% ou ≥ 25,5G; RAM disponível < 1G; load > 4; swap > 2G) → **aborta**.
3. **Valida o `.env.production`:**
   - `NODE_ENV=production` e `STORAGE_TYPE=r2` obrigatórios;
   - `EMAIL_HOST/PORT/USER/PASS_SMTP`, `EMAIL_FROM`, `DB_PASSWORD`, `JWT_PRIVATE_KEY` preenchidos, sem placeholder `<...>`;
   - `JWT_PRIVATE_KEY` precisa ser PEM RSA válido (seção 4.2);
   - `EMAIL_USE_MAILPIT=true` é rejeitado.
4. **Compara com o `.env` da VM** (só nomes de chave + hash, valores nunca aparecem): se a VM tem variável que **não** está no `.env.production` → aborta (evita perder segredo).
5. **Empacota** com `git archive` e aborta se o pacote tiver `.env*` ou `keys/*`.
6. **Na VM:**
   - backup do código atual (sem `node_modules`, `logs`, `uploads`, `.env*`) em `/home/opc/deploy-backups/code-<TS>.tar.gz` e do `.env` em `env-<TS>` (pasta `chmod 700`, mantém 5);
   - extrai o pacote; usando o **manifesto** `.deploy-manifest`, apaga arquivos que saíram do repo desde o último deploy;
   - apaga arquivos sensíveis **legados** se existirem: `src/middleware/private.key`, `src/middleware/private.key.pub`, `config/config.json`;
   - instala o `.env` novo (backup extra `.env.bak.<TS>`, `chmod 600`); se faltar `NODE_ENV=production`/`STORAGE_TYPE=r2`, restaura e aborta;
   - `npm ci --omit=dev` só se o `package-lock.json` mudou;
   - migrations se `-Migrate`;
   - `pm2 reload` + `pm2 save`;
   - health local (`127.0.0.1:4000/health`).
7. **Health público** + recursos depois. Se o health não der 200, o script termina com erro e sugere `-Rollback`.

`<TS>` = data/hora **UTC** da VM (`AAAAMMDDhhmmss`; Fortaleza = UTC−3).

**Nunca** mexe em firewall / porta 22 / Security List (rule `vps-ssh-firewall-safety`).

## 4. Variáveis de produção

### 4.1 Mudar uma variável

1. Editar `C:\projetos\designflix-api\.env.production` (fonte da verdade).
2. `npm run deploy:oracle -- -DryRun` → confere a lista "Alteradas/Novas".
3. `npm run deploy:oracle`.

Editou direto na VM? Replique no `.env.production`, senão o próximo deploy desfaz (ou aborta, se for variável nova).
Remover uma variável da VM: tire do `.env.production` e rode com `-Force` (o script avisa quais serão removidas).

O repositório é **público**: segredo real **nunca** em arquivo versionado. `.gitignore` cobre `.env`, `.env.*`, `keys/`, `*.pem`, `src/middleware/*.key`.

### 4.2 `JWT_PRIVATE_KEY` (desde 1.0.14)

Chave RSA (4096, PKCS#8) que assina e verifica os tokens (RS256). **Não** fica mais em `src/middleware/private.key` — ver [pentest/2026-09-26-chave-jwt-exposta.md](./pentest/2026-09-26-chave-jwt-exposta.md).

- Formato: **uma linha**, entre aspas, quebras como `\n` literal: `JWT_PRIVATE_KEY="-----BEGIN ... KEY-----\nMIIJ...\n-----END ... KEY-----\n"`.
- Alternativa: `JWT_PRIVATE_KEY_PATH=/caminho/arquivo.pem` (arquivo fora do repo).
- Em produção sem chave a API **não sobe** (`[JWT] ...` no log). Em dev/test sem chave usa uma chave efêmera (tokens morrem a cada restart).
- Gerar/rotacionar sem imprimir a chave: comando em [pentest §7](./pentest/2026-09-26-chave-jwt-exposta.md#7-como-rotacionar-de-novo-futuro). Trocar a chave desloga todo mundo.
- Dev usa **outra** chave (no `.env.development`), nunca a de produção.

`JWT_SECRET` / `JWT_REFRESH_SECRET` são legado (o código não usa).

## 5. Rollback

Todo deploy real (sem `-DryRun`) guarda, **antes** de mexer em qualquer coisa, o código e o `.env` que estavam na VM:

```
/home/opc/deploy-backups/code-<TS>.tar.gz   ← código (sem node_modules, logs, uploads, .env*)
/home/opc/deploy-backups/env-<TS>           ← .env (chmod 600)
```

`<TS>` = data/hora **UTC** da VM no formato `AAAAMMDDhhmmss` (Fortaleza = UTC−3). São mantidos os **5** mais recentes. O deploy imprime o nome: `-- backup do codigo atual: /home/opc/deploy-backups/code-<TS>.tar.gz`.

### 5.1 Listar os backups

```powershell
npm run deploy:oracle -- -Rollback -DryRun      # 5 mais recentes, o primeiro é o mais novo; não altera nada
```

Ou direto na VM (mostra também a versão de cada backup; saída tipo `code-20260926131821.tar.gz "version": "1.0.14",`):

```powershell
ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5 "cd /home/opc/deploy-backups && for f in `$(ls -1t code-*.tar.gz); do echo `$f `$(tar -xOzf `$f ./package.json | grep -m1 version); done"
```

### 5.2 Qual backup escolher

O backup `<TS>` é o estado **anterior** ao deploy que o criou:

| Quero voltar para… | Use |
|--------------------|-----|
| A versão de antes do último deploy | o backup **mais recente** (`-Rollback` sem `-BackupTs`) |
| Uma versão mais antiga | o `-BackupTs` cujo `package.json` mostra essa versão (5.1) |
| Depois de dois deploys seguidos da mesma mudança (ex.: o primeiro falhou no meio) | o backup do **primeiro** deploy — o segundo backup já contém a mudança pela metade |

Exemplo real (2026-09-26, API 1.1.0): o 1º deploy falhou no `npm ci` depois de extrair o código; o estado limpo anterior (1.0.14) é `20260926131821`, não `20260926131922`.

### 5.3 Executar

```powershell
npm run deploy:oracle -- -Rollback                          # volta para o backup mais recente
npm run deploy:oracle -- -Rollback -BackupTs 20260926131821 # volta para um backup específico
```

O que faz, na VM: extrai `code-<TS>.tar.gz` por cima do app → guarda o `.env` atual em `.env.pre-rollback.<agora>` e restaura `env-<TS>` → `npm ci --omit=dev` se o `package-lock.json` mudou → `pm2 reload` + `pm2 save` → mostra health local, `NODE_ENV`/`STORAGE_TYPE`/`VERSION_API` e disco/RAM. Depois conferir `curl https://api.ongraph.com.br/` (versão) e `pm2 logs designflix-api --lines 50 --nostream`.

### 5.4 Cuidados

- **Migrations não são desfeitas.** O rollback só troca código e `.env`; o banco fica como está. Migrations aditivas (colunas/tabelas novas, ex.: `20260926130000-admin-password-reset-token`) não atrapalham o código antigo. Se uma migration renomear/apagar algo, reverter no banco antes: `NODE_ENV=production npx sequelize-cli db:migrate:undo` na VM (só com backup do banco).
- Arquivos **novos** criados pelo deploy desfeito não são apagados (o manifesto é zerado; o próximo deploy normal reconcilia).
- O `.env.production` local continua com os valores novos — se foi o env que quebrou, corrija-o antes do próximo deploy.
- Voltar para versão **anterior à 1.0.14** não sobe: o código antigo lê `src/middleware/private.key`, que não existe mais na VM. Prefira corrigir para frente.
- Rollback de um deploy que trocou a chave JWT desloga todo mundo de novo.
- Rollback só restaura o que o script guardou: `uploads/`, `logs/` e o banco ficam fora.
## 6. Pós-deploy (checklist)

1. Script mostra `NODE_ENV=production`, `STORAGE_TYPE=r2`, `EMAIL_HOST_SMTP=smtp-relay.brevo.com`, segredos como `****(definido)`.
2. Health 200 e `curl https://api.ongraph.com.br/` mostra a versão nova.
3. Login no site/admin funcionando.
4. `pm2 logs designflix-api --lines 50 --nostream` sem erros.
5. Recursos (disco/RAM absoluto + %) no resumo final.
6. `uploads/` da VM vazio (mídia só no R2).

## 7. Troubleshooting

| Sintoma | Causa | O que fazer |
|---------|-------|-------------|
| `ERRO: chave SSH nao encontrada` / `sem resposta da VM via SSH` | chave fora de `keys\` ou VM/SSH fora | [oci-ssh-access.md](./oci-ssh-access.md) — **não** mexer em firewall |
| `ERRO: arquivo .env.production nao existe` | PC novo | Seção 1, passo 2 |
| `... vazio/ausente` / `ainda com placeholder` | variável obrigatória faltando no `.env.production` | Preencher e rodar `-DryRun` de novo |
| `JWT_PRIVATE_KEY precisa ser PEM RSA em uma linha...` | chave com quebras reais, sem aspas ou truncada | Regerar com o comando do pentest §7 |
| Aborta listando chaves que "existem na VM e não no .env.production" | alguém editou a VM direto | Copiar essas variáveis para o `.env.production` (ou `-Force` para removê-las, com certeza) |
| `zona VERMELHA` | disco/RAM/load/swap altos | Resolver antes (logs, `npm cache clean`, `pm2 flush`); `-Force` só com OK explícito |
| Health ≠ 200 após deploy | API não subiu | `ssh ... "pm2 logs designflix-api --lines 100 --nostream"`; se preciso `-Rollback` |
| Log com `[JWT] JWT_PRIVATE_KEY ...` e PM2 reiniciando | chave ausente/inválida no `.env` da VM | Conferir `grep -c '^JWT_PRIVATE_KEY=' /home/opc/designflix-api/.env` (tem que ser 1); corrigir no `.env.production` e redeployar |
| `Failed to authenticate token` para todo mundo | chave JWT trocada | Esperado após rotação: todos logam de novo |
| Deploy interrompido no meio (Ctrl+C, queda) | — | Rodar `npm run deploy:oracle` de novo (é idempotente) ou `-Rollback` |

Conferir variáveis na VM sem expor valores:

```bash
sed -E 's/^([A-Z0-9_]+)=.*/\1=****/' /home/opc/designflix-api/.env | sort
```
