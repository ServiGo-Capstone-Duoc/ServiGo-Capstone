param(
    [string]$ProjectId = "servigo-dev",
    [string]$WebAppUrl = "",
    [switch]$InstallDependencies,
    [switch]$EnablePush,
    [switch]$IUnderstandRealFirebase
)

$ErrorActionPreference = "Stop"

if (-not $IUnderstandRealFirebase) {
    throw "Esta entrega esta configurada para Firebase Emulator Suite. El despliegue real esta bloqueado por seguridad. Si en el futuro decides habilitar Firebase real, ejecuta este script explicitamente con -IUnderstandRealFirebase despues de revisar costos y configuracion."
}

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory
Set-Location $ProjectRoot

if ([string]::IsNullOrWhiteSpace($WebAppUrl)) {
    $WebAppUrl = "https://$ProjectId.web.app"
}

try {
    $ParsedWebAppUrl = [Uri]$WebAppUrl
} catch {
    throw "WebAppUrl no es una URL valida: $WebAppUrl"
}

if ($ParsedWebAppUrl.Scheme -ne "https") {
    throw "WebAppUrl debe utilizar HTTPS para las pruebas reales."
}

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
$FirebaseCommand = Get-Command firebase -ErrorAction SilentlyContinue

if ($null -eq $NodeCommand -or $null -eq $NpmCommand) {
    throw "Node.js y npm deben estar instalados."
}

if ($null -eq $FirebaseCommand) {
    throw "Firebase CLI no esta instalado. Ejecuta: npm install -g firebase-tools"
}

$NodeVersion = (& node -p "process.versions.node").Trim()
Write-Host "Node.js: $NodeVersion" -ForegroundColor Gray
Write-Host "Firebase project: $ProjectId" -ForegroundColor Gray
Write-Host "Web app: $WebAppUrl" -ForegroundColor Gray
Write-Host ""

$PushEnabled = if ($EnablePush) { "true" } else { "false" }
$FunctionsEnvPath = Join-Path $ProjectRoot "functions\.env.$ProjectId"
$FunctionsEnvContent = @"
SERVIGO_ENV=staging
PUSH_ENABLED=$PushEnabled
SERVIGO_WEB_APP_URL=$WebAppUrl
WEBPAY_RETURN_URL=$WebAppUrl/api/webpay-return
WEBPAY_MODE=integration
"@

$Utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $FunctionsEnvPath,
    $FunctionsEnvContent.Trim() + [Environment]::NewLine,
    $Utf8WithoutBom
)

Write-Host "[OK] Variables escritas en functions\.env.$ProjectId" -ForegroundColor Green

if ($InstallDependencies) {
    Write-Host "Instalando dependencias del frontend..." -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci fallo." }

    Write-Host "Instalando dependencias de Functions..." -ForegroundColor Cyan
    npm --prefix functions ci
    if ($LASTEXITCODE -ne 0) { throw "npm --prefix functions ci fallo." }
}

powershell -ExecutionPolicy Bypass -File ".\scripts\check-production-config.ps1" -ProjectId $ProjectId
if ($LASTEXITCODE -ne 0) { throw "La validacion de configuracion fallo." }

Write-Host "Compilando Cloud Functions..." -ForegroundColor Cyan
npm run build:functions
if ($LASTEXITCODE -ne 0) { throw "La compilacion de Functions fallo." }

Write-Host "Compilando Ionic/Angular para produccion..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "La compilacion del frontend fallo." }

Write-Host "Desplegando reglas, índices, Storage, Functions y Hosting..." -ForegroundColor Cyan
firebase deploy `
    --project $ProjectId `
    --only "firestore:rules,firestore:indexes,storage,functions,hosting"

if ($LASTEXITCODE -ne 0) {
    throw "Firebase deploy fallo. Revisa el detalle anterior."
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " SERVIGO DESPLEGADO EN FIREBASE REAL" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host $WebAppUrl -ForegroundColor White
Write-Host ""
Write-Host "Webpay permanece en ambiente de integracion; no uses tarjetas reales." -ForegroundColor Yellow
