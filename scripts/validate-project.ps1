param(
    [switch]$StaticOnly
)

$ErrorActionPreference = "Stop"

$ProjectRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

Set-Location $ProjectRoot

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "== $Name ==" -ForegroundColor Cyan

    & $Action

    if (
        $LASTEXITCODE -ne 0
    ) {
        throw "$Name falló con código $LASTEXITCODE."
    }
}

Invoke-Step "Lint frontend" {
    npm run lint
}

Invoke-Step "Build frontend" {
    npm run build
}

Invoke-Step "Lint Functions" {
    npm run lint:functions
}

Invoke-Step "Build Functions" {
    npm run build:functions
}

if (
    -not $StaticOnly
) {
    Invoke-Step "Pruebas unitarias frontend" {
        npm run test:unit
    }

    Invoke-Step "Pruebas unitarias Functions" {
        npm run test:functions
    }
}

if (
    Test-Path ".git"
) {
    Invoke-Step "Integridad Git" {
        git diff --check
    }
}

Write-Host ""
Write-Host "Validación completada correctamente." -ForegroundColor Green
