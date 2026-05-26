$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

function Set-EnvDefault {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )

  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
    [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
  }
}

function Read-EnvIfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Prompt
  )

  if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
    return
  }

  $value = Read-Host $Prompt
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    [Environment]::SetEnvironmentVariable($Name, $value.Trim(), "Process")
  }
}

function Read-SecretEnvIfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Prompt
  )

  if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
    return
  }

  $secureValue = Read-Host $Prompt -AsSecureString
  if ($secureValue.Length -eq 0) {
    return
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if (-not [string]::IsNullOrWhiteSpace($plainValue)) {
      [Environment]::SetEnvironmentVariable($Name, $plainValue, "Process")
    }
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Test-EnvSet {
  param([Parameter(Mandatory = $true)][string]$Name)
  return -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))
}

function Get-SecretStatus {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (Test-EnvSet -Name $Name) {
    return "satt (skjult)"
  }

  return "mangler"
}

function Get-LynellLanIp {
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
      } |
      Sort-Object -Property InterfaceMetric |
      Select-Object -First 1 -ExpandProperty IPAddress

    if (-not [string]::IsNullOrWhiteSpace($ip)) {
      return $ip
    }
  }
  catch {
  }

  try {
    $ipconfigIp = ipconfig |
      Select-String -Pattern "IPv4.*?:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)" |
      ForEach-Object { $_.Matches[0].Groups[1].Value } |
      Where-Object { $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
      Select-Object -First 1

    if (-not [string]::IsNullOrWhiteSpace($ipconfigIp)) {
      return $ipconfigIp
    }
  }
  catch {
  }

  return "<LAN-IP>"
}

Set-EnvDefault -Name "LYNELL_SYSTEM_MODE" -Value "live"
Set-EnvDefault -Name "LYNELL_RUNTIME_MODE" -Value "live"
Set-EnvDefault -Name "LYNELL_BRIDGE_HOST" -Value "0.0.0.0"
Set-EnvDefault -Name "LYNELL_BRIDGE_PORT" -Value "8787"
Set-EnvDefault -Name "LYNELL_VACUUM_ENABLED" -Value "true"
Set-EnvDefault -Name "LYNELL_VACUUM_PROVIDER" -Value "dreameCloud"
Set-EnvDefault -Name "LYNELL_DREAME_CLOUD_ENABLED" -Value "true"
Set-EnvDefault -Name "LYNELL_DREAME_EXPERIMENTAL_LOGIN" -Value "true"
Set-EnvDefault -Name "LYNELL_DREAME_SELECTED_CLIENT" -Value "dreameHomeReverseEngineered"
Set-EnvDefault -Name "LYNELL_DREAME_AUTH_PROFILE" -Value "explicit-form-urlencoded"
Set-EnvDefault -Name "LYNELL_DREAME_REGION" -Value "eu"
Set-EnvDefault -Name "LYNELL_DREAME_COUNTRY" -Value "NO"
Set-EnvDefault -Name "LYNELL_CAST_ENABLED" -Value "true"
Set-EnvDefault -Name "LYNELL_CAST_DISCOVERY_ENABLED" -Value "true"

Read-EnvIfMissing -Name "LYNELL_DREAME_USERNAME" -Prompt "Dreame username/e-post (Enter for aa hoppe over)"
Read-SecretEnvIfMissing -Name "LYNELL_DREAME_PASSWORD" -Prompt "Dreame passord (skjules, Enter for aa hoppe over)"

$missing = @()
if (-not (Test-EnvSet -Name "LYNELL_DREAME_USERNAME")) { $missing += "LYNELL_DREAME_USERNAME" }
if (-not (Test-EnvSet -Name "LYNELL_DREAME_PASSWORD")) { $missing += "LYNELL_DREAME_PASSWORD" }

$bridgePort = [Environment]::GetEnvironmentVariable("LYNELL_BRIDGE_PORT", "Process")
$bridgeHost = [Environment]::GetEnvironmentVariable("LYNELL_BRIDGE_HOST", "Process")
$lanIp = Get-LynellLanIp

Write-Host ""
Write-Host "Lynell Live Mode startup"
Write-Host "-------------------------"
Write-Host "Live Mode:            $env:LYNELL_SYSTEM_MODE"
Write-Host "Bridge bind:          $bridgeHost`:$bridgePort"
Write-Host "Local bridge:         http://localhost:$bridgePort/api/runtime/health"
Write-Host "LAN bridge:           http://$lanIp`:$bridgePort/api/runtime/health"
Write-Host "Frontend local:       http://localhost:3000"
Write-Host "Frontend LAN:         http://$lanIp`:3000"
Write-Host "Boot flow:            registry -> services -> restore -> providers -> realtime"
Write-Host "Vacuum provider:      $env:LYNELL_VACUUM_PROVIDER"
Write-Host "Dreame enabled:       $env:LYNELL_DREAME_CLOUD_ENABLED"
Write-Host "Dreame region/country:$env:LYNELL_DREAME_REGION / $env:LYNELL_DREAME_COUNTRY"
Write-Host "Dreame username:      $(Get-SecretStatus -Name 'LYNELL_DREAME_USERNAME')"
Write-Host "Dreame password:      $(Get-SecretStatus -Name 'LYNELL_DREAME_PASSWORD')"
Write-Host "Cast enabled:         $env:LYNELL_CAST_ENABLED"
Write-Host "Cast discovery:       $env:LYNELL_CAST_DISCOVERY_ENABLED"

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Dreame status-only kan ikke koble helt foer disse env-verdiene er satt:"
  foreach ($name in $missing) {
    Write-Host " - $name"
  }
  Write-Host "Bridge starter likevel med Live Mode, Cast og trygg missing-env status."
}

Write-Host ""
Write-Host "Starter bridge med runtime boot diagnostics..."
npm run bridge
