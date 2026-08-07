# SN-Desk (KIKO-graph) one-click launcher
# Reuses already-running servers instantly; only cold-starts what's down.

$ErrorActionPreference = "Stop"

# Thai strings below are UTF-8. This file MUST stay saved as UTF-8 *with BOM*: PowerShell 5.1
# parses a BOM-less .ps1 using the ANSI codepage (874 on Thai Windows) and mangles them.
# This line fixes the other half -- the console re-encoding what we print.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root      = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend   = Join-Path $root "backend"
$venvPy    = Join-Path $backend ".venv\Scripts\python.exe"
$frontUrl  = "http://localhost:5173"
$healthUrl = "http://127.0.0.1:8000/api/generate/health"  # 127.0.0.1 not localhost: skips Windows IPv6 (::1) fallback stall (~2s/call)

# Is anything listening on this port? Address-agnostic: Vite binds IPv6 (::1) only,
# backend binds IPv4 (127.0.0.1) — a single-address TCP probe gives false negatives.
# Get-NetTCPConnection sees every local address and is fast (~50ms).
function Test-Port([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Test-Health {
    try { return (Invoke-RestMethod -Uri $healthUrl -TimeoutSec 5).available } catch { return $false }
}

Write-Host "=== SN-Desk launcher ===" -ForegroundColor Cyan

# --- Fast path: everything already up + healthy -> open now, done ---
if ((Test-Port 8000) -and (Test-Port 5173) -and (Test-Health)) {
    Write-Host "[OK] Servers already running + healthy." -ForegroundColor Green
    Start-Process $frontUrl
    Write-Host "=== Opened $frontUrl ===" -ForegroundColor Cyan
    Start-Sleep -Milliseconds 800
    exit 0
}

# --- Verify Claude Code CLI ---
$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
    Write-Host "[X] Claude Code not found in PATH. Install + 'claude auth login' first." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}
$ver = (& $claude.Source --version) 2>&1
if ($ver -notmatch "Claude Code") {
    Write-Host "[X] 'claude --version' broken: $ver" -ForegroundColor Red
    Write-Host "    Expected line ending in '(Claude Code)'. See HANDOVER.md section 7." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"; exit 1
}
Write-Host "[OK] Claude Code: $ver" -ForegroundColor Green

# --- Verify Claude login (free + instant; no tokens) ---
# An installed-but-logged-out CLI fails every AI call. Catch it HERE, at startup, and offer
# to fix it now -- otherwise the user finds out only after a long extraction fails.
$authOut = (& $claude.Source auth status --json) 2>&1
$loggedIn = $false
try { $loggedIn = [bool]((($authOut -join "") | ConvertFrom-Json).loggedIn) } catch { $loggedIn = $false }
if ($loggedIn) {
    Write-Host "[OK] Claude login active" -ForegroundColor Green
} else {
    Write-Host "[!] Claude is NOT logged in - AI features will fail." -ForegroundColor Yellow
    Write-Host "    ยังไม่ได้เข้าสู่ระบบ Claude - ปุ่มวิเคราะห์จะใช้ไม่ได้" -ForegroundColor Yellow
    $ans = Read-Host "    Log in now? (Y/n)"
    if ($ans -notmatch '^[Nn]') {
        & $claude.Source auth login
        Write-Host "[..] Re-checking login..." -ForegroundColor Yellow
        $authOut = (& $claude.Source auth status --json) 2>&1
        try { $loggedIn = [bool]((($authOut -join "") | ConvertFrom-Json).loggedIn) } catch { $loggedIn = $false }
        if ($loggedIn) { Write-Host "[OK] Claude login active" -ForegroundColor Green }
        else { Write-Host "[!] Still not logged in - the web page will show a login button." -ForegroundColor Yellow }
    }
}

# --- Backend ---
if (Test-Port 8000) {
    Write-Host "[OK] Backend already on :8000" -ForegroundColor Green
} else {
    if (-not (Test-Path $venvPy)) {
        Write-Host "[X] venv missing at $venvPy. Run SETUP.md step 3.2 first." -ForegroundColor Red
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-Host "[..] Starting backend..." -ForegroundColor Yellow
    Start-Process -FilePath $venvPy `
        -ArgumentList "-m","uvicorn","main:app","--port","8000" `
        -WorkingDirectory $backend -WindowStyle Minimized
}

# --- Frontend ---
if (Test-Port 5173) {
    Write-Host "[OK] Frontend already on :5173" -ForegroundColor Green
} else {
    Write-Host "[..] Starting frontend..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c","npm run dev" `
        -WorkingDirectory $root -WindowStyle Minimized
}

# --- Wait for health, then open ---
Write-Host "[..] Waiting for backend health..." -ForegroundColor Yellow
$ok = $false
for ($i = 0; $i -lt 40; $i++) { if (Test-Health) { $ok = $true; break }; Start-Sleep -Milliseconds 400 }
if ($ok) { Write-Host "[OK] Backend healthy (Claude reachable)." -ForegroundColor Green }
else     { Write-Host "[!] Health not confirmed - opening anyway." -ForegroundColor Yellow }

for ($i = 0; $i -lt 40; $i++) { if (Test-Port 5173) { break }; Start-Sleep -Milliseconds 300 }

Start-Process $frontUrl
Write-Host "=== Opened $frontUrl ===" -ForegroundColor Cyan
Start-Sleep -Milliseconds 800
