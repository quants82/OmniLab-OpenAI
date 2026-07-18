$ErrorActionPreference = "Stop"

function Assert-LastExitCode([string]$step) {
    if ($LASTEXITCODE -ne 0) {
        throw "$step failed with exit code $LASTEXITCODE."
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend_Ominilab"
$frontendDir = Join-Path $repoRoot "frontend_Ominilab"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$testDatabase = Join-Path $env:TEMP "ominilab-ci-$PID.db"

if (-not (Test-Path $backendPython)) {
    throw "Backend virtual environment is missing. Create backend_Ominilab\.venv first."
}

Write-Host "[1/4] Checking backend syntax"
& $backendPython -m compileall -q `
    (Join-Path $backendDir "main.py") `
    (Join-Path $backendDir "config.py") `
    (Join-Path $backendDir "database.py") `
    (Join-Path $backendDir "dependencies.py") `
    (Join-Path $backendDir "security.py") `
    (Join-Path $backendDir "routers")
Assert-LastExitCode "Backend syntax check"

Write-Host "[2/4] Running backend smoke tests"
$previousDatabasePath = $env:DATABASE_PATH
$previousAppSecret = $env:APP_SECRET
$previousDemoUsername = $env:DEMO_USERNAME
$previousDemoPassword = $env:DEMO_PASSWORD

try {
    $env:DATABASE_PATH = $testDatabase
    $env:APP_SECRET = "local-ci-only-secret"
    $env:DEMO_USERNAME = "judge"
    $env:DEMO_PASSWORD = "ominilab-demo"
    Push-Location $backendDir
    try {
        & $backendPython -m pytest -q tests
        Assert-LastExitCode "Backend smoke tests"
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($null -eq $previousDatabasePath) { Remove-Item Env:DATABASE_PATH -ErrorAction SilentlyContinue } else { $env:DATABASE_PATH = $previousDatabasePath }
    if ($null -eq $previousAppSecret) { Remove-Item Env:APP_SECRET -ErrorAction SilentlyContinue } else { $env:APP_SECRET = $previousAppSecret }
    if ($null -eq $previousDemoUsername) { Remove-Item Env:DEMO_USERNAME -ErrorAction SilentlyContinue } else { $env:DEMO_USERNAME = $previousDemoUsername }
    if ($null -eq $previousDemoPassword) { Remove-Item Env:DEMO_PASSWORD -ErrorAction SilentlyContinue } else { $env:DEMO_PASSWORD = $previousDemoPassword }
    Remove-Item -LiteralPath $testDatabase -Force -ErrorAction SilentlyContinue
}

Write-Host "[3/4] Installing locked frontend dependencies"
& npm.cmd --prefix $frontendDir ci
Assert-LastExitCode "Frontend dependency install"

Write-Host "[4/4] Building frontend"
$previousApiUrl = $env:PUBLIC_API_URL
$previousSiteUrl = $env:PUBLIC_SITE_URL

try {
    $env:PUBLIC_API_URL = "https://ominilab.vatli365.vn"
    $env:PUBLIC_SITE_URL = "https://ominilab.vatli365.vn"
    & npm.cmd --prefix $frontendDir run build
    Assert-LastExitCode "Frontend build"
}
finally {
    if ($null -eq $previousApiUrl) { Remove-Item Env:PUBLIC_API_URL -ErrorAction SilentlyContinue } else { $env:PUBLIC_API_URL = $previousApiUrl }
    if ($null -eq $previousSiteUrl) { Remove-Item Env:PUBLIC_SITE_URL -ErrorAction SilentlyContinue } else { $env:PUBLIC_SITE_URL = $previousSiteUrl }
}

Write-Host "Local backend and frontend checks completed successfully."
