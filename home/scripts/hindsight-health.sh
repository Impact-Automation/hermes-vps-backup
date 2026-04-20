#!/usr/bin/env bash
# Hindsight health check — monitors postgres (5433) and Hindsight API (8888)
# Auto-restarts failed services, alerts Tom after 3 consecutive failures

set -euo pipefail

FAIL_COUNT_FILE="/tmp/hindsight-health-failures"
TELEGRAM_BOT_TOKEN="8416340984:AAEwL6EI6B3mN8UWoPmds82A5zqMKDJPQEM"
TOM_CHAT_ID="6884933598"
PG_ISREADY="$HOME/.pg0/installation/18.1.0/bin/pg_isready"
MAX_FAILURES=3

send_telegram() {
    local msg="$1"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TOM_CHAT_ID}" \
        -d text="${msg}" \
        -d parse_mode="Markdown" > /dev/null 2>&1
}

failures=0
if [[ -f "$FAIL_COUNT_FILE" ]]; then
    failures=$(cat "$FAIL_COUNT_FILE" 2>/dev/null || echo 0)
fi

all_ok=true

# Check postgres on port 5433
if ! "$PG_ISREADY" -h /tmp -p 5433 -q 2>/dev/null; then
    echo "$(date -Iseconds) WARN: postgres not ready on 5433, restarting..."
    systemctl --user restart hindsight-postgres
    sleep 3
    if ! "$PG_ISREADY" -h /tmp -p 5433 -q 2>/dev/null; then
        echo "$(date -Iseconds) ERROR: postgres restart failed"
        all_ok=false
    else
        echo "$(date -Iseconds) OK: postgres recovered after restart"
    fi
else
    echo "$(date -Iseconds) OK: postgres on 5433"
fi

# Check Hindsight API on port 8888
if ! curl -sf http://127.0.0.1:8888/v1/default/banks > /dev/null 2>&1; then
    echo "$(date -Iseconds) WARN: Hindsight API not responding on 8888, restarting..."
    systemctl --user restart hindsight-api
    sleep 5
    if ! curl -sf http://127.0.0.1:8888/v1/default/banks > /dev/null 2>&1; then
        echo "$(date -Iseconds) ERROR: Hindsight API restart failed"
        all_ok=false
    else
        echo "$(date -Iseconds) OK: Hindsight API recovered after restart"
    fi
else
    echo "$(date -Iseconds) OK: Hindsight API on 8888"
fi

# Track consecutive failures and alert
if [[ "$all_ok" == "true" ]]; then
    echo 0 > "$FAIL_COUNT_FILE"
else
    failures=$((failures + 1))
    echo "$failures" > "$FAIL_COUNT_FILE"
    if [[ "$failures" -ge "$MAX_FAILURES" ]]; then
        send_telegram "🚨 *Hindsight Health Alert*: $failures consecutive failures on Derrick VPS. Postgres (5433) or Hindsight API (8888) not recovering after auto-restart."
        echo "$(date -Iseconds) ALERT: Telegram sent to Tom ($failures consecutive failures)"
    fi
fi
