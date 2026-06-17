param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [Parameter(Mandatory=$true)]
    [string]$Notes
)

$ErrorActionPreference = "Stop"
$Repo = "GMSnowFlakes/CRAMS-Inventory"
$ProjectDir = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRAMS Release Tool" -ForegroundColor Cyan
Write-Host "  Version: v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Bump version in config/version.php
Write-Host "[ 1/5 ] Bumping version to $Version..." -ForegroundColor Yellow
$versionFile = Join-Path $ProjectDir "config\version.php"
$content = Get-Content $versionFile -Raw
$content = $content -replace "'current' => '[^']*'", "'current' => '$Version'"
Set-Content $versionFile $content -Encoding utf8
Write-Host "        config/version.php updated." -ForegroundColor Green

# 2. Build frontend
Write-Host "[ 2/5 ] Building frontend assets..." -ForegroundColor Yellow
Push-Location $ProjectDir
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend build failed." -ForegroundColor Red; exit 1 }
Pop-Location
Write-Host "        Frontend built." -ForegroundColor Green

# 3. Commit version bump + built assets
Write-Host "[ 3/5 ] Committing release..." -ForegroundColor Yellow
git -C $ProjectDir add -A
git -C $ProjectDir commit -m "chore: release v$Version"
if ($LASTEXITCODE -ne 0) { Write-Host "Nothing to commit or git error." -ForegroundColor Yellow }
Write-Host "        Committed." -ForegroundColor Green

# 4. Push to GitHub
Write-Host "[ 4/5 ] Pushing to GitHub..." -ForegroundColor Yellow
git -C $ProjectDir push origin master
Write-Host "        Pushed." -ForegroundColor Green

# 5. Create GitHub release
Write-Host "[ 5/5 ] Creating GitHub release v$Version..." -ForegroundColor Yellow
gh release create "v$Version" `
    --repo $Repo `
    --title "CRAMS v$Version" `
    --notes $Notes `
    --latest
Write-Host "        GitHub release created." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Release v$Version published!" -ForegroundColor Green
Write-Host "  All CRAMS installs will see the update." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
