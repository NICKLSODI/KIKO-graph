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
CLAUDE_TIMEOUT_SECONDS = 180

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
        raise HTTPException(status_code=500, detail="ไม่พบคำสั่ง claude บนเครื่อง — ติดตั้ง Claude Code แล้วรัน `claude login` ก่อน")

    # Run with ANTHROPIC_BASE_URL stripped so it always uses the user's `claude login`
    # credentials rather than any proxy that a parent process may have injected.
    child_env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_BASE_URL"}

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
        proc = subprocess.run(
            args,
            input=prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=CLAUDE_TIMEOUT_SECONDS,
            env=child_env,
            # `claude` on Windows is an npm .cmd shim — CreateProcess can't launch .cmd/.bat
            # directly (WinError 2), it needs cmd.exe as the interpreter. shell=True routes
            # through cmd.exe; posix doesn't need it since `claude` there is a real executable.
            shell=(os.name == "nt"),
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

    _ensure_nlm_login()
    notebook_id = _get_or_create_notebook()

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
    try:
        before_ids = _source_ids(notebook_id)
        add_proc = _run_nlm(add_args)
        if add_proc.returncode != 0:
            detail = (add_proc.stderr or add_proc.stdout or "").strip() or "เพิ่มเอกสารเข้า NotebookLM ไม่สำเร็จ"
            raise HTTPException(status_code=502, detail=f"NotebookLM error: {detail[:500]}")
        new_ids = _source_ids(notebook_id) - before_ids
        if len(new_ids) == 1:
            source_id = next(iter(new_ids))

        query_args = ["notebook", "query", notebook_id, instructions, "--json"]
        if source_id:
            query_args += ["--source-ids", source_id]
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
        if source_id:
            try:
                _run_nlm(["source", "delete", source_id, "--confirm"], timeout=30)
            except Exception:
                pass
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)
