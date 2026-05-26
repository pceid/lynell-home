$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BridgeScript = Join-Path $PSScriptRoot "start-bridge.ps1"
$FrontendScript = Join-Path $PSScriptRoot "start-frontend.ps1"

$PwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue
$PowerShellExe = if ($PwshCommand) { $PwshCommand.Source } else { $null }
if (-not $PowerShellExe) {
  $PowerShellExe = (Get-Command powershell -ErrorAction Stop).Source
}

function Start-LynellWindow {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,
    [Parameter(Mandatory = $true)]
    [string] $ScriptPath
  )

  if (-not (Test-Path $ScriptPath)) {
    throw "$Name-script mangler: $ScriptPath"
  }

  Write-Host "$Name starter..." -ForegroundColor Cyan
  Start-Process -FilePath $PowerShellExe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $ScriptPath
  )
  Write-Host "$Name startet i eget PowerShell-vindu." -ForegroundColor Green
}

try {
  Write-Host "Lynell startet fra $ProjectRoot" -ForegroundColor Cyan
  Write-Host "Opening bridge and frontend in separate PowerShell windows..." -ForegroundColor DarkGray
  Write-Host ""

  Start-LynellWindow -Name "Bridge" -ScriptPath $BridgeScript
  Start-Sleep -Seconds 2
  Start-LynellWindow -Name "Frontend" -ScriptPath $FrontendScript

  Write-Host ""
  Write-Host "Lynell start commands sent." -ForegroundColor Green
  Write-Host "Open http://localhost:3000 on this PC, or http://SERVER-IP:3000 from your phone." -ForegroundColor DarkGray
}
catch {
  Write-Host ""
  Write-Host "Lynell kunne ikke starte korrekt." -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
  Write-Host "Press Enter to close this window." -ForegroundColor Yellow
  Read-Host
}
