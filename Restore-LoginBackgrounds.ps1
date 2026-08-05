# =============================================================================
#  Restore the original GeoForest login backgrounds
#
#  The six wildlife images were never files on the server - they were Unsplash
#  URLs referenced by the login page, so they load only when the browser can
#  reach images.unsplash.com. That host is blocked from the STR machine, which
#  is why they went blank. This script downloads them ONCE into local files so
#  the login screen no longer depends on the internet.
#
#  RUN THIS ON A MACHINE WITH INTERNET ACCESS (home laptop, phone hotspot).
#  Then copy the whole "bg" folder it produces to:
#      C:\xampp\htdocs\geoforest_webgis\bg
#
#  Usage:   powershell -ExecutionPolicy Bypass -File Restore-LoginBackgrounds.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$dest = Join-Path $PSScriptRoot "bg"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# Recovered verbatim from the last build that still had them
# (htdocs\_backup_geoforest_webgis_20260722_154227\assets\index-aI5APCdL.js)
$images = @(
    @{ file = "01_tiger.jpg";    label = "Bengal Tiger";   url = "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=1920&q=70&auto=format&fit=crop" },
    @{ file = "02_elephant.jpg"; label = "Asian Elephant"; url = "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=1920&q=70&auto=format&fit=crop" },
    @{ file = "03_canopy.jpg";   label = "Forest Canopy";  url = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=70&auto=format&fit=crop" },
    @{ file = "04_flora.jpg";    label = "Native Flora";   url = "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1920&q=70&auto=format&fit=crop" },
    @{ file = "05_deer.jpg";     label = "Spotted Deer";   url = "https://images.unsplash.com/photo-1484406566174-9da000fda645?w=1920&q=70&auto=format&fit=crop" },
    @{ file = "06_leopard.jpg";  label = "Indian Leopard"; url = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=70&auto=format&fit=crop" }
)

$ok = @()
foreach ($img in $images) {
    $out = Join-Path $dest $img.file
    Write-Host ("Downloading {0,-16} " -f $img.label) -NoNewline
    try {
        Invoke-WebRequest -Uri $img.url -OutFile $out -UseBasicParsing -TimeoutSec 60
        $kb = [math]::Round((Get-Item $out).Length / 1KB, 0)
        Write-Host "OK  ($kb KB)" -ForegroundColor Green
        $ok += $img
    }
    catch {
        Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($ok.Count -eq 0) {
    Write-Host "`nNothing downloaded. This machine cannot reach images.unsplash.com either." -ForegroundColor Yellow
    Write-Host "Try a different network, or save the six URLs by hand in a browser."
    exit 1
}

# manifest.json is what the login page reads; no rebuild is needed
$manifest = $ok | ForEach-Object { [ordered]@{ file = $_.file; label = $_.label } }
$manifest | ConvertTo-Json -Depth 3 |
    Set-Content (Join-Path $dest "manifest.json") -Encoding UTF8

Write-Host "`n$($ok.Count) of $($images.Count) images saved to: $dest"
Write-Host "manifest.json written."
Write-Host "`nNext step: copy that 'bg' folder to C:\xampp\htdocs\geoforest_webgis\"
Write-Host "then reload the login page. No rebuild required."
