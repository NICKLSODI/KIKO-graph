import base64
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load backend/.env regardless of the current working directory.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

TWELVE_DATA_API_KEY = os.environ.get("TWELVE_DATA_API_KEY")

YAHOO_INTERVAL_MAP = {
    "1d": "1d",
    "1w": "1wk",
    "1M": "1mo",
    "15m": "15m",
    "30m": "30m",
    "60m": "60m",
}
YAHOO_RANGE_MAP = {
    "1d": "2y",
    "1w": "5y",
    "1M": "10y",
    "15m": "5d",
    "30m": "5d",
    "60m": "1mo",
}

# Path to the Claude Code CLI. Resolved once at startup.
CLAUDE_BIN = shutil.which("claude")
CLAUDE_TIMEOUT_SECONDS = 180

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/candles-yahoo")
def get_candles_yahoo(symbol: str, interval: str = "1d", market: str = "thai"):
    # Thai stocks need the .BK suffix; foreign (US) tickers are used as-is.
    if "." in symbol:
        yahoo_symbol = symbol.upper()
    elif market == "foreign":
        yahoo_symbol = symbol.upper()
    else:
        yahoo_symbol = f"{symbol.upper()}.BK"
    yahoo_interval = YAHOO_INTERVAL_MAP.get(interval, "1d")
    yahoo_range = YAHOO_RANGE_MAP.get(interval, "2y")

    res = requests.get(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}",
        params={"interval": yahoo_interval, "range": yahoo_range},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10,
    )
    data = res.json()
    result = data.get("chart", {}).get("result")
    if not result:
        error = data.get("chart", {}).get("error", {})
        raise HTTPException(status_code=404, detail=error.get("description", f"No data for {yahoo_symbol}"))

    chart = result[0]
    timestamps = chart["timestamp"]
    quote = chart["indicators"]["quote"][0]

    return [
        {
            "time": timestamps[i],
            "open": quote["open"][i],
            "high": quote["high"][i],
            "low": quote["low"][i],
            "close": quote["close"][i],
        }
        for i in range(len(timestamps))
        if quote["close"][i] is not None
    ]


def _twelvedata_to_unix(s: str):
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return int(datetime.strptime(s.strip(), fmt).replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            continue
    return None


@app.get("/candles-twelvedata")
def get_candles_twelvedata(symbol: str, interval: str = "1day"):
    """US / foreign stock candles via Twelve Data, using the key from backend/.env."""
    if not TWELVE_DATA_API_KEY:
        raise HTTPException(status_code=500, detail="ยังไม่ได้ตั้งค่า TWELVE_DATA_API_KEY ใน backend/.env")

    res = requests.get(
        "https://api.twelvedata.com/time_series",
        params={"symbol": symbol.upper(), "interval": interval, "outputsize": 300, "apikey": TWELVE_DATA_API_KEY},
        timeout=10,
    )
    data = res.json()
    if data.get("status") == "error":
        raise HTTPException(status_code=404, detail=data.get("message", "Twelve Data request failed"))

    out = []
    for v in reversed(data.get("values", [])):
        t = _twelvedata_to_unix(v["datetime"])
        if t is None:
            continue
        out.append({
            "time": t,
            "open": float(v["open"]),
            "high": float(v["high"]),
            "low": float(v["low"]),
            "close": float(v["close"]),
        })
    return out


@app.get("/api/generate/health")
def generate_health():
    """Lets the frontend tell the user up-front whether local Claude Code is usable."""
    return {"available": CLAUDE_BIN is not None, "bin": CLAUDE_BIN}


@app.post("/api/generate")
def generate(payload: dict = Body(...)):
    """Runs Claude Code headless (`claude -p`) using the machine's own login — no API key.

    The prompt is fed on stdin. Returns the model's plain-text reply.
    An optional `file` ({name, mediaType, base64}) is written to a temp file so
    Claude Code can read it with its Read tool (e.g. a PDF term sheet).
    """
    payload = payload or {}
    prompt = payload.get("prompt", "")
    file = payload.get("file")
    if not isinstance(prompt, str) or not prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")
    if not CLAUDE_BIN:
        raise HTTPException(status_code=500, detail="ไม่พบคำสั่ง claude บนเครื่อง — ติดตั้ง Claude Code แล้วรัน `claude login` ก่อน")

    # Run with ANTHROPIC_BASE_URL stripped so it always uses the user's `claude login`
    # credentials rather than any proxy that a parent process may have injected.
    child_env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_BASE_URL"}

    # Allow the read/fetch tools so file (PDF) and web-link inputs work headlessly.
    args = [CLAUDE_BIN, "-p", "--output-format", "text", "--allowedTools", "Read", "WebFetch"]

    tmpdir = None
    if isinstance(file, dict) and file.get("base64"):
        tmpdir = tempfile.mkdtemp(prefix="kiko_")
        safe_name = os.path.basename(file.get("name") or "document")
        fpath = os.path.join(tmpdir, safe_name)
        try:
            with open(fpath, "wb") as fh:
                fh.write(base64.b64decode(file["base64"]))
        except Exception:
            shutil.rmtree(tmpdir, ignore_errors=True)
            raise HTTPException(status_code=400, detail="ไฟล์แนบไม่ถูกต้อง (decode ไม่สำเร็จ)")
        prompt = f"{prompt}\n\nไฟล์เอกสารอยู่ที่พาธนี้ ให้ใช้เครื่องมือ Read อ่านเนื้อหาก่อนตอบ: {fpath}"
        args += ["--add-dir", tmpdir]

    try:
        proc = subprocess.run(
            args,
            input=prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=CLAUDE_TIMEOUT_SECONDS,
            env=child_env,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Claude Code ใช้เวลานานเกินไป (timeout)")
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)

    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip() or "claude CLI ทำงานไม่สำเร็จ"
        raise HTTPException(status_code=502, detail=f"Claude Code error: {detail[:500]}")

    return {"text": (proc.stdout or "").strip()}
