#!/usr/bin/env python3
"""
tqqq_jha_engine.py — SINGLE-FILE bundle of the TQQQ JHA v4.1 advisor.
Auto-generated from the module package. Self-contained for the ephemeral routine.
Run: python tqqq_jha_engine.py [--dry-run] [--verbose]
Env: DISCORD_WEBHOOK (post target), TQQQ_STATE_PATH (state file path).
"""
import os, sys, json, shutil, datetime, argparse
import numpy as np, pandas as pd

# --- Proxy/TLS bootstrap (durable fix for the recurring DATA_ERROR) ----------
# The routine runs behind an agent proxy that intercepts TLS with a custom CA
# bundle. yfinance's default curl_cffi/BoringSSL HTTP backend ignores
# REQUESTS_CA_BUNDLE and fails against that proxy ("OpenSSL internal error",
# 403 consent-gateway redirects, 429 rate-limit). Forcing the plain-requests
# backend and trusting the proxy CA makes the fetch work on every cold run
# WITHOUT the operator hand-patching the environment each time. This is the
# exact combination the run journal recorded as working (YF_DISABLE_CURL_CFFI=1
# + REQUESTS_CA_BUNDLE). It must run BEFORE `import yfinance`. Safe no-op
# outside the proxied environment (env vars only set when the bundle exists).
def _bootstrap_tls() -> None:
    os.environ.setdefault('YF_DISABLE_CURL_CFFI', '1')
    for _cand in (os.environ.get('REQUESTS_CA_BUNDLE'),
                  os.environ.get('CURL_CA_BUNDLE'),
                  '/root/.ccr/ca-bundle.crt'):
        if _cand and os.path.exists(_cand):
            os.environ.setdefault('REQUESTS_CA_BUNDLE', _cand)
            os.environ.setdefault('CURL_CA_BUNDLE', _cand)
            os.environ.setdefault('SSL_CERT_FILE', _cand)
            break
_bootstrap_tls()

try:
    import yfinance as yf
except ImportError:
    yf = None
try:
    import requests
except ImportError:
    requests = None


# ===== config.py =====
"""
TQQQ JHA v4.1 — Strategy constants, faithful to Vibha Jha's documented rules.

Sources: IBD Live appearances, TraderLion interviews, IBD article.
Marked INVENTED constants have been removed; only documented rules remain.
"""

# --- Regime gate ---
REGIME_SLOPE_LOOKBACK = 20  # trading days SMA200 must be rising (Stage 2 uptrend)

# --- Entry triggers (FTD + 3WK only — reclaim was not a standalone Jha entry) ---
FTD_PCT        = 1.25   # % QQQ must gain on FTD day (IBD standard)
FTD_MIN_DAY    = 4      # earliest valid FTD day (IBD: day 4-7)
FTD_MAX_DAY    = 7
RALLY_LOW_LOOKBACK = 15 # sessions to look back for the swing low

# --- Entry sizing (Jha-documented: full on FTD, half on 3WK) ---
FTD_SIZE = 1.00   # fraction of sleeve cash to deploy on Follow-Through Day
TWK_SIZE = 0.50   # fraction of sleeve cash to deploy on Three White Knights

# --- Exit / distribution ---
# Jha states 4–5 distribution days. Using 5 (conservative end of her range).
DIST_PCT    = 0.20  # % QQQ decline to count as distribution day (IBD standard min)
DIST_WINDOW = 25    # rolling session window
DIST_COUNT  = 5     # Jha's stated rule: "4–5 distribution days" → using 5

# --- Technical stop (Jha-documented; replaces the INVENTED VIX-scaled % stop) ---
# FTD entry  → stop = TQQQ low of the FTD day itself
# 3WK entry  → stop = TQQQ low of day 1 (first of the three HH+HL days)
# No percentage hard stop. No VIX scaling. No trailing stop.
# The stop level is stored in STATE at entry time.

# --- Additional Jha exit signals ---
# 10-day MA (TQQQ): exit if TQQQ closes below 10-day SMA on rising volume
# Three consecutive down days (QQQ): 3 sessions of lower-high + lower-low on rising vol
# 52-week-high on declining volume (QQQ): "sell into strength" alert
# All documented in IBD Live / TraderLion interview sources.
WK52_LOOKBACK = 252   # sessions for the 52-week-high check

# --- Exit confluence model (faithful to Jha: sells are ALERTS, not single triggers) ---
# Research (IBD Live viewer notes): "doesn't make any sell until a couple of rules
# have triggered ... may scale out." We mechanize that as:
#   HARD stops  -> sell immediately (her non-negotiable risk controls):
#                  regime_break (QQQ < SMA200), tech_stop (undercut entry-day low)
#   SOFT alerts -> require >= SOFT_EXIT_CONFLUENCE to fire before SELL ALL:
#                  ema21x2, distribution, ten_day_ma, three_down, wk52_decl_vol
# SOFT_EXIT_CONFLUENCE is fitted by backtest_v41.py (sweep 1/2/3). 1 == old behavior.
SOFT_EXIT_CONFLUENCE = 2

# --- Data fetch ---
MIN_FETCH_DAYS = 400  # calendar days; guarantees SMA200 is never silently null

# --- Backtest results (backtest_v41.py, 2026-06-01; 1999-2026, synthetic 3x
#     through dot-com + GFC, honest financing/expense/slippage costs) ---
# Shipped constants (confluence=2, DIST_COUNT=5) — chosen for FIDELITY to Jha's
# stated rules ("a couple" of alerts; "4-5" distribution days), not backtest max.
#   v4.1 :  CAGR 2.9%   MaxDD -43%   Sharpe 0.27
#   Gayed:  CAGR 12.4%  MaxDD -95%   Sharpe 0.49
#   BH QQQ: CAGR 10.3%  MaxDD -83%   Sharpe 0.50
#   BH TQQQ:CAGR 2.7%   MaxDD -100%  Sharpe 0.44
# HONEST VERDICT: does NOT clear the §10 Sharpe bar vs Gayed/QQQ, BUT cuts max
# drawdown by more than half (-43% vs -95/-100%). The timing overlay's value here
# is SURVIVABILITY of a 3x instrument, not return maximization. Buy-hold QQQ has
# the best risk-adjusted return of all — an important, honest finding for the operator.
CONSTANTS_PROVISIONAL = False   # constants are now fitted to Jha's stated values + validated
BACKTEST_RAN    = True
BACKTEST_DATE   = "2026-06-01"
V41_CAGR        = 2.9
V41_MAXDD       = -43.0
V41_SHARPE      = 0.27
GAYED_SHARPE    = 0.49
GAYED_MAXDD     = -95.4
VALIDATION_PASSED = False        # does not beat Gayed on Sharpe; far shallower drawdown

# --- 2026 FOMC decision dates (Day 2 = announcement day) ---
FOMC_DATES_2026 = [
    "2026-01-28", "2026-03-18", "2026-05-06",
    "2026-06-17", "2026-07-29", "2026-09-16",
    "2026-10-28", "2026-12-09",
]

VETOED_EVENT_TYPES = ["FOMC", "CPI", "PCE", "NFP", "GDP"]

class _Cfg:
    pass
cfg = _Cfg()
for _k,_v in list(globals().items()):
    if _k.isupper():
        setattr(cfg,_k,_v)
import sys as _sys
_self = _sys.modules[__name__]
data_mod = sig = st = dp = ev = _self

# ===== events.py =====
"""
events.py — Event veto logic (§4 of STRATEGY_SPEC.md).

News/events may VETO a fresh BUY (never create or strengthen one).
Sources:
  1. Operator-supplied dates in STATE['upcoming_events'] ("YYYY-MM-DD LABEL")
  2. Hardcoded 2026 FOMC announcement dates (Day 2 of each 2-day meeting)

The veto window is ≤ 24h: an event scheduled for today OR tomorrow (next calendar
day) triggers the veto on a potential buy.
"""



def _parse_event_date(event_str: str) -> datetime.date | None:
    try:
        return datetime.date.fromisoformat(event_str.split()[0])
    except (ValueError, IndexError):
        return None


def check_event_veto(upcoming_events: list[str]) -> tuple[bool, str]:
    """
    Returns (veto_active, reason_string).
    Checks hardcoded FOMC calendar + operator-supplied events.
    A BUY becomes WAIT if veto_active.
    """
    today    = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)

    # Build set of veto dates (today or tomorrow)
    veto_window = {today, tomorrow}

    # FOMC dates (hardcoded 2026)
    for ds in FOMC_DATES_2026:
        d = _parse_event_date(ds)
        if d and d in veto_window:
            return True, f"FOMC announcement within 24h ({d.isoformat()})"

    # Operator-supplied events
    for event_str in upcoming_events:
        d = _parse_event_date(event_str)
        if d and d in veto_window:
            label = event_str[len(d.isoformat()):].strip() or 'macro event'
            return True, f"Operator-flagged event within 24h: {label} ({d.isoformat()})"

    return False, ''

# ===== data.py =====
"""
data.py — Fetch QQQ/TQQQ/VIX from yfinance.
Always fetches >= MIN_FETCH_DAYS calendar days so SMA200 is never silently null.
Returns TQQQ low + volume (needed for technical stop and 10-day MA exit).
"""




class DataError(Exception):
    pass


def _download(ticker: str, start: datetime.date, _attempts: int = 3) -> pd.DataFrame:
    """
    Download one ticker with retry + backoff. Raises DataError (never returns an
    empty frame) so a partial Yahoo failure can't crash downstream with a bare
    KeyError on df['Close'] — it fails safe to a clean ERROR report instead.
    """
    import time
    last_err = None
    for i in range(_attempts):
        try:
            df = yf.download(ticker, start=start.isoformat(),
                             auto_adjust=False, progress=False, threads=False)
        except Exception as e:                 # SSL / proxy / network / 429
            last_err, df = e, None
        if df is not None and len(df) > 0:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            return df
        if i < _attempts - 1:
            time.sleep(2 ** i)                 # 1s, 2s
    raise DataError(
        f"{ticker}: no data after {_attempts} attempts"
        + (f" (last error: {type(last_err).__name__}: {last_err})"
           if last_err else " (empty frame returned)")
    )


def fetch_all() -> dict:
    """
    Return dict with:
      'qqq'          — QQQ full OHLCV DataFrame
      'tqqq_close'   — TQQQ Close aligned to QQQ calendar
      'tqqq_low'     — TQQQ Low  aligned to QQQ calendar (for technical stop)
      'tqqq_volume'  — TQQQ Volume aligned to QQQ calendar (for 10d MA exit)
      'vix_close'    — VIX Close aligned to QQQ calendar
    """
    start = datetime.date.today() - datetime.timedelta(days=MIN_FETCH_DAYS + 60)

    qqq  = _download('QQQ',  start)
    tqqq = _download('TQQQ', start)
    vix  = _download('^VIX', start)

    if len(qqq) < 200:
        raise DataError(
            f"QQQ returned only {len(qqq)} rows — SMA200 cannot be computed. "
            "Check network or increase MIN_FETCH_DAYS."
        )

    idx = qqq.index
    tqqq_close  = tqqq['Close'].reindex(idx, method='ffill')
    tqqq_low    = tqqq['Low'].reindex(idx, method='ffill')
    tqqq_volume = tqqq['Volume'].reindex(idx, method='ffill').fillna(0)
    vix_close   = vix['Close'].reindex(idx, method='ffill')

    return dict(
        qqq=qqq,
        tqqq_close=tqqq_close,
        tqqq_low=tqqq_low,
        tqqq_volume=tqqq_volume,
        vix_close=vix_close,
    )

# ===== signals.py =====
"""
signals.py — All indicator computation and signal evaluation for TQQQ JHA v4.1.

Faithful to Vibha Jha's documented rules (IBD Live, TraderLion interviews).
Entry signals: QQQ-based (FTD + 3 White Knights only).
Exits: QQQ-based signals + TQQQ-based stops.
Technical stop replaces INVENTED VIX-scaled % stop.
"""




# ---------------------------------------------------------------------------
# QQQ indicator computation
# ---------------------------------------------------------------------------

def compute_indicators(qqq: pd.DataFrame) -> pd.DataFrame:
    """Build all needed QQQ indicators."""
    df = pd.DataFrame(index=qqq.index)
    df['close'] = qqq['Close']
    df['high']  = qqq['High']
    df['low']   = qqq['Low']
    df['vol']   = qqq['Volume']

    df['sma50']  = df['close'].rolling(50).mean()
    df['sma200'] = df['close'].rolling(200).mean()
    df['ema21']  = df['close'].ewm(span=21, adjust=False).mean()
    df['sma200_slope'] = (
        df['sma200'] - df['sma200'].shift(cfg.REGIME_SLOPE_LOOKBACK)
    )

    df['ret']     = df['close'].pct_change()
    df['vol_up']  = df['vol'] > df['vol'].shift(1)
    df['below21'] = df['close'] < df['ema21']
    df['dist_day'] = (df['ret'] <= -(cfg.DIST_PCT / 100)) & df['vol_up']

    return df


# ---------------------------------------------------------------------------
# TQQQ indicator computation (for 10-day MA exit and technical stop)
# ---------------------------------------------------------------------------

def compute_tqqq_indicators(tqqq_close: pd.Series,
                             tqqq_volume: pd.Series) -> pd.DataFrame:
    """TQQQ-specific indicators needed for exits."""
    df = pd.DataFrame({'close': tqqq_close, 'vol': tqqq_volume},
                      index=tqqq_close.index)
    df['sma10']  = df['close'].rolling(10).mean()
    df['vol_up'] = df['vol'] > df['vol'].shift(1)
    return df


# ---------------------------------------------------------------------------
# Regime gate (Stage 2: QQQ > rising SMA200)
# ---------------------------------------------------------------------------

def regime_gate(df: pd.DataFrame) -> tuple[bool, str]:
    """Returns (gate_ok, description). Fail-safe False on NaN SMA200."""
    row   = df.iloc[-1]
    sma200 = row['sma200']
    slope  = row['sma200_slope']

    if np.isnan(sma200) or np.isnan(slope):
        return False, "DATA ERROR — SMA200 unavailable; fail-safe WAIT"

    above  = row['close'] > sma200
    rising = slope > 0
    desc = (
        f"QQQ ${row['close']:.2f} {'>' if above else '<'} SMA200 ${sma200:.2f}; "
        f"SMA200 {'rising' if rising else 'flat/falling'} "
        f"({'+' if slope >= 0 else ''}{slope:.2f} over {cfg.REGIME_SLOPE_LOOKBACK}d)"
    )
    return (above and rising), desc


# ---------------------------------------------------------------------------
# Entry triggers — FTD and 3 White Knights only (Jha's two documented entries)
# ---------------------------------------------------------------------------

def _ftd_check(df: pd.DataFrame) -> tuple[bool, str]:
    """Follow-Through Day — primary Jha entry."""
    n = len(df)
    if n < 2:
        return False, ""
    row = df.iloc[-1]
    if not row['vol_up'] or row['ret'] * 100 < cfg.FTD_PCT:
        return False, ""

    lb_start = max(0, n - 1 - cfg.RALLY_LOW_LOOKBACK)
    lowback  = df['low'].iloc[lb_start:n]
    # Slice-relative argmin → convert to days-since
    days_since_low = len(lowback) - 1 - int(lowback.values.argmin())

    if cfg.FTD_MIN_DAY <= days_since_low <= cfg.FTD_MAX_DAY:
        return True, (
            f"FTD day {days_since_low} of rally attempt "
            f"(swing low ${lowback.min():.2f} {days_since_low}d ago); "
            f"QQQ +{row['ret']*100:.2f}% on higher vol"
        )
    return False, ""


def _three_white_knights(df: pd.DataFrame) -> tuple[bool, str]:
    """3 consecutive sessions of higher-high AND higher-low."""
    if len(df) < 4:
        return False, ""
    hh = all(df['high'].iloc[-1-k] > df['high'].iloc[-2-k] for k in range(3))
    hl = all(df['low'].iloc[-1-k]  > df['low'].iloc[-2-k]  for k in range(3))
    if hh and hl:
        return True, (
            f"3 White Knights: 3 consecutive higher-high & higher-low days; "
            f"QQQ close ${df['close'].iloc[-1]:.2f}"
        )
    return False, ""


def entry_signals(df: pd.DataFrame) -> tuple[bool, str, str]:
    """
    Evaluate entry triggers. Priority: FTD > 3WK.
    Returns (fired, name, description).
    Note: 50-day reclaim is NOT a standalone Jha entry; it describes the typical
    setup context, not a third independent trigger.
    """
    ftd_ok, ftd_desc = _ftd_check(df)
    if ftd_ok:
        return True, 'FTD', ftd_desc

    twk_ok, twk_desc = _three_white_knights(df)
    if twk_ok:
        return True, '3WK', twk_desc

    return False, '', ''


# ---------------------------------------------------------------------------
# Exit signals — Jha's documented rules only
# ---------------------------------------------------------------------------

def exit_signals(
    df: pd.DataFrame,            # QQQ indicators (today at iloc[-1])
    tqqq_df: pd.DataFrame,       # TQQQ indicators (close, sma10, vol_up)
    entry_stop_price: float,     # technical stop stored at entry time
    consecutive_below_ema21: int,
) -> tuple[str | None, str, list]:
    """
    Confluence exit model (faithful to Jha — sells are alerts, not single triggers).
    Returns (reason_code | None, description, soft_alerts_list).

    HARD stops (sell immediately — her non-negotiable risk controls):
      regime_break — QQQ closes below SMA200 (Stage-2 break; "ugly on the way down")
      tech_stop    — TQQQ undercuts the entry-day low (her stated stop)

    SOFT alerts (need >= SOFT_EXIT_CONFLUENCE before SELL ALL):
      ema21x2      — 2 consecutive closes below QQQ 21-EMA
      distribution — DIST_COUNT distribution days in DIST_WINDOW sessions
      ten_day_ma   — TQQQ closes below 10-day SMA on rising TQQQ volume
      three_down   — 3 consecutive QQQ lower-high+lower-low days on rising vol
      wk52_decl_vol— QQQ at/near 52-week high on declining volume (sell into strength)
    """
    qqq_row  = df.iloc[-1]
    tqqq_row = tqqq_df.iloc[-1]
    tqqq_px  = float(tqqq_row['close'])

    # ---- HARD stops first (immediate) ----
    sma200 = qqq_row['sma200']
    if not np.isnan(sma200) and qqq_row['close'] < sma200:
        return 'regime_break', (
            f"QQQ ${qqq_row['close']:.2f} closed below SMA200 ${sma200:.2f} "
            f"(Stage-2 break — HARD stop)"
        ), []

    if entry_stop_price and tqqq_px <= entry_stop_price:
        return 'tech_stop', (
            f"TQQQ ${tqqq_px:.2f} undercut technical stop ${entry_stop_price:.2f} "
            f"(entry-day low — HARD stop)"
        ), []

    # ---- SOFT alerts (collect, then apply confluence) ----
    alerts = []

    if consecutive_below_ema21 >= 2:
        alerts.append(('ema21x2',
            f"2 closes below 21-EMA ${qqq_row['ema21']:.2f}"))

    dist_count = int(df['dist_day'].iloc[-cfg.DIST_WINDOW:].sum())
    if dist_count >= cfg.DIST_COUNT:
        alerts.append(('distribution',
            f"{dist_count} dist days / {cfg.DIST_WINDOW} sessions"))

    sma10 = float(tqqq_row['sma10']) if not np.isnan(tqqq_row['sma10']) else None
    if sma10 and tqqq_px < sma10 and tqqq_row['vol_up']:
        alerts.append(('ten_day_ma',
            f"TQQQ < 10-day SMA ${sma10:.2f} on rising vol"))

    if len(df) >= 4:
        lh = all(df['high'].iloc[-1-k] < df['high'].iloc[-2-k] for k in range(3))
        ll = all(df['low'].iloc[-1-k]  < df['low'].iloc[-2-k]  for k in range(3))
        if lh and ll and qqq_row['vol_up']:
            alerts.append(('three_down',
                "3 down days (LH+LL) on rising vol"))

    if len(df) >= cfg.WK52_LOOKBACK:
        hi_52 = df['high'].iloc[-cfg.WK52_LOOKBACK:].max()
        at_high = qqq_row['close'] >= 0.99 * hi_52
        if at_high and not qqq_row['vol_up']:   # new high on declining volume
            alerts.append(('wk52_decl_vol',
                f"near 52wk high ${hi_52:.2f} on declining vol"))

    if len(alerts) >= cfg.SOFT_EXIT_CONFLUENCE:
        codes = "+".join(a[0] for a in alerts)
        detail = "; ".join(a[1] for a in alerts)
        return codes, (
            f"{len(alerts)} soft alerts fired (need {cfg.SOFT_EXIT_CONFLUENCE}): {detail}"
        ), alerts

    # Not enough alerts to sell — report standing count for the HOLD view
    return None, '', alerts


# ---------------------------------------------------------------------------
# Stop level summary (for HOLD reports)
# ---------------------------------------------------------------------------

def stop_distances(
    df: pd.DataFrame,
    tqqq_df: pd.DataFrame,
    entry_stop_price: float,
) -> dict:
    """Return live stop levels and distances for the HOLD report."""
    tqqq_px  = float(tqqq_df.iloc[-1]['close'])
    qqq_row  = df.iloc[-1]
    sma10    = float(tqqq_df.iloc[-1]['sma10']) if not np.isnan(tqqq_df.iloc[-1]['sma10']) else None

    tech_dist = ((tqqq_px - entry_stop_price) / tqqq_px * 100) if entry_stop_price else None
    ma10_dist = ((tqqq_px - sma10) / tqqq_px * 100) if sma10 else None

    return dict(
        tqqq_px=tqqq_px,
        tech_stop=entry_stop_price,
        tech_stop_dist_pct=tech_dist,
        ema21=float(qqq_row['ema21']),
        tqqq_sma10=sma10,
        tqqq_sma10_dist_pct=ma10_dist,
    )

# ===== state.py =====
"""
state.py — Read/write TQQQ_STATE.json.

Writes a single canonical file + rotating backup (TQQQ_STATE_prev.json).
Computed P&L derived from logged fills only — never operator-declared.
"""

from typing import Optional

STATE_FILE  = os.environ.get('TQQQ_STATE_PATH', 'TQQQ_STATE.json')
BACKUP_FILE = STATE_FILE.replace('.json', '_prev.json')

EMPTY_STATE = dict(
    version='4.1',
    position='FLAT',               # 'FLAT' | 'LONG'
    entry_price=None,              # float — TQQQ fill price
    entry_date=None,               # ISO date string
    entry_trigger=None,            # 'FTD' | '3WK'
    entry_stop_price=None,         # float — technical stop (Jha: entry-day low)
    entry_size_pct=None,           # fraction of sleeve deployed (1.0 FTD, 0.5 3WK)
    consecutive_below_ema21=0,     # int — for ema21x2 exit
    distribution_days=[],          # ISO date strings in current rolling window
    last_processed_bar_date=None,  # ISO date of the last COMPLETED bar we acted on
    last_recommendation=None,
    last_recommendation_date=None,
    sleeve_cash=7500.0,            # operator-set Roth sleeve cash
    fills=[],                      # [{type, date, price, trigger/reason, pnl}]
    realized_pnl_computed=0.0,     # computed from fills; never operator-declared
    upcoming_events=[],            # "YYYY-MM-DD LABEL" list (operator-set event vetos)
    operator_notes='',
)


def load() -> dict:
    if not os.path.exists(STATE_FILE):
        return dict(EMPTY_STATE)
    try:
        with open(STATE_FILE, 'r') as f:
            data = json.load(f)
        for k, v in EMPTY_STATE.items():
            data.setdefault(k, v)
        return data
    except Exception as e:
        print(f"[state] WARNING: could not read {STATE_FILE}: {e}. Starting fresh.")
        return dict(EMPTY_STATE)


def save(state: dict) -> None:
    state['last_written'] = datetime.datetime.utcnow().isoformat() + 'Z'
    if os.path.exists(STATE_FILE):
        shutil.copy2(STATE_FILE, BACKUP_FILE)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2, default=str)


# ---------------------------------------------------------------------------
# Fill accounting
# ---------------------------------------------------------------------------

def record_buy(state: dict, date: str, price: float, trigger: str,
               stop_price: float, size_pct: float) -> None:
    state['position']          = 'LONG'
    state['entry_price']       = price
    state['entry_date']        = date
    state['entry_trigger']     = trigger
    state['entry_stop_price']  = stop_price
    state['entry_size_pct']    = size_pct
    state['consecutive_below_ema21'] = 0
    state['fills'].append(dict(
        type='BUY', date=date, price=price,
        trigger=trigger, stop=stop_price, size_pct=size_pct,
    ))


def record_sell(state: dict, date: str, price: float, reason: str) -> None:
    entry_price = state.get('entry_price') or price
    size_pct    = state.get('entry_size_pct') or 1.0
    sleeve      = state.get('sleeve_cash') or 0.0
    shares      = int(sleeve * size_pct / entry_price) if entry_price > 0 else 0
    pnl         = (price - entry_price) * shares

    state['realized_pnl_computed'] = (state.get('realized_pnl_computed') or 0.0) + pnl
    state['position']         = 'FLAT'
    state['entry_price']      = None
    state['entry_date']       = None
    state['entry_trigger']    = None
    state['entry_stop_price'] = None
    state['entry_size_pct']   = None
    state['consecutive_below_ema21'] = 0
    state['fills'].append(dict(
        type='SELL', date=date, price=price, reason=reason,
        shares=shares, pnl=pnl,
    ))


def update_ema21_streak(state: dict, qqq_below_ema21: bool) -> None:
    if qqq_below_ema21:
        state['consecutive_below_ema21'] = (state.get('consecutive_below_ema21') or 0) + 1
    else:
        state['consecutive_below_ema21'] = 0


def update_distribution_days(state: dict, is_dist_day: bool,
                              today: str, dist_window: int = 25) -> None:
    days   = state.get('distribution_days') or []
    if is_dist_day:
        days.append(today)
    cutoff = (datetime.date.today() - datetime.timedelta(days=dist_window * 2)).isoformat()
    state['distribution_days'] = [d for d in days if d >= cutoff]


def sleeve_shares(sleeve_cash: float, size_pct: float, tqqq_px: float) -> int:
    """Whole shares affordable given sleeve cash × size fraction."""
    if tqqq_px <= 0 or sleeve_cash <= 0:
        return 0
    return int(sleeve_cash * size_pct / tqqq_px)

# ===== discord_post.py =====
"""
discord_post.py — Discord webhook delivery for TQQQ JHA v4.1.

Preserves the embed structure from v3.1: color-by-recommendation, field layout,
char-limit truncation guard (Discord embed cap: 6000 total chars).
Env var: DISCORD_WEBHOOK (same as v3.1).
"""


WEBHOOK_ENV = 'DISCORD_WEBHOOK'
MAX_FIELD_VALUE = 1024    # Discord field value limit
MAX_DESCRIPTION = 4096    # Discord embed description limit
MAX_EMBED_TOTAL = 6000    # Discord total embed char limit

COLORS = {
    'BUY':  0x2ecc71,   # green
    'SELL': 0xe74c3c,   # red
    'HOLD': 0x3498db,   # blue
    'WAIT': 0xf39c12,   # orange
    'ERROR':0x95a5a6,   # grey
}


def _trunc(text: str, limit: int = MAX_FIELD_VALUE) -> str:
    if len(text) <= limit:
        return text
    return text[:limit - 3] + '...'


def build_embed(
    rec: str,                    # 'BUY' | 'SELL' | 'HOLD' | 'WAIT' | 'ERROR'
    title_suffix: str,           # short label after "TQQQ JHA —"
    description: str,            # main body
    fields: list[dict],          # list of {name, value, inline?}
    provisional: bool = True,
) -> dict:
    color = COLORS.get(rec, COLORS['ERROR'])
    now   = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')

    footer_text = f"TQQQ JHA v4.1  •  {now}"
    if provisional:
        footer_text += "  •  ⚠ constants provisional — strategy did not clear §10 validation bar"

    embed = {
        'title':       f"TQQQ JHA — {title_suffix}",
        'description': _trunc(description, MAX_DESCRIPTION),
        'color':       color,
        'fields':      [
            {'name': _trunc(f['name'], 256),
             'value': _trunc(f.get('value', '​'), MAX_FIELD_VALUE),
             'inline': f.get('inline', False)}
            for f in fields
        ],
        'footer': {'text': _trunc(footer_text, 2048)},
    }

    # Enforce total embed char budget
    total = len(embed['title']) + len(embed['description']) + len(embed['footer']['text'])
    for field in embed['fields']:
        total += len(field['name']) + len(field['value'])
    if total > MAX_EMBED_TOTAL:
        # Trim description first
        over = total - MAX_EMBED_TOTAL + 20
        embed['description'] = embed['description'][:-over] + '…'

    return embed


def post(embed: dict, dry_run: bool = False) -> bool:
    """
    POST the embed to Discord. Returns True on success.
    If dry_run=True, just prints the payload (for testing without a real webhook).
    """
    webhook_url = os.environ.get(WEBHOOK_ENV, '')

    payload = {'embeds': [embed]}
    payload_str = json.dumps(payload, indent=2)

    if dry_run or not webhook_url:
        print("[discord_post] DRY RUN — payload:")
        print(payload_str)
        return True

    try:
        resp = requests.post(
            webhook_url,
            headers={'Content-Type': 'application/json'},
            data=payload_str,
            timeout=15,
        )
        if resp.status_code in (200, 204):
            print(f"[discord_post] Posted successfully ({resp.status_code})")
            return True
        print(f"[discord_post] ERROR: HTTP {resp.status_code} — {resp.text[:200]}")
        return False
    except Exception as e:
        print(f"[discord_post] Exception posting to Discord: {e}")
        return False

# ===== advisor.py =====
"""
advisor.py — TQQQ JHA v4.1 main orchestration.

Jha-faithful per documented rules (IBD Live / TraderLion interviews):
  Entries : FTD (full size) and 3 White Knights (half size) only.
  Stops   : Technical — entry-day TQQQ low (FTD) or day-1 TQQQ low (3WK).
  Exits   : 2 closes below 21-EMA, 5 dist days/25 sessions, regime break,
            tech stop, TQQQ loses 10-day MA on rising vol, 3 consecutive
            QQQ down days (LH+LL) on rising vol.
  Removed : VIX-scaled hard stop (INVENTED), trailing stop (INVENTED),
            50-day reclaim entry (not a standalone Jha trigger).

Advisory only (Option B). Does NOT execute trades. Output posted to Discord.
"""




def _fmt_dollar(v: float) -> str:
    return f"${v:,.2f}"


def run(dry_run: bool = False, verbose: bool = False) -> dict:
    today_str = datetime.date.today().isoformat()
    print(f"[advisor] TQQQ JHA v4.1  —  {today_str}")

    # ------------------------------------------------------------------ #
    # 1. FETCH DATA
    # ------------------------------------------------------------------ #
    print("[advisor] Fetching market data...")
    try:
        market = data_mod.fetch_all()
    except data_mod.DataError as e:
        _post_error(str(e), dry_run)
        return dict(recommendation='ERROR', reason=str(e))

    qqq          = market['qqq']
    tqqq_close   = market['tqqq_close']
    tqqq_low     = market['tqqq_low']
    tqqq_volume  = market['tqqq_volume']

    # ------------------------------------------------------------------ #
    # 2. INDICATORS
    # ------------------------------------------------------------------ #
    df       = sig.compute_indicators(qqq)
    tqqq_df  = sig.compute_tqqq_indicators(tqqq_close, tqqq_volume)

    if np.isnan(df['sma200'].iloc[-1]):
        err = "SMA200 is NaN — DATA ERROR. Fetch period insufficient."
        _post_error(err, dry_run)
        return dict(recommendation='ERROR', reason=err)

    # Stale-data guard: how old is the latest completed bar?
    bar_date    = df.index[-1].date()
    bar_date_str= bar_date.isoformat()
    age_days    = (datetime.date.today() - bar_date).days
    if age_days > 4:   # > a long weekend → data feed is stale
        err = (f"Latest QQQ bar is {bar_date_str} ({age_days} days old) — "
               "data feed appears stale. Fail-safe: no action.")
        _post_error(err, dry_run)
        return dict(recommendation='ERROR', reason=err)

    tqqq_px   = float(tqqq_close.iloc[-1])
    tqqq_low_today = float(tqqq_low.iloc[-1])
    tqqq_low_day1  = float(tqqq_low.iloc[-3]) if len(tqqq_low) >= 3 else tqqq_low_today

    if verbose:
        r = df.iloc[-1]
        t = tqqq_df.iloc[-1]
        print(f"  QQQ:   ${r['close']:.2f}  EMA21 ${r['ema21']:.2f}"
              f"  SMA50 ${r['sma50']:.2f}  SMA200 ${r['sma200']:.2f}")
        print(f"  TQQQ:  ${tqqq_px:.2f}  SMA10 ${t['sma10']:.2f}"
              f"  low_today ${tqqq_low_today:.2f}  low_day1 ${tqqq_low_day1:.2f}")
        print(f"  dist_day={r['dist_day']}  below21={r['below21']}")

    # ------------------------------------------------------------------ #
    # 3. LOAD STATE
    # ------------------------------------------------------------------ #
    state = st.load()
    position      = state.get('position', 'FLAT')
    entry_price   = state.get('entry_price')
    entry_stop    = state.get('entry_stop_price')
    entry_size_pct= state.get('entry_size_pct') or 1.0
    entry_trigger = state.get('entry_trigger')
    below_streak  = state.get('consecutive_below_ema21', 0)
    sleeve_cash   = state.get('sleeve_cash', 7500.0)
    realized_pnl  = state.get('realized_pnl_computed', 0.0)

    # New-bar guard: only advance streaks / record fills once per COMPLETED bar.
    # Lets the routine fire multiple times a day safely (intraday reminders) without
    # double-counting. The decisive evaluation is the post-close fire.
    new_bar = (bar_date_str != state.get('last_processed_bar_date'))
    if verbose:
        print(f"  bar_date={bar_date_str}  new_bar={new_bar}  "
              f"(last_processed={state.get('last_processed_bar_date')})")

    # Update live tracking when LONG — only on a new completed bar
    if position == 'LONG' and new_bar:
        below_today = bool(df['below21'].iloc[-1])
        st.update_ema21_streak(state, below_today)
        below_streak = state['consecutive_below_ema21']

        is_dist = bool(df['dist_day'].iloc[-1])
        st.update_distribution_days(state, is_dist, today_str, cfg.DIST_WINDOW)

    # ------------------------------------------------------------------ #
    # 4. REGIME GATE
    # ------------------------------------------------------------------ #
    gate_ok, gate_desc = sig.regime_gate(df)

    # ------------------------------------------------------------------ #
    # 5. DECISION
    # ------------------------------------------------------------------ #
    recommendation = None
    trigger_name   = ''
    trigger_desc   = ''
    exit_reason    = None
    exit_desc      = ''
    soft_alerts    = []
    new_stop_price = None
    new_size_pct   = None

    if position == 'FLAT':
        if not gate_ok:
            recommendation = 'WAIT'
            trigger_desc   = f"Regime gate FAIL: {gate_desc}"
        else:
            trig_ok, trigger_name, trigger_desc = sig.entry_signals(df)
            if trig_ok:
                veto_on, veto_reason = ev.check_event_veto(
                    state.get('upcoming_events', [])
                )
                if veto_on:
                    recommendation = 'WAIT'
                    trigger_desc   = (
                        f"Entry trigger ({trigger_name}) vetoed: {veto_reason}"
                    )
                else:
                    recommendation  = 'BUY'
                    # Technical stop: FTD → today's TQQQ low; 3WK → day-1 TQQQ low
                    new_stop_price  = tqqq_low_today if trigger_name == 'FTD' else tqqq_low_day1
                    # Sizing: FTD = full, 3WK = half
                    new_size_pct    = cfg.FTD_SIZE if trigger_name == 'FTD' else cfg.TWK_SIZE
            else:
                recommendation = 'WAIT'
                trigger_desc   = f"Gate PASS but no entry trigger fired. ({gate_desc})"

    else:  # LONG
        exit_reason, exit_desc, soft_alerts = sig.exit_signals(
            df=df,
            tqqq_df=tqqq_df,
            entry_stop_price=entry_stop,
            consecutive_below_ema21=below_streak,
        )
        recommendation = 'SELL' if exit_reason else 'HOLD'

    # ------------------------------------------------------------------ #
    # 6. UPDATE STATE
    #   State transitions (fills) only happen on a NEW completed bar, so
    #   repeated intraday fires don't double-trade. On a non-new bar the
    #   recommendation is still reported but does not mutate position.
    # ------------------------------------------------------------------ #
    if new_bar and recommendation == 'BUY':
        st.record_buy(
            state, bar_date_str, tqqq_px,
            trigger_name, new_stop_price, new_size_pct,
        )
        entry_price   = tqqq_px
        entry_stop    = new_stop_price
        entry_size_pct= new_size_pct

    elif new_bar and recommendation == 'SELL':
        st.record_sell(state, bar_date_str, tqqq_px, exit_reason)
        realized_pnl = state['realized_pnl_computed']

    state['last_recommendation']      = recommendation
    state['last_recommendation_date'] = today_str
    if new_bar:
        state['last_processed_bar_date'] = bar_date_str

    # Persist ONLY on a real (non-dry) run. Dry-run must never mutate the
    # operator's position file. (Bug fix: previously saved unconditionally.)
    if not dry_run:
        st.save(state)
    else:
        print("[advisor] DRY RUN — state NOT persisted.")

    # ------------------------------------------------------------------ #
    # 7. BUILD + POST DISCORD EMBED
    # ------------------------------------------------------------------ #
    display_position   = state.get('position', 'FLAT')
    display_entry_date = state.get('entry_date', today_str)
    # After a BUY, use the trigger that just fired (not the stale pre-buy state value)
    display_trigger    = trigger_name if recommendation == 'BUY' else entry_trigger

    result = _compose_and_post(
        recommendation=recommendation,
        trigger_name=trigger_name,
        trigger_desc=trigger_desc,
        exit_reason=exit_reason,
        exit_desc=exit_desc,
        gate_ok=gate_ok,
        gate_desc=gate_desc,
        soft_alerts=soft_alerts,
        position=display_position,
        entry_date=display_entry_date,
        entry_price=entry_price,
        entry_stop=entry_stop,
        entry_size_pct=entry_size_pct,
        entry_trigger=display_trigger,
        tqqq_px=tqqq_px,
        df=df,
        tqqq_df=tqqq_df,
        sleeve_cash=sleeve_cash,
        realized_pnl=realized_pnl,
        below_streak=below_streak,
        dist_days=state.get('distribution_days', []),
        today_str=today_str,
        dry_run=dry_run,
    )
    return result


def _compose_and_post(**kw) -> dict:
    rec          = kw['recommendation']
    tqqq_px      = kw['tqqq_px']
    entry_price  = kw['entry_price']
    entry_stop   = kw['entry_stop']
    entry_size_pct = kw['entry_size_pct'] or 1.0
    sleeve_cash  = kw['sleeve_cash']
    realized_pnl = kw['realized_pnl']
    df           = kw['df']
    tqqq_df      = kw['tqqq_df']
    below_streak = kw['below_streak']
    dist_days    = kw['dist_days']

    r    = df.iloc[-1]
    t    = tqqq_df.iloc[-1]
    qqq_px  = float(r['close'])
    sma200  = float(r['sma200'])
    sma50   = float(r['sma50'])
    ema21   = float(r['ema21'])
    sma10_t = float(t['sma10']) if not np.isnan(t['sma10']) else None

    # --- Order line ---
    shares = st.sleeve_shares(sleeve_cash, entry_size_pct, tqqq_px)
    deployed = sleeve_cash * entry_size_pct
    if rec == 'BUY':
        size_label = "FULL" if entry_size_pct >= 1.0 else f"HALF ({entry_size_pct*100:.0f}%)"
        order_line = (
            f"BUY {shares} shares TQQQ (~{_fmt_dollar(deployed)}, {size_label} position) "
            f"at market  [Fidelity: TQQQ]"
        )
    elif rec == 'SELL':
        order_line = "SELL ALL TQQQ at market  [Fidelity: TQQQ]"
    else:
        order_line = "No order today."

    # --- Open P&L ---
    if kw['position'] == 'LONG' and entry_price:
        held_shares = st.sleeve_shares(sleeve_cash, entry_size_pct, entry_price)
        open_pnl    = (tqqq_px - entry_price) * held_shares
        pct         = (tqqq_px / entry_price - 1) * 100
        open_pnl_str = f"{_fmt_dollar(open_pnl)} ({pct:+.1f}% per share, {held_shares} shares)"
    else:
        open_pnl_str = "N/A (FLAT)"

    # --- Stop info ---
    stop_info = ""
    if kw['position'] == 'LONG' and entry_price:
        stops = sig.stop_distances(df, tqqq_df, entry_stop)
        lines = []
        if stops['tech_stop']:
            lines.append(
                f"• Technical stop: ${stops['tech_stop']:.2f} "
                f"({stops['tech_stop_dist_pct']:.1f}% away from TQQQ ${tqqq_px:.2f})"
            )
        if sma10_t:
            above_or_below = "above" if tqqq_px >= sma10_t else "⚠ BELOW"
            lines.append(
                f"• TQQQ 10-day SMA: ${sma10_t:.2f} (TQQQ {above_or_below})"
            )
        lines.append(
            f"• 21-EMA exit: {below_streak}/2 sessions below QQQ EMA21 ${ema21:.2f}"
        )
        alerts = kw.get('soft_alerts') or []
        lines.append(
            f"• Soft alerts: {len(alerts)}/{cfg.SOFT_EXIT_CONFLUENCE} firing"
            + (f" ({', '.join(a[0] for a in alerts)})" if alerts else "")
        )
        stop_info = "\n".join(lines)

    # --- Distribution count ---
    dist_count = len([d for d in dist_days
                      if d >= (datetime.date.today() -
                               datetime.timedelta(days=cfg.DIST_WINDOW * 2)).isoformat()])
    dist_status = f"{dist_count}/{cfg.DIST_COUNT} dist days in ~{cfg.DIST_WINDOW}-session window"

    # --- Backtest verdict flag (honest; shown every run) ---
    prov_text = (
        f"ℹ Backtested {cfg.BACKTEST_DATE}: CAGR {cfg.V41_CAGR}% / MaxDD {cfg.V41_MAXDD}% "
        f"/ Sharpe {cfg.V41_SHARPE}. Cuts drawdown vs buy-hold TQQQ (-100%) by half, but does "
        f"NOT beat buy-hold QQQ on risk-adjusted return. This overlay buys SURVIVABILITY, not alpha."
    )

    # --- Titles ---
    title_map = {
        'BUY':  f"BUY — {kw['trigger_name']} ({'FULL' if entry_size_pct >= 1.0 else 'HALF'})",
        'SELL': f"SELL ALL — {kw['exit_reason']}",
        'HOLD': "HOLD",
        'WAIT': "WAIT",
        'ERROR': "DATA ERROR",
    }
    title_suffix = title_map.get(rec, rec)

    if rec == 'BUY':
        description = f"**{kw['trigger_desc']}**"
    elif rec == 'SELL':
        description = f"**EXIT: {kw['exit_desc']}**"
    elif rec == 'WAIT':
        description = kw['trigger_desc']
    else:
        description = f"No exit condition triggered. {kw['gate_desc']}"

    if prov_text:
        description += f"\n\n{prov_text}"

    # --- Fields ---
    fields = [
        dict(name="📋 Order",
             value=f"`{order_line}`",
             inline=False),

        dict(name="🚦 Regime Gate",
             value=f"{'✅ PASS' if kw['gate_ok'] else '❌ FAIL'} — {kw['gate_desc']}",
             inline=False),

        dict(name="📊 Market",
             value=(f"QQQ: ${qqq_px:.2f} | SMA200: ${sma200:.2f} | "
                    f"SMA50: ${sma50:.2f} | EMA21: ${ema21:.2f}\n"
                    f"TQQQ: ${tqqq_px:.2f}"
                    + (f" | SMA10: ${sma10_t:.2f}" if sma10_t else "")),
             inline=False),

        dict(name="💼 Position & P&L",
             value=(
                 f"Position: **{kw['position']}**"
                 + (f" | Entry: ${entry_price:.2f} on {kw['entry_date']}"
                    f" ({kw['entry_trigger'] or 'FTD'}, "
                    f"{'full' if entry_size_pct >= 1.0 else 'half'} size)"
                    if entry_price and kw['position'] == 'LONG' else "")
                 + f"\nOpen P&L: {open_pnl_str}"
                 + f"\nRealized P&L (computed): {_fmt_dollar(realized_pnl)}"
             ),
             inline=False),
    ]

    if stop_info:
        fields.append(dict(name="🛑 Live Stops", value=stop_info, inline=False))

    fields += [
        dict(name="📉 Dist Days",    value=dist_status, inline=True),
        dict(name="📐 Entry Type",
             value=f"{kw['entry_trigger'] or '—'} ({'full' if entry_size_pct >= 1.0 else 'half'} size)" if entry_price else "FLAT",
             inline=True),
    ]

    # Self-check
    if rec == 'BUY':
        self_check = f"Rule: {kw['trigger_name']} fired. Stop set at ${entry_stop:.2f}. Gate: PASS."
    elif rec == 'SELL':
        self_check = f"Rule: {kw['exit_reason']} — {kw['exit_desc'][:120]}."
    elif rec == 'WAIT':
        self_check = "Gate false or no trigger. No action."
    else:
        self_check = "Holding. No exit condition met."
    fields.append(dict(name="🔎 Self-Check", value=self_check, inline=False))

    embed = dp.build_embed(
        rec=rec,
        title_suffix=title_suffix,
        description=description,
        fields=fields,
        provisional=cfg.CONSTANTS_PROVISIONAL,
    )
    dp.post(embed, dry_run=kw['dry_run'])

    print(f"[advisor] Recommendation: {rec}  |  {order_line}")
    return dict(
        recommendation=rec,
        trigger=kw['trigger_name'],
        exit_reason=kw['exit_reason'],
        order=order_line,
        tqqq_px=tqqq_px,
        qqq_px=qqq_px,
        gate_ok=kw['gate_ok'],
        realized_pnl=realized_pnl,
    )


def _post_error(msg: str, dry_run: bool) -> None:
    print(f"[advisor] DATA ERROR: {msg}")
    embed = dp.build_embed(
        rec='ERROR',
        title_suffix='DATA ERROR',
        description=f"**{msg}**\n\nFail-safe: regime gate treated as FALSE. No trade action.",
        fields=[],
        provisional=True,
    )
    dp.post(embed, dry_run=dry_run)
# ===== CLI entrypoint (from run.py) =====
def _main():
    p = argparse.ArgumentParser(description="TQQQ JHA v4.1 advisor (bundled)")
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--verbose', action='store_true')
    p.add_argument('--set-cash', type=float)
    p.add_argument('--add-event', type=str)
    p.add_argument('--show-state', action='store_true')
    a = p.parse_args()
    if a.set_cash is not None:
        s = load(); s['sleeve_cash'] = a.set_cash; save(s)
        print(f"[run] sleeve_cash set to ${a.set_cash:,.2f}"); return
    if a.add_event:
        s = load(); ev = s.get('upcoming_events', []); ev.append(a.add_event.strip())
        s['upcoming_events'] = sorted(set(ev)); save(s)
        print(f"[run] added event: {a.add_event}"); return
    if a.show_state:
        print(json.dumps(load(), indent=2, default=str)); return
    if not a.dry_run and not os.environ.get('DISCORD_WEBHOOK'):
        print("[run] DISCORD_WEBHOOK unset → dry-run."); a.dry_run = True
    r = run(dry_run=a.dry_run, verbose=a.verbose)
    sys.exit(0 if r.get('recommendation') != 'ERROR' else 1)

if __name__ == '__main__':
    _main()
