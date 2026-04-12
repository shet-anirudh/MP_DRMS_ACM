# Setup script for Windows Development
Write-Host "Checking for Node.js..."

# Check if npm is installed
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js (npm) is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "Please install Node.js before running this script." -ForegroundColor Yellow
    Write-Host "You can do this by running this command in a new PowerShell window:" -ForegroundColor Cyan
    Write-Host "winget install OpenJS.NodeJS.LTS" -ForegroundColor White
    Write-Host "After installing, RESTART your terminal and Android Studio, then run this setup_windows.ps1 script again."
    exit 1
}

Write-Host "Node.js found. Installing project dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Failed to install dependencies" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Building Vite project..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Failed to build web project" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Syncing Capacitor to Android..." -ForegroundColor Green
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "Capacitor sync failed" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "The missing files like cordova.variables.gradle and public assets have been generated."
Write-Host "You can now open the android folder in Android Studio and it will sync successfully." -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green
