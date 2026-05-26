$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

Write-Host "Lynell bridge starter fra $ProjectRoot" -ForegroundColor Cyan
Write-Host "Bridge listens on port 8787." -ForegroundColor DarkGray
Write-Host ""

try {
  Write-Host "Bridge startet: npm run bridge" -ForegroundColor Green
  npm run bridge
  if ($LASTEXITCODE -ne 0) {
    throw "npm run bridge avsluttet med kode $LASTEXITCODE"
  }
}
catch {
  Write-Host ""
  Write-Host "Bridge feilet ved start eller under drift." -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
}
finally {
  Write-Host ""
  Write-Host "Bridge process ended. Press Enter to close this window." -ForegroundColor Yellow
  Read-Host
}
