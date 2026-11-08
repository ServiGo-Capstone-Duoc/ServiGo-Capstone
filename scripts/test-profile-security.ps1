$ErrorActionPreference = "Stop"

$ProjectRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

Set-Location $ProjectRoot

Write-Host "Ejecutando pruebas aisladas de seguridad de perfiles..." -ForegroundColor Cyan
Write-Host "Detén antes cualquier emulador que use los puertos 8080 o 9099." -ForegroundColor DarkGray

firebase emulators:exec `
    --only auth,firestore `
    "node security-tests/test-profile-security.mjs"

if (
    $LASTEXITCODE -ne 0
) {
    throw "Las pruebas de seguridad fallaron con código $LASTEXITCODE."
}
