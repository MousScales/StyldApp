# Sync cover-header template files from templatesite → stylddsite (partial deploy copy)
# and print the full deploy checklist for production.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/sync-cover-header-to-live.ps1
#
# After running: deploy templatesite/ to Vercel (or your host), then hard-refresh your tenant URL.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Src  = Join-Path $Root 'templatesite'
$Dst  = Join-Path $Root 'stylddsite'

$Pairs = @(
  @{ From = 'css\styles.css';           To = 'css\styles.css' },
  @{ From = 'js\profile-content.js';   To = 'js\profile-content.js' },
  @{ From = 'js\tenant-site.js';       To = 'js\tenant-site.js' },
  @{ From = 'tenant\book.html';        To = 'tenant\book.html' },
  @{ From = 'tenant\profile.html';     To = 'tenant\profile.html' },
  @{ From = 'middleware.js';            To = 'middleware.js' }
)

foreach ($pair in $Pairs) {
  $fromPath = Join-Path $Src $pair.From
  $toPath   = Join-Path $Dst $pair.To
  if (-not (Test-Path $fromPath)) {
    Write-Warning "Skip (missing source): $($pair.From)"
    continue
  }
  $toDir = Split-Path $toPath -Parent
  if (-not (Test-Path $toDir)) {
    New-Item -ItemType Directory -Path $toDir -Force | Out-Null
  }
  Copy-Item -Path $fromPath -Destination $toPath -Force
  Write-Host "Copied $($pair.From) -> stylddsite\$($pair.To)"
}

Write-Host ''
Write-Host '=== Deploy checklist (live site must match in-app preview) ===' -ForegroundColor Cyan
Write-Host '1. Deploy templatesite/ to production (Vercel project for styldd.com tenants).'
Write-Host '2. Confirm /book route works: https://YOUR-SUBDOMAIN.styldd.com/book'
Write-Host '3. Run scripts/enable-cover-header-layout.sql in Supabase (or Save in app editor).'
Write-Host '4. Hard refresh tenant site (Ctrl+Shift+R) — CSS is cache-busted via ?v= on profile.html.'
Write-Host ''
Write-Host 'Preview vs live — what should match:' -ForegroundColor Cyan
Write-Host '  / (splash)     Full-screen hero, logo+name top-left, centered Book Now'
Write-Host '  /book          About, Policies, Menu, Location (no splash hero)'
Write-Host '  Hide nav Book Now toggle only hides top-right button; splash CTA stays'
Write-Host '  heroCoverBlur + textColors come from site_theme in Supabase'
