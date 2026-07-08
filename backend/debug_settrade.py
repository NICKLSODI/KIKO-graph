import os

from dotenv import load_dotenv

try:
    from settrade_v2 import Investor
except ImportError:
    from settrade.openapi import Investor

load_dotenv()

investor = Investor(
    app_id=os.environ["SETTRADE_APP_ID"],
    app_secret=os.environ["SETTRADE_APP_SECRET"],
    broker_id=os.environ["SETTRADE_BROKER_ID"],
    app_code=os.environ["SETTRADE_APP_CODE"],
    is_auto_queue=False,
)
market = investor.MarketData()

try:
    result = market.get_candlestick(symbol="PTT", interval="1d", limit=1, normalized=True)
    print("SUCCESS:", result)
except Exception as e:
    print("EXCEPTION TYPE:", type(e))
    print("EXCEPTION ARGS:", e.args)
    for attr in ("response", "status_code", "reason", "body", "text"):
        if hasattr(e, attr):
            print(f"e.{attr} =", getattr(e, attr))
