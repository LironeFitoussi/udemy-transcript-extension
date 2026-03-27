# build-zip.ps1
# Creates a production ZIP for Chrome Web Store submission.
# Run from the repo root: .\store\build-zip.ps1

$version = (Get-Content manifest.json | ConvertFrom-Json).version
$output = "store\udemy-transcript-copier-v$version.zip"

$files = @(
    "manifest.json",
    "content.js",
    "styles.css",
    "popup.html",
    "popup.js",
    "icons\icon-16.png",
    "icons\icon-48.png",
    "icons\icon-128.png"
)

# Remove existing zip if present
if (Test-Path $output) { Remove-Item $output }

Compress-Archive -Path $files -DestinationPath $output

Write-Host "Built: $output" -ForegroundColor Green
Write-Host "Files included:"
$files | ForEach-Object { Write-Host "  $_" }
