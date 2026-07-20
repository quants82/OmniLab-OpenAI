# Local ESP32 flashing fallback for boards with native USB-Serial-JTAG
# (VID 0x303a), where browser WebSerial flashing may stall on large writes.
# Usage:  .\ops\flash-local.ps1 -Port COM5 [-Experiment harmonic-motion-bmi160] [-Chip esp32c3]
param(
    [Parameter(Mandatory = $true)][string]$Port,
    [string]$Experiment = "harmonic-motion-bmi160",
    [string]$Chip = "esp32c3",
    [string]$BackendHost = "ominilab.vatli365.vn"
)
$ErrorActionPreference = "Stop"

function Assert-LastExitCode([string]$step) {
    if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE." }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot "frontend_Ominilab\esp32"

$experiments = @{
    "harmonic-motion-bmi160" = @{ source = "esp32_shm_bmi160.py";    extra = @("vatli_auth.py") }
    "specific-heat"          = @{ source = "esp32_specific_heat.py"; extra = @("ina226.py", "i2c_lcd.py", "vatli_auth.py") }
    "induction"              = @{ source = "esp32_induction.py";     extra = @("ads1115.py", "vatli_auth.py") }
    "capacitor"              = @{ source = "esp32_capacitor.py";     extra = @("vatli_auth.py") }
    "lamp-va"                = @{ source = "esp32_lamp_va.py";       extra = @("vatli_auth.py") }
    "resistor-va"            = @{ source = "esp32_resistor_va.py";   extra = @("vatli_auth.py") }
}
if (-not $experiments.ContainsKey($Experiment)) {
    throw "Unknown experiment '$Experiment'. Valid: $($experiments.Keys -join ', ')"
}

$baseImages = @{
    "esp32"   = @{ file = "esp32-v1.28.0.bin";    address = "0x1000" }
    "esp32c3" = @{ file = "esp32-c3-v1.28.0.bin"; address = "0x0" }
    "esp32s2" = @{ file = "esp32-s2-v1.28.0.bin"; address = "0x1000" }
    "esp32s3" = @{ file = "esp32-s3-v1.28.0.bin"; address = "0x0" }
    "esp32c6" = @{ file = "esp32-c6-v1.28.0.bin"; address = "0x0" }
}
if (-not $baseImages.ContainsKey($Chip)) {
    throw "Unknown chip '$Chip'. Valid: $($baseImages.Keys -join ', ')"
}

Write-Host "[1/5] Installing esptool and mpremote (user Python)"
py -3.13 -m pip install --quiet esptool mpremote
Assert-LastExitCode "pip install"

Write-Host "[2/5] Locating the MicroPython base image"
$image = $baseImages[$Chip]
$localImage = Join-Path $repoRoot "frontend_Ominilab\public\firmware\base\$($image.file)"
if (-not (Test-Path $localImage)) {
    $localImage = Join-Path $env:TEMP "ominilab-$($image.file)"
    Invoke-WebRequest "https://$BackendHost/firmware/base/$($image.file)" -OutFile $localImage
}
Write-Host "  image: $localImage"

Write-Host "[3/5] Erasing flash and writing MicroPython (python esptool handles USB-JTAG)"
py -3.13 -m esptool --chip $Chip --port $Port erase_flash
Assert-LastExitCode "erase_flash"
py -3.13 -m esptool --chip $Chip --port $Port write_flash -z $image.address $localImage
Assert-LastExitCode "write_flash"

Write-Host "[4/5] Waiting for MicroPython to boot"
Start-Sleep -Seconds 4

Write-Host "[5/5] Copying experiment source (backend host: $BackendHost)"
$staging = Join-Path $env:TEMP "ominilab-flash-$PID"
New-Item -ItemType Directory -Force $staging | Out-Null
$item = $experiments[$Experiment]
$mainSource = Get-Content -Raw (Join-Path $sourceDir $item.source)
$mainSource = $mainSource.Replace("your-backend.example.com", $BackendHost)
[System.IO.File]::WriteAllText((Join-Path $staging "main.py"), $mainSource, (New-Object System.Text.UTF8Encoding($false)))
foreach ($extra in $item.extra) {
    Copy-Item (Join-Path $sourceDir $extra) (Join-Path $staging $extra)
}
py -3.13 -m mpremote connect $Port fs cp (Join-Path $staging "main.py") :main.py
Assert-LastExitCode "copy main.py"
foreach ($extra in $item.extra) {
    py -3.13 -m mpremote connect $Port fs cp (Join-Path $staging $extra) ":$extra"
    Assert-LastExitCode "copy $extra"
}
py -3.13 -m mpremote connect $Port reset
Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done. The board is restarting with the '$Experiment' firmware."
Write-Host "Join its 'Ominilab-Setup-...' Wi-Fi hotspot, open 192.168.4.1, and enter your Wi-Fi."
Write-Host "The 12-character device ID is the MAC shown by the flasher page or serial output."
