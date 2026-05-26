param(
  [switch]$Dev
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

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

$lanIp = Get-LynellLanIp

Write-Host "Lynell frontend starter fra $ProjectRoot" -ForegroundColor Cyan
if ($Dev) {
  Write-Host "Mode: dev server (npm run dev -- --host 0.0.0.0)" -ForegroundColor Yellow
  Write-Host "Frontend local: http://localhost:5173" -ForegroundColor DarkGray
  Write-Host "Frontend LAN:   http://$lanIp`:5173" -ForegroundColor DarkGray
  Write-Host "Åpne fra mobil: http://$lanIp`:5173" -ForegroundColor Green
}
else {
  Write-Host "Mode: live test dist server (build first, then serve dist)" -ForegroundColor Yellow
  Write-Host "Frontend will listen on port 3000 for LAN clients." -ForegroundColor DarkGray
  Write-Host "Frontend local: http://localhost:3000" -ForegroundColor DarkGray
  Write-Host "Frontend LAN:   http://$lanIp`:3000" -ForegroundColor DarkGray
  Write-Host "Åpne fra mobil: http://$lanIp`:3000" -ForegroundColor Green
}
Write-Host "Bridge local:   http://localhost:8787/api/runtime/health" -ForegroundColor DarkGray
Write-Host "Bridge LAN:     http://$lanIp`:8787/api/runtime/health" -ForegroundColor DarkGray
Write-Host "Mobil-sjekk: samme Wi-Fi/VLAN, Windows Firewall må tillate Node/port 3000 og bridge port 8787." -ForegroundColor Yellow
Write-Host "Hvis mobil ikke kommer inn: test først bridge LAN health-URL fra mobilen, deretter frontend LAN URL." -ForegroundColor Yellow
Write-Host ""

try {
  if ($Dev) {
    Write-Host "Frontend dev server starting..." -ForegroundColor Cyan
    npm run dev -- --host 0.0.0.0
    if ($LASTEXITCODE -ne 0) {
      throw "npm run dev avsluttet med kode $LASTEXITCODE"
    }
  }
  else {
    Write-Host "Build started: npm run build" -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
      throw "npm run build avsluttet med kode $LASTEXITCODE"
    }
    Write-Host "Build OK" -ForegroundColor Green
    Write-Host ""

    $serveTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "Serving dist timestamp: $serveTimestamp" -ForegroundColor Cyan
    Write-Host "Frontend startet: npx serve dist -l tcp://0.0.0.0:3000" -ForegroundColor Green
    npx serve dist -l tcp://0.0.0.0:3000
    if ($LASTEXITCODE -ne 0) {
      throw "npx serve avsluttet med kode $LASTEXITCODE"
    }
  }
}
catch {
  Write-Host ""
  Write-Host "Frontend feilet ved start eller under drift." -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
}
finally {
  Write-Host ""
  Write-Host "Frontend server ended. Press Enter to close this window." -ForegroundColor Yellow
  Read-Host
}
