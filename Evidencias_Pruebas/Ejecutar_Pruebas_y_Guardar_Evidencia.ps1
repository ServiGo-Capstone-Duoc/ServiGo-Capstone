param(
  [string]$ProjectRoot = "C:\Dev\ServiGo",
  [string]$Executor = $env:USERNAME
)

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$evidenceRoot = Join-Path $ProjectRoot "evidencias-pruebas\10_Logs_Automatizados"
New-Item -ItemType Directory -Force $evidenceRoot | Out-Null

function Invoke-EvidenceTest {
  param([string]$Name,[scriptblock]$Command)
  $file = Join-Path $evidenceRoot ("{0}_{1}.txt" -f $Name,$timestamp)
  "SERVIGO - EVIDENCIA AUTOMATIZADA" | Tee-Object -FilePath $file
  ("Fecha: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")) | Tee-Object -FilePath $file -Append
  ("Ejecutor: {0}" -f $Executor) | Tee-Object -FilePath $file -Append
  ("Prueba: {0}" -f $Name) | Tee-Object -FilePath $file -Append
  "============================================================" | Tee-Object -FilePath $file -Append
  & $Command 2>&1 | Tee-Object -FilePath $file -Append
  ("ExitCode: {0}" -f $LASTEXITCODE) | Tee-Object -FilePath $file -Append
  "" | Tee-Object -FilePath $file -Append
}

Set-Location (Join-Path $ProjectRoot "functions")
Invoke-EvidenceTest "UNIT_functions" { npm run test:unit }

Set-Location $ProjectRoot

$tests = @(
  @{ Name="SEC_firestore"; File="security-tests\test-firestore-rules.mjs" },
  @{ Name="SEC_chat"; File="security-tests\test-chat-security.mjs" },
  @{ Name="SEC_cancel_service"; File="security-tests\test-cancel-service.mjs" },
  @{ Name="SEC_analytics"; File="security-tests\test-analytics-security.mjs" }
)

foreach ($test in $tests) {
  $path = Join-Path $ProjectRoot $test.File
  if (Test-Path $path) {
    Invoke-EvidenceTest $test.Name { node $path }
  } else {
    $missing = Join-Path $evidenceRoot ("{0}_{1}_MISSING.txt" -f $test.Name,$timestamp)
    "Archivo no encontrado: $path" | Set-Content $missing
  }
}

Write-Host ""
Write-Host "Evidencias guardadas en: $evidenceRoot"
