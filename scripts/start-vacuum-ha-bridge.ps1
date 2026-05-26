$ErrorActionPreference = "Stop"

# Fyll inn lokale testverdier her hvis ønskelig, eller sett env i samme PowerShell-session før scriptet kjøres.
# Ikke legg ekte token i repo. La feltet stå tomt og bruk helst $env:LYNELL_HA_TOKEN i terminalen.
$ConfiguredHaBaseUrl = ""
$ConfiguredHaToken = ""
$ConfiguredVacuumEntityId = ""

function Set-EnvIfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Value
  )

  $currentValue = [Environment]::GetEnvironmentVariable($Name, "Process")

  if ([string]::IsNullOrWhiteSpace($currentValue) -and -not [string]::IsNullOrWhiteSpace($Value)) {
    [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
  }
}

function Get-EnvStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [switch]$Secret
  )

  $value = [Environment]::GetEnvironmentVariable($Name, "Process")

  if ([string]::IsNullOrWhiteSpace($value)) {
    return "mangler"
  }

  if ($Secret) {
    return "satt (skjult)"
  }

  return $value
}

$env:LYNELL_VACUUM_ENABLED = "true"
$env:LYNELL_VACUUM_PROVIDER = "homeAssistantBridge"

Set-EnvIfMissing -Name "LYNELL_HA_BASE_URL" -Value $ConfiguredHaBaseUrl
Set-EnvIfMissing -Name "LYNELL_HA_TOKEN" -Value $ConfiguredHaToken
Set-EnvIfMissing -Name "LYNELL_HA_VACUUM_ENTITY_ID" -Value $ConfiguredVacuumEntityId

$missing = @()
if ([string]::IsNullOrWhiteSpace($env:LYNELL_HA_BASE_URL)) { $missing += "LYNELL_HA_BASE_URL" }
if ([string]::IsNullOrWhiteSpace($env:LYNELL_HA_TOKEN)) { $missing += "LYNELL_HA_TOKEN" }
if ([string]::IsNullOrWhiteSpace($env:LYNELL_HA_VACUUM_ENTITY_ID)) { $missing += "LYNELL_HA_VACUUM_ENTITY_ID" }

Write-Host ""
Write-Host "Starter Lynell bridge med Home Assistant vacuum aktivert..."
Write-Host "Provider: homeAssistantBridge"
Write-Host "HA URL: $(Get-EnvStatus -Name 'LYNELL_HA_BASE_URL')"
Write-Host "HA token: $(Get-EnvStatus -Name 'LYNELL_HA_TOKEN' -Secret)"
Write-Host "Vacuum entity: $(Get-EnvStatus -Name 'LYNELL_HA_VACUUM_ENTITY_ID')"

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Mangler env før live test: $($missing -join ', ')"
  Write-Host "Bridge starter likevel. /api/vacuum/status skal forklare hva som mangler."
} else {
  Write-Host ""
  Write-Host "Klar for HA status-test. Start med status før kommandoer."
}

Write-Host ""
Write-Host "Test-endepunkter:"
Write-Host "GET  http://localhost:8787/api/vacuum/status"
Write-Host "POST http://localhost:8787/api/vacuum/connect"
Write-Host "POST http://localhost:8787/api/vacuum/command  { `"command`": `"status`" }"
Write-Host ""

npm run bridge
