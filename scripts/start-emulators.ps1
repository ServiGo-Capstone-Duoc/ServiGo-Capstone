$ErrorActionPreference = "Stop"

Set-Location "C:\Dev\ServiGo"


Write-Host ""
Write-Host "========================================="
Write-Host " SERVIGO - FIREBASE EMULATOR SUITE"
Write-Host "========================================="
Write-Host ""


# =========================================
# JAVA 21
# =========================================

$javaHome =
    "$env:USERPROFILE\.jdks\jbr-21.0.11"


if (
    Test-Path $javaHome
) {

    $env:JAVA_HOME =
        $javaHome

    $env:Path =
        "$env:JAVA_HOME\bin;$env:Path"


    Write-Host "[ServiGo] JAVA_HOME:"
    Write-Host $env:JAVA_HOME

} else {

    Write-Warning `
        "[ServiGo] No se encontro Java en $javaHome"

    Write-Warning `
        "[ServiGo] Se utilizara la configuracion actual del sistema."
}


# =========================================
# DIRECTORIO DE PERSISTENCIA
# =========================================

$emulatorData =
    ".\emulator-data"


$metadataFile =
    Join-Path `
        $emulatorData `
        "firebase-export-metadata.json"


Write-Host ""
Write-Host "[ServiGo] Datos Emulator:"
Write-Host $emulatorData
Write-Host ""


# =========================================
# ARRANQUE
# =========================================

if (
    Test-Path $metadataFile
) {

    Write-Host `
        "[ServiGo] Restaurando datos existentes..."

    Write-Host ""

    firebase emulators:start `
        --only auth,firestore,functions `
        --import="$emulatorData" `
        --export-on-exit="$emulatorData"

} else {

    Write-Host `
        "[ServiGo] Primera ejecucion sin datos persistidos."

    Write-Host `
        "[ServiGo] Los datos se guardaran automaticamente al cerrar."

    Write-Host ""

    firebase emulators:start `
        --only auth,firestore,functions `
        --export-on-exit="$emulatorData"
}