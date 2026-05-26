$ErrorActionPreference = "Stop"

$env:LYNELL_CAST_ENABLED = "true"
$env:LYNELL_CAST_DISCOVERY_ENABLED = "true"

Write-Host "Starter Lynell bridge med Cast discovery aktivert..."
Write-Host "Status:   GET  http://localhost:8787/api/cast/status"
Write-Host "Discover: POST http://localhost:8787/api/cast/discover"
Write-Host "Playback er fortsatt foundation og ikke full Cast-avspilling."

npm run bridge
