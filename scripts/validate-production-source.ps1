$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory
Set-Location $ProjectRoot

Write-Host "Validando TypeScript y plantillas..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint frontend fallo." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build frontend fallo." }

Write-Host "Validando Cloud Functions..." -ForegroundColor Cyan
npm run lint:functions
if ($LASTEXITCODE -ne 0) { throw "Lint Functions fallo." }

npm run build:functions
if ($LASTEXITCODE -ne 0) { throw "Build Functions fallo." }

Write-Host "[OK] Codigo preparado para pruebas reales." -ForegroundColor Green
