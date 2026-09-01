# Sobe Mailpit (Docker no WSL) + API em desenvolvimento
# Uso: .\scripts\dev-with-mailpit.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

Write-Host "`n=== Designflix API — dev local (Mailpit + nodemon) ===`n" -ForegroundColor Cyan

node scripts/mailpit.js up
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node scripts/setEnv.js development
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:NODE_ENV = "development"
$env:LOG_LEVEL = "debug"

Write-Host "`nIniciando API na porta 3000...`n" -ForegroundColor Green
npx nodemon src/main.js
