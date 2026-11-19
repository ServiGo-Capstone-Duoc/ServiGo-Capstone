param(
    [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $ScriptDirectory
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

if (-not (Test-Path ".\node_modules")) {
    throw "Faltan dependencias del frontend. Ejecuta: npm ci"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SERVIGO - IONIC + FIREBASE EMULATORS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "La app usara Auth, Firestore, Functions y Storage locales." -ForegroundColor Green
Write-Host "Abriendo en http://localhost:8100" -ForegroundColor Gray
Write-Host ""

npm start
exit $LASTEXITCODE
