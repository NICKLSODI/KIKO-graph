import base64
import json
import os
import re
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
CLAUDE_TIMEOUT_SECONDS = 300  # image/scanned-PDF path uses Claude's Read tool (agentic loop + cold start) — 180s too tight

# ── Claude Code login state ───────────────────────────────────────────────────
# The CLI being installed does NOT mean it can talk to Anthropic: the OAuth session
# expires periodically and only fails at call time. That used to surface as a raw
# English CLI error AFTER a long extraction had already burned the user's time, which
# is useless to a non-technical desk user. So: probe the login up-front, cache it, and
# let the frontend block the "analyse" button with a plain-Thai fix instead.
AUTH_PROBE_TIMEOUT_SECONDS = 40
AUTH_CACHE_TTL_SECONDS = 300
# Substrings that mean "logged out / session dead", not "the model failed".
AUTH_ERROR_MARKERS = (
    "oauth",
    "session expired",
    "could not be refreshed",
    "failed to authenticate",
    "authentication",
    "unauthorized",
    "401",
    "invalid api key",
    "please run /login",
    "not logged in",
)

LOGIN_FIX_TH = 'กดปุ่ม "เข้าสู่ระบบ Claude" ด้านล่าง ระบบจะเปิดหน้าต่างล็อกอินให้เอง (หรือพิมพ์ claude auth login ใน PowerShell) แล้วกดตรวจสอบอีกครั้ง'
LOGIN_EXPIRED_TH = "การเข้าสู่ระบบ Claude หมดอายุ — ระบบยังเรียก AI ไม่ได้จนกว่าจะล็อกอินใหม่"
NO_CLI_TH = "ไม่พบโปรแกรม Claude Code บนเครื่องนี้"
NO_CLI_FIX_TH = "ติดตั้ง Claude Code แล้วพิมพ์ claude auth login ใน PowerShell (ดู MAINTENANCE.md อาการ B)"

# {"state", "reason", "fix", "checked_at"} — refreshed by _auth_status().
_auth_cache: dict | None = None


def _is_auth_error(text: str) -> bool:
    low = (text or "").lower()
    return any(m in low for m in AUTH_ERROR_MARKERS)


def _claude_run(args: list, prompt: str, timeout: int) -> subprocess.CompletedProcess:
    """Invoke the Claude Code CLI with the prompt on stdin. ANTHROPIC_BASE_URL is stripped
    so it always uses the user's own `claude login` rather than an inherited proxy."""
    child_env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_BASE_URL"}
    return subprocess.run(
        args,
        input=prompt,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=timeout,
        env=child_env,
        # `claude` on Windows is an npm .cmd shim — CreateProcess can't launch .cmd/.bat
        # directly (WinError 2), it needs cmd.exe as the interpreter. shell=True routes
        # through cmd.exe; posix doesn't need it since `claude` there is a real executable.
        shell=(os.name == "nt"),
    )


def _credentials_present() -> bool | None:
    """`claude auth status` — instant, free, no tokens. False means "no stored login at
    all", which is the common case and lets the UI answer in <1s instead of waiting out
    the ping. True only means credentials EXIST; a stale refresh token still passes here,
    which is why it's a short-circuit and not the whole probe. None = couldn't tell."""
    try:
        proc = subprocess.run(
            [CLAUDE_BIN, "auth", "status", "--json"],
            capture_output=True, text=True, encoding="utf-8", timeout=20,
            shell=(os.name == "nt"),
        )
        return bool(json.loads(proc.stdout or "{}").get("loggedIn"))
    except Exception:
        return None


def _probe_auth() -> dict:
    """One tiny real call — the only way to know the OAuth session still works. Costs a
    handful of tokens and a few seconds, which is why the result is cached."""
    if not CLAUDE_BIN:
        return {"state": "no-cli", "reason": NO_CLI_TH, "fix": NO_CLI_FIX_TH}
    if _credentials_present() is False:
        return {"state": "expired", "reason": LOGIN_EXPIRED_TH, "fix": LOGIN_FIX_TH}
    try:
        proc = _claude_run(
            [CLAUDE_BIN, "-p", "--output-format", "text", "--model", "claude-sonnet-5"],
            "ping",
            AUTH_PROBE_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        # Slow machine / cold start — not proof of a dead login, so don't cry wolf and
        # block the button over it.
        return {"state": "unknown", "reason": "ตรวจสอบการเข้าสู่ระบบไม่ทัน (เครื่องช้าหรือเพิ่งเปิด)", "fix": "ลองกดตรวจสอบอีกครั้ง"}
    except Exception as exc:
        return {"state": "unknown", "reason": f"ตรวจสอบการเข้าสู่ระบบไม่ได้: {exc}", "fix": "ลองกดตรวจสอบอีกครั้ง"}

    if proc.returncode == 0:
        return {"state": "ok", "reason": None, "fix": None}
    err = (proc.stderr or proc.stdout or "").strip()
    if _is_auth_error(err):
        return {"state": "expired", "reason": LOGIN_EXPIRED_TH, "fix": LOGIN_FIX_TH}
    return {"state": "unknown", "reason": f"Claude Code ตอบกลับผิดปกติ: {err[:200]}", "fix": "ลองกดตรวจสอบอีกครั้ง หรือดู MAINTENANCE.md อาการ B"}


def _auth_status(force: bool = False) -> dict:
    """Cached login state. `force` re-probes now (the UI's "ตรวจสอบอีกครั้ง" button)."""
    global _auth_cache
    now = datetime.now(timezone.utc).timestamp()
    if not force and _auth_cache and (now - _auth_cache["checked_at"]) < AUTH_CACHE_TTL_SECONDS:
        return _auth_cache
    status = _probe_auth()
    status["checked_at"] = now
    _auth_cache = status
    return status


def _mark_auth_expired() -> None:
    """Called when a real generate call hits an auth error — free, instant, and more
    authoritative than the cached probe, so the UI blocks immediately afterwards."""
    global _auth_cache
    _auth_cache = {
        "state": "expired",
        "reason": LOGIN_EXPIRED_TH,
        "fix": LOGIN_FIX_TH,
        "checked_at": datetime.now(timezone.utc).timestamp(),
    }

# Path to the NotebookLM CLI (`nlm`). Used for term-sheet extraction instead of Claude.
NLM_BIN = shutil.which("nlm")
NLM_TIMEOUT_SECONDS = 180
NLM_NOTEBOOK_TITLE = "KIKO Extraction"
NLM_NOTEBOOK_ID_FILE = os.path.join(os.path.dirname(__file__), ".nlm_notebook_id")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# Term sheets name indices the way the desk does ("SPX", "NDX"), but Yahoo only knows their
# caret tickers — without this map every index-linked note (Sharkfin/Twin Win on SPX) came
# back "No data for SPX" and got no chart at all.
INDEX_SYMBOL_MAP = {
    "SPX": "^GSPC",
    "SPX500": "^GSPC",
    "SP500": "^GSPC",
    "NDX": "^NDX",
    "NDX100": "^NDX",
    "NASDAQ100": "^NDX",
    "DJI": "^DJI",
    "DJIA": "^DJI",
    "RUT": "^RUT",
    "SX5E": "^STOXX50E",
    "ESTX50": "^STOXX50E",
    "N225": "^N225",
    "NKY": "^N225",
    "HSI": "^HSI",
    "SET": "^SET.BK",
    "VIX": "^VIX",
}


@app.get("/candles-yahoo")
def get_candles_yahoo(symbol: str, interval: str = "1d", market: str = "thai"):
    # Thai stocks need the .BK suffix; foreign (US) tickers are used as-is.
    if symbol.upper() in INDEX_SYMBOL_MAP:
        yahoo_symbol = INDEX_SYMBOL_MAP[symbol.upper()]
    elif symbol.startswith("^") or "." in symbol:
        yahoo_symbol = symbol.upper()
    elif market == "foreign":
        yahoo_symbol = symbol.upper()
    else:
        yahoo_symbol = f"{symbol.upper()}.BK"
    yahoo_interval = YAHOO_INTERVAL_MAP.get(interval, "1d")
    yahoo_range = YAHOO_RANGE_MAP.get(interval, "2y")

    try:
        res = requests.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}",
            params={"interval": yahoo_interval, "range": yahoo_range},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"เชื่อมต่อ Yahoo Finance ไม่ได้: {exc}")
    if res.status_code == 429:
        raise HTTPException(status_code=429, detail="Yahoo Finance จำกัดการเรียก (rate limit) — รอสักครู่แล้วลองใหม่")
    # Yahoo returns an HTML error page (not JSON) when throttled/blocked — guard the parse.
    try:
        data = res.json()
    except ValueError:
        raise HTTPException(status_code=502, detail=f"Yahoo Finance ตอบกลับไม่ใช่ JSON (HTTP {res.status_code})")
    result = (data.get("chart") or {}).get("result")
    if not result:
        error = (data.get("chart") or {}).get("error") or {}
        raise HTTPException(status_code=404, detail=error.get("description") or f"No data for {yahoo_symbol}")

    # A symbol can resolve but have no candles in the range — timestamp/quote may be absent.
    chart = result[0]
    timestamps = chart.get("timestamp") or []
    quote_list = (chart.get("indicators") or {}).get("quote") or []
    quote = quote_list[0] if quote_list else {}
    if not timestamps or not quote:
        raise HTTPException(status_code=404, detail=f"ไม่มีข้อมูลราคาในช่วงที่ขอสำหรับ {yahoo_symbol}")

    opens, highs, lows, closes = (quote.get(k) or [] for k in ("open", "high", "low", "close"))
    at = lambda arr, i: arr[i] if i < len(arr) else None  # tolerate ragged arrays
    return [
        {"time": timestamps[i], "open": at(opens, i), "high": at(highs, i), "low": at(lows, i), "close": at(closes, i)}
        for i in range(len(timestamps))
        if at(closes, i) is not None
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

    try:
        res = requests.get(
            "https://api.twelvedata.com/time_series",
            params={"symbol": symbol.upper(), "interval": interval, "outputsize": 300, "apikey": TWELVE_DATA_API_KEY},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"เชื่อมต่อ Twelve Data ไม่ได้: {exc}")
    try:
        data = res.json()
    except ValueError:
        raise HTTPException(status_code=502, detail=f"Twelve Data ตอบกลับไม่ใช่ JSON (HTTP {res.status_code})")
    if data.get("status") == "error":
        raise HTTPException(status_code=404, detail=data.get("message", "Twelve Data request failed"))

    out = []
    for v in reversed(data.get("values", [])):
        t = _twelvedata_to_unix(v.get("datetime", ""))
        if t is None:
            continue
        try:
            out.append({
                "time": t,
                "open": float(v["open"]),
                "high": float(v["high"]),
                "low": float(v["low"]),
                "close": float(v["close"]),
            })
        except (KeyError, TypeError, ValueError):
            continue  # skip rows with missing / non-numeric OHLC instead of 500-ing
    return out


@app.get("/api/generate/health")
def generate_health(check_auth: bool = True, force: bool = False):
    """Lets the frontend tell the user up-front whether local Claude Code is usable.

    `available` stays "the CLI exists" for backwards compatibility; `auth` is what the UI
    actually gates on, since an installed-but-logged-out CLI fails every call.
    Pass check_auth=false for a cheap liveness ping, force=true to re-probe after a login.
    """
    base = {"available": CLAUDE_BIN is not None, "bin": CLAUDE_BIN}
    if not check_auth:
        return {**base, "auth": "unchecked", "reason": None, "fix": None}
    status = _auth_status(force=force)
    return {
        **base,
        "auth": status["state"],  # ok | expired | no-cli | unknown
        "reason": status["reason"],
        "fix": status["fix"],
    }


@app.post("/api/generate/login")
def generate_login():
    """Opens the Claude login flow for the user instead of telling them to type a command.

    `claude auth login` is interactive (it prints a URL and waits for the browser callback),
    so it cannot run inside this request — it gets its OWN visible console window, detached,
    and this returns immediately. The user finishes in the browser and presses
    "ตรวจสอบอีกครั้ง", which force-re-probes. Nothing here can confirm the login itself.
    """
    if not CLAUDE_BIN:
        raise HTTPException(status_code=503, detail=f"{NO_CLI_TH} — {NO_CLI_FIX_TH}")
    # Only reachable from the local UI, and the command is a fixed argv with no user input.
    if os.name == "nt":
        shell = _POWERSHELL_BIN or "powershell"
        args = [shell, "-NoExit", "-Command", "claude auth login"]
        creationflags = subprocess.CREATE_NEW_CONSOLE
    else:
        args = [CLAUDE_BIN, "auth", "login"]
        creationflags = 0
    try:
        subprocess.Popen(args, creationflags=creationflags)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"เปิดหน้าต่างล็อกอินอัตโนมัติไม่ได้ ({exc}) — เปิด PowerShell แล้วพิมพ์ claude auth login เอง",
        )
    # The probe is now stale-by-design: force a re-check on the next health call.
    global _auth_cache
    _auth_cache = None
    return {"started": True}


# Extracted-text path: a digital PDF's embedded text is 10-50x fewer tokens than
# having the model view the pages as images, and it removes the Read-tool round trip.
PDF_TEXT_MIN_CHARS = 200  # below this, assume a scanned/image PDF and fall back to file-attach
PDF_TEXT_MAX_CHARS = 60_000  # safety cap for pathological documents


def _pdf_text(data: bytes) -> str | None:
    """Extract embedded text from a PDF. Returns None if extraction fails or is too thin."""
    try:
        from io import BytesIO
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(data))
        pages = [(page.extract_text() or "") for page in reader.pages]
        text = "\n\n".join(p.strip() for p in pages if p.strip())
        if len(text) < PDF_TEXT_MIN_CHARS:
            return None
        return text[:PDF_TEXT_MAX_CHARS]
    except Exception:
        return None


@app.post("/api/generate")
def generate(payload: dict = Body(...)):
    """Runs Claude Code headless (`claude -p`) using the machine's own login — no API key.

    The prompt is fed on stdin. Returns the model's plain-text reply.
    An optional `file` ({name, mediaType, base64}) is handled two ways:
    - digital PDF: its text is extracted server-side and inlined into the prompt
      (fast single-shot, far fewer tokens)
    - scanned PDF / image: written to a temp file for Claude Code's Read tool
    """
    payload = payload or {}
    prompt = payload.get("prompt", "")
    file = payload.get("file")
    if not isinstance(prompt, str) or not prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")
    if not CLAUDE_BIN:
        raise HTTPException(status_code=503, detail=f"{NO_CLI_TH} — {NO_CLI_FIX_TH}")

    args = [CLAUDE_BIN, "-p", "--output-format", "text", "--model", "claude-sonnet-5"]

    file_bytes = None
    if isinstance(file, dict) and file.get("base64"):
        try:
            file_bytes = base64.b64decode(file["base64"])
        except Exception:
            raise HTTPException(status_code=400, detail="ไฟล์แนบไม่ถูกต้อง (decode ไม่สำเร็จ)")

    tmpdir = None
    if file_bytes is not None:
        text = _pdf_text(file_bytes) if (file.get("mediaType") == "application/pdf") else None
        if text is not None:
            # Inline the document text — no tools, no temp file, single-shot reply.
            prompt = f"{prompt}\n\nเนื้อหาเอกสาร (สกัดข้อความจากไฟล์ {os.path.basename(file.get('name') or 'document')}):\n{text}"
        else:
            # Scanned PDF or image — Claude Code must view the file itself.
            tmpdir = tempfile.mkdtemp(prefix="kiko_")
            # Restrict to a safe charset — on Windows this path is later embedded in a
            # cmd.exe-parsed command line (see shell=True below), so metacharacters like
            # & | ^ % in an attacker-chosen filename must not survive into it.
            raw_name = os.path.basename(file.get("name") or "document")
            safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", raw_name) or "document"
            fpath = os.path.join(tmpdir, safe_name)
            with open(fpath, "wb") as fh:
                fh.write(file_bytes)
            prompt = f"{prompt}\n\nไฟล์เอกสารอยู่ที่พาธนี้ ให้ใช้เครื่องมือ Read อ่านเนื้อหาก่อนตอบ: {fpath}"
            args += ["--allowedTools", "Read", "--add-dir", tmpdir]
    elif "http://" in prompt or "https://" in prompt:
        # Web-link inputs still need the fetch tool; plain-text prompts get none at all.
        args += ["--allowedTools", "WebFetch"]

    try:
        proc = _claude_run(args, prompt, CLAUDE_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Claude Code ใช้เวลานานเกินไป (timeout) — ลองแบ่งเอกสาร/ข้อความให้สั้นลงแล้วทำใหม่")
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)

    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip() or "claude CLI ทำงานไม่สำเร็จ"
        # A dead login is a user-fixable setup problem, not a model failure — give it its
        # own status + plain-Thai instruction, and poison the health cache so the UI blocks
        # the next attempt instead of letting it fail the same way again.
        if _is_auth_error(detail):
            _mark_auth_expired()
            raise HTTPException(status_code=401, detail=f"{LOGIN_EXPIRED_TH} — {LOGIN_FIX_TH}")
        raise HTTPException(status_code=502, detail=f"Claude Code error: {detail[:500]}")

    return {"text": (proc.stdout or "").strip()}


# ── NotebookLM extraction (used for term-sheet extraction instead of Claude) ──

def _run_nlm(args: list, input_text: str | None = None, timeout: int = NLM_TIMEOUT_SECONDS) -> subprocess.CompletedProcess:
    return subprocess.run(
        [NLM_BIN, *args],
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=timeout,
    )


def _nlm_json(proc: subprocess.CompletedProcess) -> dict | list | None:
    out = (proc.stdout or "").strip()
    try:
        return json.loads(out)
    except ValueError:
        match = re.search(r"[\{\[][\s\S]*[\}\]]", out)
        if match:
            try:
                return json.loads(match.group(0))
            except ValueError:
                return None
    return None


def _source_ids(notebook_id: str) -> set:
    list_proc = _run_nlm(["source", "list", notebook_id, "--json"])
    data = _nlm_json(list_proc) or []
    sources = data if isinstance(data, list) else data.get("sources", [])
    ids = set()
    for s in sources if isinstance(sources, list) else []:
        if isinstance(s, dict) and isinstance(s.get("id"), str):
            ids.add(s["id"])
    return ids


def _first_id(obj) -> str | None:
    """Best-effort extraction of an id-like field from nlm's --json output."""
    if isinstance(obj, dict):
        for key in ("id", "source_id", "sourceId", "notebook_id", "notebookId"):
            if isinstance(obj.get(key), str):
                return obj[key]
        for v in obj.values():
            found = _first_id(v)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = _first_id(item)
            if found:
                return found
    return None


NLM_LOGIN_TIMEOUT_SECONDS = 300


def _ensure_nlm_login() -> None:
    """Runs `nlm login` automatically (opens a browser) if the session has expired."""
    check = _run_nlm(["login", "--check"], timeout=20)
    if check.returncode == 0:
        return
    login_proc = _run_nlm(["login"], timeout=NLM_LOGIN_TIMEOUT_SECONDS)
    if login_proc.returncode != 0:
        detail = (login_proc.stderr or login_proc.stdout or "").strip() or "เข้าสู่ระบบ nlm ไม่สำเร็จ"
        raise HTTPException(status_code=502, detail=f"nlm login ไม่สำเร็จ: {detail[:400]}")


def _get_or_create_notebook() -> str:
    if os.path.exists(NLM_NOTEBOOK_ID_FILE):
        with open(NLM_NOTEBOOK_ID_FILE, "r", encoding="utf-8") as fh:
            cached = fh.read().strip()
        if cached:
            return cached

    list_proc = _run_nlm(["notebook", "list", "--json"])
    data = _nlm_json(list_proc) or []
    notebooks = data if isinstance(data, list) else data.get("notebooks", [])
    for nb in notebooks if isinstance(notebooks, list) else []:
        if isinstance(nb, dict) and nb.get("title") == NLM_NOTEBOOK_TITLE:
            nb_id = nb.get("id")
            if nb_id:
                with open(NLM_NOTEBOOK_ID_FILE, "w", encoding="utf-8") as fh:
                    fh.write(nb_id)
                return nb_id

    create_proc = _run_nlm(["notebook", "create", NLM_NOTEBOOK_TITLE, "--json"])
    if create_proc.returncode != 0:
        detail = (create_proc.stderr or create_proc.stdout or "").strip()
        raise HTTPException(status_code=502, detail=f"สร้าง NotebookLM notebook ไม่สำเร็จ: {detail[:400]}")
    nb_id = _first_id(_nlm_json(create_proc))
    if not nb_id:
        raise HTTPException(status_code=502, detail="สร้าง notebook สำเร็จ แต่หา notebook id ไม่เจอในผลลัพธ์")
    with open(NLM_NOTEBOOK_ID_FILE, "w", encoding="utf-8") as fh:
        fh.write(nb_id)
    return nb_id


@app.get("/api/extract-notebooklm/health")
def extract_notebooklm_health():
    if not NLM_BIN:
        return {"available": False, "reason": "ไม่พบคำสั่ง nlm บนเครื่อง"}
    check = _run_nlm(["login", "--check"], timeout=20)
    return {"available": check.returncode == 0, "bin": NLM_BIN}


@app.post("/api/extract-notebooklm")
def extract_notebooklm(payload: dict = Body(...)):
    """Extracts term-sheet data via NotebookLM (nlm CLI) instead of Claude Code.

    payload: { instructions: str, source: { kind: 'text'|'link'|'file', text?, link?, file?: {name, mediaType, base64} } }
    Adds the document as a NotebookLM source, queries it with the extraction
    instructions, then deletes the source (keeps the notebook clean).
    """
    payload = payload or {}
    instructions = payload.get("instructions", "")
    source = payload.get("source") or {}
    kind = source.get("kind")
    if not isinstance(instructions, str) or not instructions.strip():
        raise HTTPException(status_code=400, detail="instructions is required")
    if kind not in ("text", "link", "file"):
        raise HTTPException(status_code=400, detail="source.kind ต้องเป็น text, link, หรือ file")
    if not NLM_BIN:
        raise HTTPException(status_code=500, detail="ไม่พบคำสั่ง nlm บนเครื่อง — ติดตั้ง notebooklm-mcp-cli ก่อน")

    # These run before the main try below, so map their timeout to 504 here rather than
    # letting a subprocess.TimeoutExpired escape as an opaque 500.
    try:
        _ensure_nlm_login()
        notebook_id = _get_or_create_notebook()
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="NotebookLM login/เปิด notebook ใช้เวลานานเกินไป (timeout)")

    tmpdir = None
    # `source add` has no --json flag, so resolve the new source's id by diffing
    # the notebook's source list before/after the add instead of parsing its output.
    add_args = ["source", "add", notebook_id, "--wait"]
    if kind == "text":
        text = (source.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="source.text is required")
        add_args += ["--text", text, "--title", "Term Sheet"]
    elif kind == "link":
        link = (source.get("link") or "").strip()
        if not link:
            raise HTTPException(status_code=400, detail="source.link is required")
        add_args += ["--url", link]
    else:
        file = source.get("file")
        if not isinstance(file, dict) or not file.get("base64"):
            raise HTTPException(status_code=400, detail="source.file is required")
        tmpdir = tempfile.mkdtemp(prefix="kiko_nlm_")
        fpath = os.path.join(tmpdir, os.path.basename(file.get("name") or "document"))
        try:
            with open(fpath, "wb") as fh:
                fh.write(base64.b64decode(file["base64"]))
        except Exception:
            shutil.rmtree(tmpdir, ignore_errors=True)
            raise HTTPException(status_code=400, detail="ไฟล์แนบไม่ถูกต้อง (decode ไม่สำเร็จ)")
        add_args += ["--file", fpath]

    source_id = None
    added_ids: set = set()
    try:
        before_ids = _source_ids(notebook_id)
        add_proc = _run_nlm(add_args)
        if add_proc.returncode != 0:
            detail = (add_proc.stderr or add_proc.stdout or "").strip() or "เพิ่มเอกสารเข้า NotebookLM ไม่สำเร็จ"
            raise HTTPException(status_code=502, detail=f"NotebookLM error: {detail[:500]}")
        added_ids = _source_ids(notebook_id) - before_ids
        # Must resolve to EXACTLY one new source. If 0 (add didn't register) or >1 (a
        # concurrent add), we can't scope the query — querying unscoped would answer across
        # every source in the shared notebook and mix other term sheets. Bail; the finally
        # block deletes whatever we added so nothing is orphaned.
        if len(added_ids) != 1:
            raise HTTPException(status_code=502, detail=f"ระบุแหล่งข้อมูลที่เพิ่งเพิ่มไม่ได้ (พบ {len(added_ids)} รายการ) — ลองใหม่อีกครั้ง")
        source_id = next(iter(added_ids))

        query_args = ["notebook", "query", notebook_id, instructions, "--json", "--source-ids", source_id]
        query_proc = _run_nlm(query_args)
        if query_proc.returncode != 0:
            detail = (query_proc.stderr or query_proc.stdout or "").strip() or "สอบถาม NotebookLM ไม่สำเร็จ"
            raise HTTPException(status_code=502, detail=f"NotebookLM error: {detail[:500]}")

        data = _nlm_json(query_proc)
        answer = None
        if isinstance(data, dict):
            for key in ("answer", "response", "text", "output", "content"):
                if isinstance(data.get(key), str):
                    answer = data[key]
                    break
        if not answer:
            answer = (query_proc.stdout or "").strip()
        if not answer:
            raise HTTPException(status_code=502, detail="NotebookLM ไม่ได้ส่งคำตอบกลับมา")
        return {"text": answer}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="NotebookLM ใช้เวลานานเกินไป (timeout)")
    finally:
        # Delete every source we added (usually one; ≥1 on the mis-scoped bail path) so the
        # shared notebook stays clean and nothing is orphaned.
        for sid in added_ids:
            try:
                _run_nlm(["source", "delete", sid, "--confirm"], timeout=30)
            except Exception:
                pass
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)


# ── Outlook auto-send (Classic Outlook COM) ──────────────────────────────────
# A true auto-send goes through the Outlook COM object (Classic engine — New Outlook is only
# the visible shell): build a MailItem, attach the files, and .Send() it. This DOES send for
# real to every recipient — the frontend confirms first.
_POWERSHELL_BIN = shutil.which("powershell") or shutil.which("pwsh")

# Attach to the ALREADY-RUNNING Outlook (GetActiveObject). If none is up, launch it like a
# double-click of the icon (`Start-Process outlook`, which goes through the normal login/MFA)
# and poll until it's ready — DELIBERATELY not `New-Object -ComObject`, because a COM-spawned
# instance often skips the login the send needs and then .Send() silently fails. This mirrors
# the pattern in the user's working fundconnext_portfolio.py (ensure_outlook_launched + wait).
# User text (recipients/subject/body/paths) reaches PowerShell only through a JSON file read
# with ConvertFrom-Json — never interpolated into the script source, so it can't inject.
_OUTLOOK_SEND_PS = r"""
$ErrorActionPreference = 'Stop'
# -Encoding UTF8: the cfg JSON is written UTF-8, but Windows PowerShell 5.1's Get-Content
# defaults to the system ANSI codepage (cp874) and mangles Thai — force UTF-8 on read.
$cfg = Get-Content -Raw -Encoding UTF8 -LiteralPath $env:KIKO_EMAIL_CFG | ConvertFrom-Json
function Get-Outlook {
    try { return [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application') } catch { return $null }
}
$outlook = Get-Outlook
if ($null -eq $outlook) {
    try { Start-Process 'outlook' } catch {}
    for ($i = 0; $i -lt 30; $i++) {      # wait up to ~60s for it to open + finish login
        Start-Sleep -Seconds 2
        $outlook = Get-Outlook
        if ($null -ne $outlook) { break }
    }
}
if ($null -eq $outlook) { Write-Output 'NOOUTLOOK'; exit 1 }
$mail = $outlook.CreateItem(0)   # 0 = olMailItem
$mail.To = ($cfg.recipients -join '; ')
$mail.Subject = $cfg.subject
$mail.HTMLBody = $cfg.body
foreach ($a in $cfg.attachments) {
    if (Test-Path -LiteralPath $a) { $mail.Attachments.Add($a) | Out-Null }
}
$mail.Send()
Write-Output 'SENT'
"""


@app.post("/api/email-send")
def email_send(payload: dict = Body(...)):
    """Send the email for real via Classic Outlook COM (.Send). Irreversible.

    payload: {
      recipients: string[],
      subject: str,
      body: str,                      # HTML
      attachments: [{ filename: str, base64: str }],
    }
    """
    if os.name != "nt":
        raise HTTPException(status_code=500, detail="ฟีเจอร์นี้รองรับเฉพาะ Windows เท่านั้น")
    if not _POWERSHELL_BIN:
        raise HTTPException(status_code=500, detail="ไม่พบ PowerShell บนเครื่อง — จำเป็นสำหรับสั่ง Outlook")

    payload = payload or {}
    recipients = [r.strip() for r in (payload.get("recipients") or []) if isinstance(r, str) and r.strip()]
    subject = payload.get("subject") or ""
    body = payload.get("body") or ""
    attachments = payload.get("attachments") or []
    if not recipients:
        raise HTTPException(status_code=400, detail="ต้องระบุอีเมลผู้รับอย่างน้อย 1 คน")

    tmpdir = tempfile.mkdtemp(prefix="kiko_send_")
    try:
        attach_paths = []
        for i, a in enumerate(attachments):
            if not isinstance(a, dict) or not a.get("base64"):
                continue
            name = os.path.basename(a.get("filename") or f"attachment_{i}")
            fpath = os.path.join(tmpdir, name)
            try:
                with open(fpath, "wb") as fh:
                    fh.write(base64.b64decode(a["base64"]))
            except Exception:
                raise HTTPException(status_code=400, detail=f"ไฟล์แนบ {name} ไม่ถูกต้อง (decode ไม่สำเร็จ)")
            attach_paths.append(fpath)

        cfg = {"recipients": recipients, "subject": subject, "body": body, "attachments": attach_paths}
        cfg_path = os.path.join(tmpdir, "_send_cfg.json")
        with open(cfg_path, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, ensure_ascii=False)

        env = {**os.environ, "KIKO_EMAIL_CFG": cfg_path}
        proc = subprocess.run(
            [_POWERSHELL_BIN, "-NoProfile", "-NonInteractive", "-Command", _OUTLOOK_SEND_PS],
            capture_output=True, text=True, encoding="utf-8", timeout=150, env=env,  # allow the ~60s Outlook-launch poll
        )
        out = proc.stdout or ""
        if "NOOUTLOOK" in out:
            raise HTTPException(status_code=503, detail="เปิด Outlook (Classic) ไม่ได้ หรือยัง login ไม่เสร็จ — เปิด Outlook ค้างไว้แล้วลองใหม่")
        if proc.returncode != 0 or "SENT" not in out:
            detail = (proc.stderr or out).strip() or "ส่งอีเมลผ่าน Outlook ไม่สำเร็จ"
            raise HTTPException(status_code=502, detail=f"Outlook error: {detail[:600]}")
        return {"ok": True, "sent": True, "recipients": recipients, "attachments": len(attach_paths)}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="สั่ง Outlook ใช้เวลานานเกินไป (timeout) — เปิด Outlook ค้างไว้ก่อนลองใหม่")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@app.get("/api/email-send/health")
def email_send_health():
    """Frontend gate. `available` = this host can send (Windows + PowerShell; send can launch
    Outlook itself). `running` = an Outlook instance is already up. Probes with GetActiveObject
    only — deliberately does NOT spawn one with New-Object (that would leave a stray hidden
    Outlook process on every health ping)."""
    if os.name != "nt" or not _POWERSHELL_BIN:
        return {"available": False, "running": False}
    try:
        proc = subprocess.run(
            [_POWERSHELL_BIN, "-NoProfile", "-NonInteractive", "-Command",
             "try { $o = [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application'); Write-Output $o.Version } catch { Write-Output 'NO' }"],
            capture_output=True, text=True, encoding="utf-8", timeout=15,
        )
        ver = (proc.stdout or "").strip()
        running = ver not in ("", "NO")
        return {"available": True, "running": running, "version": ver if running else None}
    except Exception:
        return {"available": True, "running": False}
