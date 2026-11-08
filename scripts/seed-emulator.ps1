param(
    [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $ScriptDirectory
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$SeedScript = Join-Path $ProjectRoot "scripts\seed-emulator.cjs"
$FunctionsModules = Join-Path $ProjectRoot "functions\node_modules"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SERVIGO - SEED FIREBASE EMULATORS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $SeedScript)) {
    throw "No se encontro: $SeedScript"
}

if (-not (Test-Path $FunctionsModules)) {
    Write-Host "[ERROR] No existen las dependencias de Functions." -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta primero:" -ForegroundColor Yellow
    Write-Host "npm --prefix functions ci" -ForegroundColor White
    exit 1
}

if (-not (Test-Path (Join-Path $FunctionsModules "firebase-admin"))) {
    Write-Host "[ERROR] firebase-admin no esta instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta:" -ForegroundColor Yellow
    Write-Host "npm --prefix functions ci" -ForegroundColor White
    exit 1
}

# Permite que seed-emulator.cjs resuelva firebase-admin
# desde functions\node_modules.
$PreviousNodePath = $env:NODE_PATH

try {
    $env:NODE_PATH = $FunctionsModules

    Write-Host "Proyecto:" -ForegroundColor Gray
    Write-Host $ProjectRoot -ForegroundColor White
    Write-Host ""
    Write-Host "Cargando usuarios y datos ficticios en los emuladores..." -ForegroundColor Cyan
    Write-Host ""

    Set-Location $ProjectRoot
# Variables explicitas para Firebase Emulator Suite.
# Estas variables solo afectan este proceso y sus procesos hijos.
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
$env:FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199"

# Obtener automaticamente el projectId desde .firebaserc
$FirebaseRcPath = Join-Path $ProjectRoot ".firebaserc"

if (Test-Path $FirebaseRcPath) {
    $FirebaseRc = Get-Content $FirebaseRcPath -Raw | ConvertFrom-Json
    $ProjectId = $FirebaseRc.projects.default
}
else {
    throw "No se encontro .firebaserc. No se ejecutara el seed por seguridad."
}

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    throw "No fue posible determinar el projectId. Seed cancelado por seguridad."
}

$env:GCLOUD_PROJECT = $ProjectId
$env:GOOGLE_CLOUD_PROJECT = $ProjectId
$env:FIREBASE_CONFIG = "{`"projectId`":`"$ProjectId`"}"

Write-Host "Firebase Project ID: $ProjectId" -ForegroundColor Gray
Write-Host "Firestore Emulator: $env:FIRESTORE_EMULATOR_HOST" -ForegroundColor Gray
Write-Host "Auth Emulator: $env:FIREBASE_AUTH_EMULATOR_HOST" -ForegroundColor Gray
Write-Host "Storage Emulator: $env:FIREBASE_STORAGE_EMULATOR_HOST" -ForegroundColor Gray
Write-Host ""
    node $SeedScript

    if ($LASTEXITCODE -ne 0) {
        throw "El seed termino con codigo $LASTEXITCODE."
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host " SEED COMPLETADO" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usuarios de prueba:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Cliente:" -ForegroundColor Yellow
    Write-Host "  cliente@servigo.test"
    Write-Host "  ServiGo123!"
    Write-Host ""
    Write-Host "Tecnico:" -ForegroundColor Yellow
    Write-Host "  tecnico@servigo.test"
    Write-Host "  ServiGo123!"
    Write-Host ""
    Write-Host "Administrador:" -ForegroundColor Yellow
    Write-Host "  admin@servigo.test"
    Write-Host "  ServiGo123!"
    Write-Host ""
}
finally {
    $env:NODE_PATH = $PreviousNodePath
}