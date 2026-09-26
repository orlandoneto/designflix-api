# Deploy — API na VM Oracle (produção)

Como o código e o `.env` de produção chegam na VM `designflix-api` (`opc@168.75.82.5`).

Relacionados: [oci-ssh-access.md](./oci-ssh-access.md) · [producao-urls.md](./producao-urls.md) · [email-smtp-brevo.md](./email-smtp-brevo.md) · PM2: [`ecosystem.oracle.config.js`](../ecosystem.oracle.config.js)

---

## Resumo

| Item | Valor |
|------|-------|
| Comando | `npm run deploy:oracle` (PowerShell no PC Windows) |
| Script | [`scripts/deploy-oracle.ps1`](../scripts/deploy-oracle.ps1) |
| Código enviado | `git archive HEAD` (só arquivos **commitados**) → `/home/opc/designflix-api` |
| `.env` da VM | gerado a partir do **`.env.production` local** (gitignored) |
| Modelo do env | [`env.production.example`](../env.production.example) (placeholders, commitado) |
| Processo | PM2 `designflix-api` (cluster x2) — `pm2 reload ecosystem.oracle.config.js --update-env` |
| Health | `https://api.ongraph.com.br/health` |

A VM **não** é um clone git: o código chega por pacote (`tar.gz`) via `scp`.  
O CI do GitHub ([`ci.yml`](../.github/workflows/ci.yml)) só roda `npm test` — **não** faz deploy e **não** usa secrets.

> `npm run deploy-prd` / `deploy-stg` (`ecosystem.production.config.js` / `ecosystem.development.config.js`) são **legado** do VPS antigo (`46.202.146.92`, Hostinger). Não usar para a Oracle.

---

## Fonte da verdade do `.env` de produção

```
C:\projetos\designflix-api\.env.production   ← valores REAIS (gitignored, ACL só do usuário)
        │  npm run deploy:oracle
        ▼
/home/opc/designflix-api/.env                ← chmod 600, backup .env.bak.<timestamp> a cada deploy
```

- `.gitignore` cobre `.env`, `.env.*` e `.env.production` → confira com `git check-ignore -v .env.production`.
- O repositório é **público** no GitHub: segredo real **nunca** em arquivo versionado.
- Para mudar uma variável de produção: edite o `.env.production` local e rode o deploy (ou edite direto na VM **e** replique no `.env.production`, senão o próximo deploy desfaz).
- `VERSION_API` é sobrescrito automaticamente com a `version` do `package.json` deployado.

### Proteções do script

| Checagem | Comportamento |
|----------|---------------|
| Recursos da VM (disco/RAM/load/swap, absoluto + %) | Mostra antes/depois; **aborta** em zona vermelha (rule `vps-always-free-monitor-r2`) |
| `NODE_ENV=production` e `STORAGE_TYPE=r2` | Obrigatórios; senão aborta (e restaura o backup na VM) |
| SMTP (`EMAIL_HOST/PORT/USER/PASS_SMTP`, `EMAIL_FROM`) | Obrigatórios, sem placeholder `<...>`; `EMAIL_USE_MAILPIT=true` é rejeitado |
| Chaves que existem na VM e **não** no `.env.production` | **Aborta** (evita perder segredo). `-Force` remove mesmo assim |
| Pacote contém `.env*` ou `keys/*` | Aborta |
| `package-lock.json` mudou | Roda `npm ci --omit=dev` (senão pula) |

Valores nunca são impressos: a comparação com a VM usa só nomes de chave + hash.

---

## Uso

```powershell
cd C:\projetos\designflix-api
git status                              # só o que está commitado vai para a VM
npm run deploy:oracle -- -DryRun        # confere recursos, env e pacote (não altera nada)
npm run deploy:oracle                   # deploy do HEAD + .env.production
npm run deploy:oracle -- -Migrate       # + sequelize db:migrate (NODE_ENV=production)
npm run deploy:oracle -- -SkipEnv       # só código; mantém o .env atual da VM
```

Parâmetros: `-HostIp` (default `168.75.82.5`), `-KeyPath` (default `keys\designflix-oci.key`), `-EnvFile` (default `.env.production`), `-Ref` (default `HEAD`), `-SkipInstall`, `-Force`.

Se o PowerShell bloquear scripts, o `npm run` já usa `-ExecutionPolicy Bypass`.

### Primeira vez num PC novo

1. Chave SSH em `keys\designflix-oci.key` ([oci-ssh-access.md](./oci-ssh-access.md)).
2. Criar o `.env.production`: copiar da VM (mais seguro, já tem tudo):

   ```powershell
   scp -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5:/home/opc/designflix-api/.env .env.production
   ```

   ou partir de `env.production.example` e preencher.
3. `npm run deploy:oracle -- -DryRun`.

---

## Pós-deploy (checklist)

1. Script mostra `NODE_ENV=production`, `STORAGE_TYPE=r2`, `EMAIL_HOST_SMTP=smtp-relay.brevo.com`, `EMAIL_PASS_SMTP=****(definido)`.
2. Health 200.
3. `uploads/` da VM vazio (mídia só no R2).
4. Se algo falhar: `ssh ... "pm2 logs designflix-api --lines 100 --nostream"`; o `.env` anterior está em `.env.bak.<timestamp>`.

**Nunca** mexer em firewall / porta 22 / Security List no deploy (rule `vps-ssh-firewall-safety`).
