param(
    [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

# ============================================================
# SERVIGO - INICIO DE FIREBASE EMULATOR SUITE
# Auth + Firestore + Functions + Storage
# ============================================================

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $ScriptDirectory
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SERVIGO - FIREBASE EMULATOR SUITE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proyecto:" -ForegroundColor Gray
Write-Host $ProjectRoot -ForegroundColor White
Write-Host ""

Set-Location $ProjectRoot

# ============================================================
# VALIDACIONES
# ============================================================

if (-not (Test-Path ".\firebase.json")) {
    Write-Host "[ERROR] No se encontro firebase.json." -ForegroundColor Red
    Write-Host "Ruta revisada: $ProjectRoot" -ForegroundColor Yellow
    exit 1
}

$FirebaseCommand = Get-Command firebase -ErrorAction SilentlyContinue

if ($null -eq $FirebaseCommand) {
    Write-Host "[ERROR] Firebase CLI no esta disponible." -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalalo con:" -ForegroundColor Yellow
    Write-Host "npm install -g firebase-tools" -ForegroundColor White
    exit 1
}

# ============================================================
# BUSCAR EXPORTACION PREVIA
# ============================================================

Write-Host "Buscando datos previos del emulador..." -ForegroundColor Cyan

$ExportMetadata = Get-ChildItem `
    -Path $ProjectRoot `
    -Recurse `
    -File `
    -Filter "firebase-export-metadata.json" `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\backup_" -and
        $_.FullName -notmatch "\\www\\"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

# ============================================================
# SI EXISTE EXPORTACION
# ============================================================

if ($null -ne $ExportMetadata) {

    $DataFolder = $ExportMetadata.Directory.FullName

    Write-Host ""
    Write-Host "[OK] Exportacion encontrada:" -ForegroundColor Green
    Write-Host $DataFolder -ForegroundColor White
    Write-Host ""
    Write-Host "Se cargaran y conservaran los datos de prueba." -ForegroundColor Gray
    Write-Host ""

    Write-Host "Emuladores:" -ForegroundColor Cyan
    Write-Host "  Auth      -> 127.0.0.1:9099"
    Write-Host "  Firestore -> segun firebase.json"
    Write-Host "  Functions -> segun firebase.json"
    Write-Host "  Storage   -> segun firebase.json"
    Write-Host "  Emulator UI -> http://127.0.0.1:4000"
    Write-Host ""

    firebase emulators:start `
        --only auth,firestore,functions,storage `
        --import="$DataFolder" `
        --export-on-exit="$DataFolder"

    exit $LASTEXITCODE
}

# ============================================================
# SI NO EXISTE EXPORTACION
# ============================================================

$DefaultDataFolder = Join-Path $ProjectRoot ".firebase-emulator-data"

if (-not (Test-Path $DefaultDataFolder)) {
    New-Item `
        -ItemType Directory `
        -Path $DefaultDataFolder `
        -Force |
        Out-Null
}

Write-Host ""
Write-Host "[INFO] No se encontro una exportacion previa." -ForegroundColor Yellow
Write-Host ""
Write-Host "Se iniciaran emuladores limpios." -ForegroundColor Gray
Write-Host "Al cerrarlos, los datos quedaran guardados en:" -ForegroundColor Gray
Write-Host $DefaultDataFolder -ForegroundColor White
Write-Host ""

Write-Host "Emuladores:" -ForegroundColor Cyan
Write-Host "  Auth      -> 127.0.0.1:9099"
Write-Host "  Firestore -> segun firebase.json"
Write-Host "  Functions -> segun firebase.json"
Write-Host "  Storage   -> segun firebase.json"
Write-Host "  Emulator UI -> http://127.0.0.1:4000"
Write-Host ""

firebase emulators:start `
    --only auth,firestore,functions,storage `
    --export-on-exit="$DefaultDataFolder"

exit $LASTEXITCODE