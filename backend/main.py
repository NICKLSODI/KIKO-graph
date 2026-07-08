import os
import time

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from settrade_v2 import Investor
except ImportError:
    from settrade.openapi import Investor

load_dotenv()

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

FINNHUB_RESOLUTION_MAP = {
    "1day": "D",
    "1week": "W",
    "1month": "M",
    "1h": "60",
    "4h": "60",
}
FINNHUB_SPAN_SECONDS = {
    "1day": 5 * 365 * 86400,
    "1week": 10 * 365 * 86400,
    "1month": 20 * 365 * 86400,
    "1h": 30 * 86400,
    "4h": 60 * 86400,
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

investor = Investor(
    app_id=os.environ["SETTRADE_APP_ID"],
    app_secret=os.environ["SETTRADE_APP_SECRET"],
    broker_id=os.environ["SETTRADE_BROKER_ID"],
    app_code=os.environ["SETTRADE_APP_CODE"],
    is_auto_queue=False,
)
market = investor.MarketData()


@app.get("/candles")
def get_candles(symbol: str, interval: str = "1d", limit: int = 300):
    result = market.get_candlestick(
        symbol=symbol.upper(),
        interval=interval,
        limit=limit,
        normalized=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"No data for symbol {symbol}")

    bars = result[0]
    return [
        {
            "time": bars["time"][i],
            "open": bars["open"][i],
            "high": bars["high"][i],
            "low": bars["low"][i],
            "close": bars["close"][i],
        }
        for i in range(len(bars["time"]))
    ]


@app.get("/candles-yahoo")
def get_candles_yahoo(symbol: str, interval: str = "1d"):
    yahoo_symbol = symbol.upper() if "." in symbol else f"{symbol.upper()}.BK"
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


@app.get("/candles-finnhub")
def get_candles_finnhub(symbol: str, interval: str = "1day"):
    resolution = FINNHUB_RESOLUTION_MAP.get(interval, "D")
    span = FINNHUB_SPAN_SECONDS.get(interval, 5 * 365 * 86400)
    to_ts = int(time.time())
    from_ts = to_ts - span

    res = requests.get(
        "https://finnhub.io/api/v1/stock/candle",
        params={
            "symbol": symbol.upper(),
            "resolution": resolution,
            "from": from_ts,
            "to": to_ts,
            "token": os.environ["FINNHUB_API_KEY"],
        },
        timeout=10,
    )
    data = res.json()
    if data.get("s") != "ok":
        raise HTTPException(status_code=404, detail=f"No data for {symbol} (status: {data.get('s')})")

    return [
        {
            "time": data["t"][i],
            "open": data["o"][i],
            "high": data["h"][i],
            "low": data["l"][i],
            "close": data["c"][i],
        }
        for i in range(len(data["t"]))
    ]
