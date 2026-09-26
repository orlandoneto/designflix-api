<#
.SYNOPSIS
  Deploy da designflix-api na VM Oracle Always Free (opc@168.75.82.5), a partir do PC Windows.

.DESCRIPTION
  Fluxo (doc completa: docs/deploy-oracle.md):
    1. Snapshot de recursos da VM (disco / RAM / load / swap, absoluto + %).
       Zona vermelha = aborta (use -Force so com OK explicito).
    2. Valida o .env.production LOCAL (gitignored, fonte da verdade do .env da VM):
       NODE_ENV=production, STORAGE_TYPE=r2 e SMTP (Brevo) preenchido.
       VERSION_API e sincronizado com o package.json do commit deployado.
    3. Compara as chaves com o .env atual da VM: se a VM tiver variaveis que nao
       existem no .env.production local, ABORTA (evita perder segredos). -Force ignora.
    4. Empacota o codigo com `git archive <Ref>` (so arquivos versionados: nunca
       leva .env*, keys/, node_modules, uploads).
    5. Envia via scp, extrai em /home/opc/designflix-api, instala o .env (backup
       .env.bak.<timestamp>, chmod 600), `npm ci --omit=dev` so se o package-lock
       mudou, migrations opcionais (-Migrate), `pm2 reload` + `pm2 save`, health check.

  Nao toca em firewall / SSH / Security List (rule vps-ssh-firewall-safety).

.EXAMPLE
  npm run deploy:oracle -- -DryRun      # so confere (recursos, env, pacote); nao altera a VM
  npm run deploy:oracle                 # deploy do HEAD + .env.production
  npm run deploy:oracle -- -Migrate     # idem + sequelize db:migrate
  npm run deploy:oracle -- -SkipEnv     # deploy do codigo mantendo o .env atual da VM
#>
[CmdletBinding()]
param(
  [string]$HostIp = "168.75.82.5",
  [string]$User = "opc",
  [string]$KeyPath = "",
  [string]$EnvFile = "",
  [string]$Ref = "HEAD",
  [string]$HealthUrl = "https://api.ongraph.com.br/health",
  [switch]$DryRun,
  [switch]$SkipEnv,
  [switch]$SkipInstall,
  [switch]$Migrate,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $KeyPath) { $KeyPath = Join-Path $RepoRoot "keys\designflix-oci.key" }
if (-not $EnvFile) { $EnvFile = Join-Path $RepoRoot ".env.production" }
$AppDir = "/home/opc/designflix-api"
$RemoteEnvIncoming = "/home/opc/.designflix-env.incoming"   # /home/opc e 700
$Target = "$User@$HostIp"
$SshOpts = @("-i", $KeyPath, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Ts = Get-Date -Format "yyyyMMddHHmmss"
$TmpTar = Join-Path $env:TEMP "designflix-api-deploy-$Ts.tar.gz"
$TmpEnv = Join-Path $env:TEMP "designflix-env-$Ts"

function Write-Step([string]$msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Warn([string]$msg) { Write-Host "AVISO: $msg" -ForegroundColor Yellow }
function Fail([string]$msg) { Write-Host "ERRO: $msg" -ForegroundColor Red; Remove-Temp; exit 1 }
function Remove-Temp { Remove-Item -Force -ErrorAction SilentlyContinue $TmpTar, $TmpEnv }

# Roda um script bash na VM (stdin). Sempre termina com "exit" para o bash nao ler o
# CRLF que o PowerShell 5.1 acrescenta ao pipe. Scripts remotos: somente ASCII.
function Invoke-Remote([string]$Script, [switch]$Capture) {
  $body = ($Script -replace "`r", "") + "`nexit 0`n"
  if ($Capture) {
    $out = $body | & ssh @SshOpts $Target "bash -s"
    return ,@($out)
  }
  $body | & ssh @SshOpts $Target "bash -s"
  if ($LASTEXITCODE -ne 0) { Fail "comando remoto falhou (exit $LASTEXITCODE)" }
}

function Get-ShortHash([string]$value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $bytes = $sha.ComputeHash($Utf8NoBom.GetBytes($value))
  return (($bytes | ForEach-Object { $_.ToString("x2") }) -join "").Substring(0, 16)
}

function Get-EnvMap([string[]]$Lines) {
  $map = [ordered]@{}
  foreach ($l in $Lines) {
    if ($l -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { $map[$Matches[1]] = $Matches[2] }
  }
  return $map
}

function Get-Unquoted([string]$v) {
  $t = "$v".Trim()
  if ($t.Length -ge 2 -and (($t.StartsWith('"') -and $t.EndsWith('"')) -or ($t.StartsWith("'") -and $t.EndsWith("'")))) {
    return $t.Substring(1, $t.Length - 2)
  }
  return $t
}

# ---------------------------------------------------------------- pre-requisitos
Write-Step "Pre-requisitos"
if (-not (Test-Path $KeyPath)) { Fail "chave SSH nao encontrada: $KeyPath (ver docs/oci-ssh-access.md)" }
if (-not $SkipEnv -and -not (Test-Path $EnvFile)) {
  Fail "arquivo $EnvFile nao existe. Crie a partir de env.production.example (ou copie o .env da VM) - ver docs/deploy-oracle.md"
}
$commit = (& git -C $RepoRoot rev-parse --short $Ref)
if ($LASTEXITCODE -ne 0) { Fail "ref git invalida: $Ref" }
$pkg = ((& git -C $RepoRoot show "${Ref}:package.json") -join "`n") | ConvertFrom-Json
$version = $pkg.version
Write-Host "Ref: $Ref ($commit)  versao: $version  VM: $Target"
$dirty = & git -C $RepoRoot status --porcelain
if ($dirty) { Write-Warn "ha alteracoes nao commitadas - elas NAO vao para o deploy (so o commit $commit)." }

# ---------------------------------------------------------------- recursos VM
Write-Step "Recursos da VM (antes)"
$res = Invoke-Remote -Capture @'
df -h / | tail -1
free -h | sed -n '1,3p'
uptime
echo "@@DISK_USED_MB=$(df -BM --output=used / | tail -1 | tr -dc '0-9')"
echo "@@DISK_PCT=$(df --output=pcent / | tail -1 | tr -dc '0-9')"
echo "@@MEM_AVAIL_MB=$(free -m | awk '/^Mem:/{print $7}')"
echo "@@SWAP_USED_MB=$(free -m | awk '/^Swap:/{print $3}')"
echo "@@LOAD1=$(cut -d' ' -f1 /proc/loadavg)"
'@
if (-not $res -or $res.Count -eq 0) { Fail "sem resposta da VM via SSH (ver docs/oci-ssh-access.md)" }
$m = @{}
foreach ($line in $res) {
  if ($line -match '^@@([A-Z0-9_]+)=(.*)$') { $m[$Matches[1]] = $Matches[2] } else { Write-Host $line }
}
$diskMb = [double]$m["DISK_USED_MB"]; $diskPct = [double]$m["DISK_PCT"]
$memMb = [double]$m["MEM_AVAIL_MB"]; $swapMb = [double]$m["SWAP_USED_MB"]
$load = [double]::Parse($m["LOAD1"], [System.Globalization.CultureInfo]::InvariantCulture)
$red = @(); $yellow = @()
if ($diskMb -ge 26112 -or $diskPct -ge 85) { $red += "disco $([math]::Round($diskMb/1024,1))G ($diskPct%)" }
elseif ($diskMb -ge 21504 -or $diskPct -ge 70) { $yellow += "disco $([math]::Round($diskMb/1024,1))G ($diskPct%)" }
if ($memMb -lt 1024) { $red += "RAM disponivel ${memMb}MB" } elseif ($memMb -lt 2048) { $yellow += "RAM disponivel ${memMb}MB" }
if ($load -gt 4) { $red += "load $load" } elseif ($load -gt 2) { $yellow += "load $load" }
if ($swapMb -gt 2048) { $red += "swap ${swapMb}MB" } elseif ($swapMb -gt 1024) { $yellow += "swap ${swapMb}MB" }
Write-Host ("Resumo: disco {0}G usados ({1}%), RAM disponivel {2}G, load {3}, swap {4}MB" -f [math]::Round($diskMb/1024,1), $diskPct, [math]::Round($memMb/1024,1), $load, $swapMb)
if ($yellow.Count) { Write-Warn ("zona amarela: " + ($yellow -join ", ")) }
if ($red.Count) {
  if ($Force) { Write-Warn ("zona VERMELHA (seguindo por -Force): " + ($red -join ", ")) }
  else { Fail ("zona VERMELHA: " + ($red -join ", ") + " - resolva ou rode com -Force apos OK explicito") }
}

# ---------------------------------------------------------------- .env.production
$envChanges = @()
if (-not $SkipEnv) {
  Write-Step "Validando $EnvFile"
  $rawLines = [System.IO.File]::ReadAllLines($EnvFile, $Utf8NoBom) | ForEach-Object { $_.TrimEnd("`r").TrimStart([char]0xFEFF) }
  $localMap = Get-EnvMap $rawLines
  $errs = @()
  if ((Get-Unquoted $localMap["NODE_ENV"]) -ne "production") { $errs += "NODE_ENV precisa ser production" }
  if ((Get-Unquoted $localMap["STORAGE_TYPE"]) -ne "r2") { $errs += "STORAGE_TYPE precisa ser r2 (rule vps-always-free-monitor-r2)" }
  if ((Get-Unquoted $localMap["EMAIL_USE_MAILPIT"]) -eq "true") { $errs += "EMAIL_USE_MAILPIT=true em producao (Mailpit e so dev)" }
  foreach ($k in @("EMAIL_HOST_SMTP", "EMAIL_PORT_SMTP", "EMAIL_USER_SMTP", "EMAIL_PASS_SMTP", "EMAIL_FROM", "DB_PASSWORD", "JWT_SECRET")) {
    $v = Get-Unquoted $localMap[$k]
    if (-not $v) { $errs += "$k vazio/ausente" }
    elseif ($v -match '^<.*>$') { $errs += "$k ainda com placeholder" }
  }
  if ($errs.Count) { Fail ("env invalido:`n  - " + ($errs -join "`n  - ")) }

  # VERSION_API = versao do package.json deployado (rule versionamento)
  $outLines = New-Object System.Collections.Generic.List[string]
  $hasVersion = $false
  foreach ($l in $rawLines) {
    if ($l -match '^VERSION_API=') { $outLines.Add("VERSION_API=$version"); $hasVersion = $true } else { $outLines.Add($l) }
  }
  if (-not $hasVersion) { $outLines.Add("VERSION_API=$version") }
  [System.IO.File]::WriteAllText($TmpEnv, (($outLines -join "`n").TrimEnd("`n") + "`n"), $Utf8NoBom)
  $finalMap = Get-EnvMap $outLines

  Write-Step "Comparando chaves com o .env da VM (so nomes; valores nunca sao exibidos)"
  $remote = Invoke-Remote -Capture @'
f=/home/opc/designflix-api/.env
if [ ! -f "$f" ]; then echo "@@NOENV"; exit 0; fi
grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$f" | while IFS= read -r line; do
  k="${line%%=*}"; v="${line#*=}"
  printf '%s %s\n' "$k" "$(printf '%s' "$v" | sha256sum | cut -c1-16)"
done
'@
  $remoteMap = @{}
  foreach ($line in $remote) {
    if ($line -eq "@@NOENV") { Write-Warn "VM ainda sem .env"; continue }
    $p = "$line".Split(" ")
    if ($p.Count -eq 2) { $remoteMap[$p[0]] = $p[1] }
  }
  $missing = @($remoteMap.Keys | Where-Object { -not $finalMap.Contains($_) } | Sort-Object)
  $added = @($finalMap.Keys | Where-Object { -not $remoteMap.ContainsKey($_) })
  $changed = @($finalMap.Keys | Where-Object { $remoteMap.ContainsKey($_) -and $remoteMap[$_] -ne (Get-ShortHash $finalMap[$_]) })
  if ($added.Count) { Write-Host ("Novas na VM:     " + ($added -join ", ")) }
  if ($changed.Count) { Write-Host ("Alteradas:       " + ($changed -join ", ")) }
  if (-not $added.Count -and -not $changed.Count) { Write-Host "Sem mudancas de valor no .env." }
  $envChanges = $added + $changed
  if ($missing.Count) {
    $msg = "a VM tem variaveis que NAO existem no .env.production local: " + ($missing -join ", ")
    if ($Force) { Write-Warn "$msg (serao removidas por -Force)" }
    else { Fail "$msg`n  Adicione-as ao .env.production (ou use -SkipEnv / -Force)." }
  }
} else {
  Write-Warn "-SkipEnv: o .env atual da VM sera mantido como esta."
}

# ---------------------------------------------------------------- pacote
Write-Step "Empacotando $Ref ($commit) com git archive"
& git -C $RepoRoot -c core.autocrlf=false -c core.eol=lf archive --format=tar.gz -o $TmpTar $Ref
if ($LASTEXITCODE -ne 0) { Fail "git archive falhou" }
if (Get-Command tar -ErrorAction SilentlyContinue) {
  $entries = & tar -tzf $TmpTar
  $bad = @($entries | Where-Object { ($_ -match '(^|/)\.env($|\.)') -or ($_ -match '^keys/.+' -and $_ -ne 'keys/.gitkeep') })
  if ($bad.Count) { Fail ("pacote contem arquivos sensiveis: " + ($bad -join ", ")) }
  Write-Host ("Pacote: {0} arquivos, {1} KB (sem .env / keys)" -f $entries.Count, [math]::Round((Get-Item $TmpTar).Length / 1KB))
}

if ($DryRun) {
  Write-Step "DryRun: nada foi alterado na VM."
  Write-Host "Seria enviado: commit $commit (v$version)$(if (-not $SkipEnv) { ' + .env a partir de ' + $EnvFile })."
  if ($Migrate) { Write-Host "Rodaria: sequelize db:migrate" }
  Remove-Temp
  exit 0
}

# ---------------------------------------------------------------- upload + apply
Write-Step "Enviando pacote"
$remoteTar = "/tmp/designflix-api-deploy-$Ts.tar.gz"
& scp @SshOpts $TmpTar "${Target}:$remoteTar"
if ($LASTEXITCODE -ne 0) { Fail "scp do pacote falhou" }
if (-not $SkipEnv) {
  & scp @SshOpts $TmpEnv "${Target}:$RemoteEnvIncoming"
  if ($LASTEXITCODE -ne 0) { Fail "scp do .env falhou" }
}

Write-Step "Aplicando na VM"
$header = @(
  "APP_DIR='$AppDir'",
  "TARBALL='$remoteTar'",
  "ENV_INCOMING='$RemoteEnvIncoming'",
  "INSTALL_ENV='$(if ($SkipEnv) { '0' } else { '1' })'",
  "SKIP_INSTALL='$(if ($SkipInstall) { '1' } else { '0' })'",
  "RUN_MIGRATE='$(if ($Migrate) { '1' } else { '0' })'"
) -join "`n"
$apply = @'
set -euo pipefail
cd "$APP_DIR"
TS=$(date +%Y%m%d%H%M%S)
OLD_LOCK=$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || true)
echo "-- extraindo codigo"
tar -xzf "$TARBALL" -C "$APP_DIR"
rm -f "$TARBALL"
NEW_LOCK=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ "$INSTALL_ENV" = "1" ]; then
  chmod 600 "$ENV_INCOMING"
  if [ -f .env ]; then cp -p .env ".env.bak.$TS"; chmod 600 ".env.bak.$TS"; echo "-- backup: .env.bak.$TS"; fi
  mv -f "$ENV_INCOMING" .env
  chmod 600 .env
  echo "-- .env atualizado (origem: .env.production local)"
fi
if ! grep -Eq '^NODE_ENV="?production"?\s*$' .env || ! grep -Eq '^STORAGE_TYPE="?r2"?\s*$' .env; then
  echo "ERRO: .env sem NODE_ENV=production / STORAGE_TYPE=r2"
  if [ -f ".env.bak.$TS" ]; then cp -p ".env.bak.$TS" .env; echo "-- .env restaurado do backup"; fi
  exit 1
fi
if [ "$SKIP_INSTALL" != "1" ] && { [ "$OLD_LOCK" != "$NEW_LOCK" ] || [ ! -d node_modules ]; }; then
  echo "-- package-lock mudou: npm ci --omit=dev"
  df -h / | tail -1; free -h | sed -n '2p'
  npm ci --omit=dev
else
  echo "-- dependencias inalteradas (sem npm ci)"
fi
if [ "$RUN_MIGRATE" = "1" ]; then
  echo "-- migrations"
  NODE_ENV=production npx --yes sequelize-cli db:migrate
fi
mkdir -p logs
pm2 reload ecosystem.oracle.config.js --update-env
pm2 save
sleep 4
echo "-- health local: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/health || true)"
grep -E '^(NODE_ENV|STORAGE_TYPE|VERSION_API|EMAIL_HOST_SMTP|EMAIL_PORT_SMTP|EMAIL_FROM)=' .env
if grep -Eq '^EMAIL_PASS_SMTP=.+' .env; then echo "EMAIL_PASS_SMTP=****(definido)"; else echo "EMAIL_PASS_SMTP=(VAZIO!)"; fi
echo "-- recursos (depois)"
df -h / | tail -1; free -h | sed -n '2p'; uptime
'@
Invoke-Remote ($header + "`n" + $apply)

# ---------------------------------------------------------------- health publico
Write-Step "Health publico: $HealthUrl"
$okHealth = $false
for ($i = 1; $i -le 5; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 $HealthUrl
    Write-Host "HTTP $($r.StatusCode)"
    if ($r.StatusCode -eq 200) { $okHealth = $true; break }
  } catch { Write-Host "tentativa ${i}: $($_.Exception.Message)" }
  Start-Sleep -Seconds 3
}
Remove-Temp
if (-not $okHealth) { Fail "health nao respondeu 200 - ver: pm2 logs designflix-api --lines 100" }
Write-Host ""
Write-Host "Deploy OK: $commit (v$version) em $Target" -ForegroundColor Green
