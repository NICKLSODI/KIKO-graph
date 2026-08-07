# Stop SN-Desk servers: kill whatever is listening on :8000 (backend) and :5173 (frontend).
Write-Host "=== Stopping SN-Desk ===" -ForegroundColor Cyan
$killed = 0
foreach ($p in 8000, 5173) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try {
            $proc = Get-Process -Id $c.OwningProcess -ErrorAction Stop
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "[OK] killed $($proc.ProcessName) (pid $($proc.Id)) on :$p" -ForegroundColor Green
            $killed++
        } catch {}
    }
}
if ($killed -eq 0) { Write-Host "[i] Nothing was running on :8000 / :5173." -ForegroundColor Yellow }
Start-Sleep -Milliseconds 800
