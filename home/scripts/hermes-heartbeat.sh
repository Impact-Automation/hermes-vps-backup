#!/usr/bin/env bash
# Hermes-native heartbeat watchdog
# 5-min cron — debounced Telegram alerts for Hermes/Hindsight outages
# States: OK | FAILING | RECOVERED

set -euo pipefail

# --- Env for cron (systemd --user needs these) ---
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"

# --- Load secrets ---
source "$HOME/.hermes/.env" 2>/dev/null || true

STATE_FILE="$HOME/.hermes/heartbeat-state.json"
LOG="$HOME/logs/heartbeat.log"
TELEGRAM_CHAT_ID="6884933598"

# Thresholds
FAIL_THRESHOLD=1       # alert on 1st failure
HOURLY_REMINDER=3      # repeat alert every 3 checks (15 min) while failing
RECOVERY_COOLDOWN=3    # don't re-alert within 3 checks of recovery

log() { echo "$(date -Iseconds) [watchdog] $*" >> "$LOG"; }

# --- Load state ---
load_state() {
    if [ -f "$STATE_FILE" ]; then
        consecutive_failures=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('consecutive_failures',0))" 2>/dev/null || echo "0")
        last_alert_check=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('last_alert_check',0))" 2>/dev/null || echo "0")
        failing_since=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('failing_since',''))" 2>/dev/null || echo "")
    else
        consecutive_failures=0; last_alert_check=0; failing_since=""
    fi
}

save_state() {
    python3 -c "
import json
d = {'status': '$1', 'consecutive_failures': $consecutive_failures, 'last_alert_check': $(date +%s), 'failing_since': '$failing_since'}
json.dump(d, open('$STATE_FILE', 'w'))
" 2>/dev/null
}

# --- Health checks ---
check_hermes_gateway() {
    systemctl --user is-active hermes-gateway >/dev/null 2>&1 && echo "OK" || echo "FAIL"
}

check_hindsight_postgres() {
    systemctl --user is-active hindsight-postgres >/dev/null 2>&1 && echo "OK" || echo "FAIL"
}

check_hindsight_api() {
    local result=$(curl -s --max-time 5 http://localhost:8888/health 2>/dev/null)
    echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if d.get('status')=='healthy' else 'FAIL')" 2>/dev/null || echo "FAIL"
}

check_hermes_memory() {
    # Hermes gateway memory in MB — alert if > 1.5GB
    local mem=$(systemctl --user show hermes-gateway --property=MemoryCurrent --value 2>/dev/null | grep -E '^[0-9]+$' || echo "0")
    local mem_mb=$((mem / 1024 / 1024))
    if [ "$mem" != "18446744073709551615" ] && [ "$mem" != "0" ] && [ "$mem_mb" -gt 1500 ]; then
        echo "WARN(${mem_mb}MB)"
    else
        echo "OK"
    fi
}

# --- Telegram alert ---
send_alert() {
    local msg="$1"
    log "ALERT SENT: $msg"
    curl -s --max-time 10 \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=$msg" \
        -d "parse_mode=HTML" \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" >/dev/null 2>&1
}

# --- Main ---
load_state

GW_STATUS=$(check_hermes_gateway)
PG_STATUS=$(check_hindsight_postgres)
API_STATUS=$(check_hindsight_api)
MEM_STATUS=$(check_hermes_memory)

# Count failures
fail_count=0
[ "$GW_STATUS" != "OK" ] && fail_count=$((fail_count+1)) && gw_fail="gateway" || gw_fail=""
[ "$PG_STATUS" != "OK" ] && fail_count=$((fail_count+1)) && pg_fail="postgres" || pg_fail=""
[ "$API_STATUS" != "OK" ] && fail_count=$((fail_count+1)) && api_fail="hindsight-api" || api_fail=""
[ "$MEM_STATUS" != "OK" ] && fail_count=$((fail_count+1)) && mem_fail="memory(${MEM_STATUS})" || mem_fail=""

NOW=$(date +%s)
consecutive_failures=${consecutive_failures:-0}
last_alert_check=${last_alert_check:-0}

if [ "$fail_count" -eq 0 ]; then
    if [ "$consecutive_failures" -gt 0 ]; then
        # Recovery
        RECOVERED_MSG="🔄 <b>Hermes Recovered</b>%0AAll services back to normal.%0AWas failing since: ${failing_since:-unknown}"
        send_alert "$RECOVERED_MSG"
        log "RECOVERED at $(date)"
    fi
    consecutive_failures=0
    failing_since=""
    save_state "OK"
    log "OK — gateway=$GW_STATUS pg=$PG_STATUS api=$API_STATUS mem=$MEM_STATUS"
else
    consecutive_failures=$((consecutive_failures + 1))
    [ -z "$failing_since" ] && failing_since=$(date -Iseconds)

    # Should we alert?
    should_alert=false
    if [ "$consecutive_failures" -eq 1 ]; then
        should_alert=true
        reason="initial failure"
    elif [ $((NOW - last_alert_check)) -ge $((HOURLY_REMINDER * 300)) ]; then
        should_alert=true
        reason="still failing after ${consecutive_failures} checks"
    fi

    if [ "$should_alert" = true ]; then
        failing_components="$gw_fail $pg_fail $api_fail $mem_fail"
        failing_components=$(echo "$failing_components" | tr -s ' ')
        ALERT_MSG="🚨 <b>Hermes Service Alert</b>%0AFailing: $failing_components%0AChecks consecutive: $consecutive_failures%0ASince: $failing_since"
        send_alert "$ALERT_MSG"
        last_alert_check=$NOW
    fi

    save_state "FAILING"
    log "FAILING ($consecutive_failures) — gateway=$GW_STATUS pg=$PG_STATUS api=$API_STATUS mem=$MEM_STATUS"
fi
