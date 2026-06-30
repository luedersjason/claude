# TQQQ JHA routine — recurring error: diagnosis & repair

## What the routine is
A scheduled Claude routine (claude.ai/code/routines) that runs `tqqq_jha_engine.py`
~3×/day, evaluates a Jha-style TQQQ timing model from Yahoo Finance data, writes
`TQQQ_STATE.json` / `TQQQ_JOURNAL.md` to Google Drive, and posts a BUY/SELL/HOLD/WAIT
(or ERROR) embed to a Discord webhook. Advisory only — it does not place trades.

## The recurring error (from the Drive run journal)
The frequent failure is **not** in the strategy logic. It is the **market-data fetch**
failing in the routine's ephemeral, proxied environment:

| When | Symptom in journal |
|------|--------------------|
| 2026-06-23 19:06 | `DATA_ERROR` — SSL/TLS error (OpenSSL internal failure) fetching QQQ/TQQQ/VIX |
| 2026-06-24 03:06 | `DATA_ERROR` — same SSL failure, 2nd consecutive |
| 2026-06-24 16:08 | `DATA_ERROR` — `guce.yahoo.com` consent gateway 403; query1/2 hosts 429 rate-limited |
| 2026-06-24 → 06-29 | every run now prepends a **manual** fix: `YF_DISABLE_CURL_CFFI=1` + `REQUESTS_CA_BUNDLE=/root/.ccr/ca-bundle.crt` |

### Root cause
Outbound HTTPS in the routine environment goes through an agent proxy that intercepts
TLS with a custom CA bundle (`/root/.ccr/ca-bundle.crt`). Recent `yfinance` uses a
`curl_cffi` / BoringSSL HTTP backend with browser TLS impersonation that **ignores
`REQUESTS_CA_BUNDLE`** and cannot validate the proxy's certificate → "OpenSSL internal
error", consent-gateway 403 redirects, and 429s.

The operator/agent had been hand-patching this **every cold run** (disable curl_cffi,
point at the CA bundle). Because the environment is ephemeral, the fix never persisted —
so the routine kept throwing `DATA_ERROR` whenever a run started before the patch was
re-applied, or when a transient 429 hit.

(Earlier one-off failures in the journal — stale Discord webhook 404, an 11-byte
placeholder engine, a `realized_pnl_computed=null` formatting crash — were already
resolved and are not the recurring issue.)

## The fix (this commit)
Surgical patch to the data layer of `tqqq_jha_engine.py` — **strategy logic byte-for-byte
unchanged**, verified by diff:

1. **`_bootstrap_tls()`** runs *before* `import yfinance`. It bakes the proven workaround
   into the engine so it applies on every cold start with no manual intervention:
   sets `YF_DISABLE_CURL_CFFI=1` (forces the plain-`requests` backend, which honors the
   CA bundle) and points `REQUESTS_CA_BUNDLE` / `CURL_CA_BUNDLE` / `SSL_CERT_FILE` at the
   proxy bundle when present. It is a safe no-op outside the proxied environment (vars are
   only set when the bundle file exists; uses `setdefault`, so a real env override wins).
   It **also makes `curl_cffi` un-importable** (`sys.modules['curl_cffi'] = None`) so
   yfinance falls back to plain `requests` *regardless of the installed yfinance version* —
   necessary because the routine environment does not pin yfinance and some versions ignore
   `YF_DISABLE_CURL_CFFI`. This is the exact manual fix the run journal recorded as working
   (2026-06-26 / 06-29).

2. **Hardened `_download()`** — retries 3× with 1s/2s backoff (absorbs transient SSL and
   429), and **raises `DataError` instead of ever returning an empty frame**. Previously a
   partial Yahoo failure on TQQQ or VIX (only QQQ length was checked) would crash with a
   bare `KeyError: 'Close'` and produce no Discord report at all. Now any persistent fetch
   failure fails *safe* to the existing clean `ERROR` embed.

## Recommended follow-ups (outside this repo)
- **Most durable:** set `YF_DISABLE_CURL_CFFI=1` and `REQUESTS_CA_BUNDLE=/root/.ccr/ca-bundle.crt`
  as **environment variables on the `tqqq-data` routine environment** (claude.ai/code →
  Environments). That fixes it for the whole environment regardless of which script runs.
- **Pin yfinance** in the environment setup script (e.g. a known-good version) so a
  surprise upgrade can't reintroduce the curl_cffi backend.
- Confirm the Discord webhook host is `discord.com` (not `discordapp.com`, which the
  environment allowlist blocks).

## Update — journal reviewed through 2026-06-30 13:14 UTC
The failure was **still recurring** after the initial diagnosis: fresh `DATA_ERROR`s at
2026-06-29 16:07, 2026-06-30 03:04, and 2026-06-30 03:09 UTC. Each cold run hand-applied a
*different* ad-hoc workaround (uninstall curl_cffi; downgrade yfinance 1.5.1→0.2.54;
PYTHONSTARTUP CA-bundle patch), and the **yfinance version thrashes run-to-run**
(1.4.1 → 0.2.50 → 1.5.1 → 0.2.54). That confirmed the root cause and motivated the
curl_cffi-block hardening above so the engine self-heals on any version without manual
intervention. One residual, intermittent failure mode remains that the engine cannot fully
fix on its own: Yahoo occasionally redirects to `guce.yahoo.com` (consent gateway), which
the proxy blocks (403) — pinning yfinance to a requests-based 0.2.x in the environment
setup script is the best mitigation.
