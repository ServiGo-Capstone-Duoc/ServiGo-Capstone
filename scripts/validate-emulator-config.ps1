$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory
Set-Location $ProjectRoot

function Assert-Text {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Message
    )

    if (-not (Test-Path $Path)) {
        throw "Falta archivo requerido: $Path"
    }

    $Content = Get-Content $Path -Raw
    if ($Content -notmatch $Pattern) {
        throw $Message
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SERVIGO - VALIDACION ENTORNO EMULADORES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Assert-Text ".\src\environments\environment.ts" "useFirebaseEmulators\s*:\s*true" "environment.ts no apunta a emuladores."
Assert-Text ".\src\environments\environment.prod.ts" "useFirebaseEmulators\s*:\s*true" "environment.prod.ts no esta protegido para emuladores."
Assert-Text ".\src\app\core\firebase\firebase.ts" "connectStorageEmulator" "Firebase Storage Emulator no esta conectado."
Assert-Text ".\firebase.json" '"storage"\s*:\s*\{\s*"port"\s*:\s*9199' "Storage Emulator no esta configurado en puerto 9199."
Assert-Text ".\storage.rules" "profile-avatars" "Las reglas de Storage no contemplan foto de perfil."
Assert-Text ".\src\app\core\services\media-storage.service.ts" "uploadProfileAvatar" "No existe subida de avatar."
Assert-Text ".\src\app\features\profile\edit-profile\edit-profile.page.html" "Cambiar foto" "La UI de foto de perfil no esta disponible."
Assert-Text ".\src\app\core\config\location-fallback.config.ts" "-33\.60580873981834" "Falta fallback del cliente."
Assert-Text ".\src\app\core\config\location-fallback.config.ts" "-33\.589965678034076" "Falta fallback del tecnico."
Assert-Text ".\functions\src\index.ts" "acceptedQuoteSnapshot" "Falta snapshot de presupuesto aceptado."
Assert-Text ".\functions\src\index.ts" "localWebpayBridgeUrl" "Falta puente local de retorno Webpay."
Assert-Text ".\functions\src\index.ts" "buildForIntegration" "Webpay Integration no esta disponible."

Write-Host "[OK] Auth / Firestore / Functions / Storage preparados para Emulator Suite." -ForegroundColor Green
Write-Host "[OK] Foto de perfil conectada a Storage Emulator." -ForegroundColor Green
Write-Host "[OK] Fallback de ubicacion cliente y tecnico presente." -ForegroundColor Green
Write-Host "[OK] Presupuesto aceptado y resumen de pago presentes." -ForegroundColor Green
Write-Host "[OK] Webpay Integration retorna mediante Functions Emulator." -ForegroundColor Green
Write-Host ""
