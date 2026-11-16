param(
    [string]$ProjectRoot = "",
    [string]$ImportPath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $ScriptDirectory
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SERVIGO - FIREBASE EMULATOR SUITE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proyecto local: $ProjectRoot" -ForegroundColor Gray

if (-not (Test-Path ".\firebase.json")) {
    throw "No se encontro firebase.json en $ProjectRoot"
}

if (-not (Test-Path ".\.firebaserc")) {
    throw "No se encontro .firebaserc. Inicio cancelado por seguridad."
}

$FirebaseRc = Get-Content ".\.firebaserc" -Raw | ConvertFrom-Json
$ProjectId = [string]$FirebaseRc.projects.default

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    throw "No fue posible determinar projects.default desde .firebaserc."
}

$FirebaseCommand = Get-Command firebase -ErrorAction SilentlyContinue
if ($null -eq $FirebaseCommand) {
    throw "Firebase CLI no esta disponible. Instala: npm install -g firebase-tools"
}

if (-not (Test-Path ".\functions\node_modules")) {
    throw "Faltan dependencias de Functions. Ejecuta: npm --prefix functions ci"
}

Write-Host "Firebase project id: $ProjectId" -ForegroundColor Gray
Write-Host ""
Write-Host "Compilando Cloud Functions..." -ForegroundColor Cyan
npm --prefix functions run build
if ($LASTEXITCODE -ne 0) {
    throw "La compilacion de Cloud Functions fallo."
}

# ------------------------------------------------------------
# Entorno LOCAL de Functions
# ------------------------------------------------------------
# Webpay permanece en Integration/Sandbox. El return_url apunta al puente
# HTTP del Functions Emulator; ese puente redirige luego a Ionic :8100.
$FunctionsEnvLocal = Join-Path $ProjectRoot "functions\.env.local"
$WebAppUrl = "http://localhost:8100"
$WebpayBridgeUrl = "http://127.0.0.1:5001/$ProjectId/southamerica-west1/webpayReturn"

$FunctionsEnvContent = @"
SERVIGO_ENV=development
PUSH_ENABLED=false
SERVIGO_WEB_APP_URL=$WebAppUrl
WEBPAY_RETURN_URL=$WebpayBridgeUrl
WEBPAY_MODE=integration
"@

$Utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $FunctionsEnvLocal,
    $FunctionsEnvContent.Trim() + [Environment]::NewLine,
    $Utf8WithoutBom
)

# También se exportan al proceso padre para que el emulador y sus hijos
# reciban exactamente la misma configuracion.
$env:SERVIGO_ENV = "development"
$env:PUSH_ENABLED = "false"
$env:SERVIGO_WEB_APP_URL = $WebAppUrl
$env:WEBPAY_RETURN_URL = $WebpayBridgeUrl
$env:WEBPAY_MODE = "integration"

Write-Host "[OK] Functions configuradas para entorno local." -ForegroundColor Green
Write-Host "     App:    $WebAppUrl" -ForegroundColor Gray
Write-Host "     Webpay: Integration/Sandbox" -ForegroundColor Gray
Write-Host "     Return: $WebpayBridgeUrl" -ForegroundColor Gray
Write-Host ""

$DefaultDataFolder = Join-Path $ProjectRoot ".firebase-emulator-data"

if ([string]::IsNullOrWhiteSpace($ImportPath)) {
    if (Test-Path (Join-Path $DefaultDataFolder "firebase-export-metadata.json")) {
        $ImportPath = $DefaultDataFolder
    }
}
else {
    $ImportPath = (Resolve-Path $ImportPath).Path
}

if (-not (Test-Path $DefaultDataFolder)) {
    New-Item -ItemType Directory -Path $DefaultDataFolder -Force | Out-Null
}

Write-Host "Emuladores:" -ForegroundColor Cyan
Write-Host "  Auth       http://127.0.0.1:9099"
Write-Host "  Firestore  http://127.0.0.1:8080"
Write-Host "  Functions  http://127.0.0.1:5001"
Write-Host "  Storage    http://127.0.0.1:9199"
Write-Host "  UI         http://127.0.0.1:4000"
Write-Host ""

if (-not [string]::IsNullOrWhiteSpace($ImportPath)) {
    Write-Host "Importando datos desde: $ImportPath" -ForegroundColor Green

    firebase emulators:start `
        --project $ProjectId `
        --only auth,firestore,functions,storage `
        --import="$ImportPath" `
        --export-on-exit="$DefaultDataFolder"
}
else {
    Write-Host "No hay exportacion previa. Se iniciara un entorno limpio." -ForegroundColor Yellow
    Write-Host "Al cerrar con Ctrl+C se guardara en: $DefaultDataFolder" -ForegroundColor Gray

    firebase emulators:start `
        --project $ProjectId `
        --only auth,firestore,functions,storage `
        --export-on-exit="$DefaultDataFolder"
}

exit $LASTEXITCODE
