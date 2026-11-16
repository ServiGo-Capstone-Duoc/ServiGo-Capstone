param(
    [string]$ProjectId = "servigo-dev"
)

$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory
Set-Location $ProjectRoot

function Assert-Condition {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SERVIGO - VALIDACION DE PRODUCCION REAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Assert-Condition (Test-Path ".\firebase.json") "No se encontro firebase.json."
Assert-Condition (Test-Path ".\src\environments\environment.prod.ts") "No se encontro environment.prod.ts."
Assert-Condition (Test-Path ".\functions\src\index.ts") "No se encontraron Cloud Functions."

$EnvironmentProd = Get-Content ".\src\environments\environment.prod.ts" -Raw
Assert-Condition ($EnvironmentProd -match "useFirebaseEmulators:\s*false") "Produccion todavia intenta usar emuladores."

$FirebaseConfig = Get-Content ".\firebase.json" -Raw | ConvertFrom-Json
Assert-Condition ($null -ne $FirebaseConfig.firestore) "Firestore no esta configurado."
Assert-Condition ($FirebaseConfig.firestore.indexes -eq "firestore.indexes.json") "Falta firestore.indexes.json en firebase.json."
Assert-Condition (Test-Path ".\firestore.indexes.json") "No se encontro firestore.indexes.json."
Assert-Condition ($null -ne $FirebaseConfig.hosting) "Firebase Hosting no esta configurado."
Assert-Condition ($FirebaseConfig.hosting.public -eq "www") "Hosting debe publicar la carpeta www."

$WebpayRewrite = @($FirebaseConfig.hosting.rewrites) | Where-Object {
    $_.source -eq "/api/webpay-return" -and
    $_.function.functionId -eq "webpayReturn"
}
Assert-Condition ($null -ne $WebpayRewrite) "Falta el puente HTTP /api/webpay-return."

$CapacitorConfig = Get-Content ".\capacitor.config.ts" -Raw
Assert-Condition ($CapacitorConfig -notmatch "androidScheme\s*:\s*'http'") "Capacitor conserva androidScheme=http, configuracion solo valida para emuladores."

$EnvPath = ".\functions\.env.$ProjectId"
Assert-Condition (Test-Path $EnvPath) "Falta $EnvPath. Ejecuta deploy-real-firebase.ps1 para generarlo."

$FunctionsEnv = Get-Content $EnvPath -Raw
Assert-Condition ($FunctionsEnv -match "SERVIGO_ENV=staging|SERVIGO_ENV=production") "SERVIGO_ENV debe ser staging o production."
Assert-Condition ($FunctionsEnv -match "SERVIGO_WEB_APP_URL=https://") "SERVIGO_WEB_APP_URL debe usar HTTPS."
Assert-Condition ($FunctionsEnv -match "WEBPAY_RETURN_URL=https://") "WEBPAY_RETURN_URL debe usar HTTPS."
Assert-Condition ($FunctionsEnv -match "WEBPAY_MODE=integration|WEBPAY_MODE=production") "WEBPAY_MODE debe ser integration o production."

Write-Host "[OK] Firebase real habilitado; emuladores desactivados." -ForegroundColor Green
Write-Host "[OK] Índices de Firestore configurados." -ForegroundColor Green
Write-Host "[OK] Hosting SPA configurado." -ForegroundColor Green
Write-Host "[OK] Retorno Webpay HTTP configurado." -ForegroundColor Green
Write-Host "[OK] Capacitor preparado para HTTPS." -ForegroundColor Green
Write-Host "[OK] Variables de Functions disponibles." -ForegroundColor Green
Write-Host "[OK] Ambiente Webpay declarado explicitamente." -ForegroundColor Green
Write-Host ""
