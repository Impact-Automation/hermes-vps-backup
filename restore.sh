#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOME_DIR="${HOME:-/home/moltbot}"
HERMES_HOME="$HOME_DIR/.hermes"
HERMES_SRC="$HERMES_HOME/hermes-agent"
HERMES_VENV="$HERMES_SRC/venv"
HINDSIGHT_VENV="$HOME_DIR/.hindsight-api-venv"
SYSTEMD_USER_DIR="$HOME_DIR/.config/systemd/user"
PINNED_HERMES_COMMIT="6fb69229caba4bd5699228e520de4956b3458187"
PINNED_HINDSIGHT_API_VERSION="0.4.19"
PINNED_HINDSIGHT_CLIENT_VERSION="$(cat "$REPO_ROOT/ops/hindsight-client.version" 2>/dev/null || echo "0.5.3")"

log() {
  printf '[restore] %s\n' "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

safe_copy() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp -f "$src" "$dst"
}

restart_unit_safe() {
  local unit="$1"
  log "Reloading systemd and starting $unit"
  systemctl --user daemon-reload
  systemctl --user reset-failed "$unit" || true
  systemctl --user enable "$unit" >/dev/null 2>&1 || true
  systemctl --user restart "$unit" || {
    log "restart failed for $unit, retrying with stop/start"
    systemctl --user reset-failed "$unit" || true
    systemctl --user stop "$unit" || true
    sleep 2
    systemctl --user start "$unit"
  }
}

log "Checking prerequisites"
for cmd in git python3 node npm systemctl; do need_cmd "$cmd"; done

mkdir -p "$HERMES_HOME" "$SYSTEMD_USER_DIR" "$HOME_DIR/scripts" "$HOME_DIR/logs"

if [ ! -d "$HERMES_SRC/.git" ]; then
  log "Cloning Hermes source"
  git clone https://github.com/NousResearch/hermes-agent.git "$HERMES_SRC"
else
  log "Hermes source already exists — fetching latest refs"
  git -C "$HERMES_SRC" fetch origin
fi

log "Checking out pinned Hermes commit $PINNED_HERMES_COMMIT"
git -C "$HERMES_SRC" checkout "$PINNED_HERMES_COMMIT"

log "Creating/updating Hermes venv"
python3 -m venv "$HERMES_VENV"
"$HERMES_VENV/bin/python" -m pip install --upgrade pip setuptools wheel
"$HERMES_VENV/bin/python" -m pip install -e "$HERMES_SRC"

log "Installing pinned hindsight-client into Hermes venv (handles known client gap)"
"$HERMES_VENV/bin/python" -m pip install "hindsight-client==$PINNED_HINDSIGHT_CLIENT_VERSION"

if [ -f "$HERMES_SRC/package-lock.json" ]; then
  log "Installing Hermes Node dependencies"
  (cd "$HERMES_SRC" && npm ci)
fi

log "Restoring Hermes state files"
safe_copy "$REPO_ROOT/home/.hermes/config/config.yaml" "$HERMES_HOME/config.yaml"
safe_copy "$REPO_ROOT/home/.hermes/hindsight/config.json" "$HERMES_HOME/hindsight/config.json"
safe_copy "$REPO_ROOT/home/.hermes/memories/MEMORY.md" "$HERMES_HOME/memories/MEMORY.md"
safe_copy "$REPO_ROOT/home/.hermes/memories/USER.md" "$HERMES_HOME/memories/USER.md"

mkdir -p "$HERMES_HOME/plugins" "$HERMES_HOME/skills/openclaw-imports" "$HERMES_HOME/skills/software-development"
rsync -a --delete "$REPO_ROOT/home/.hermes/plugins/" "$HERMES_HOME/plugins/"
rsync -a --delete "$REPO_ROOT/home/.hermes/skills/openclaw-imports/" "$HERMES_HOME/skills/openclaw-imports/"
rsync -a --delete "$REPO_ROOT/home/.hermes/skills/software-development/" "$HERMES_HOME/skills/software-development/"

log "Restoring systemd user units and helper scripts"
safe_copy "$REPO_ROOT/home/.config/systemd/user/hermes-gateway.service" "$SYSTEMD_USER_DIR/hermes-gateway.service"
safe_copy "$REPO_ROOT/home/.config/systemd/user/hindsight-api.service" "$SYSTEMD_USER_DIR/hindsight-api.service"
safe_copy "$REPO_ROOT/home/.config/systemd/user/hindsight-postgres.service" "$SYSTEMD_USER_DIR/hindsight-postgres.service"
safe_copy "$REPO_ROOT/home/scripts/hindsight-health.sh" "$HOME_DIR/scripts/hindsight-health.sh"
chmod +x "$HOME_DIR/scripts/hindsight-health.sh"

log "Creating/updating Hindsight API venv"
python3 -m venv "$HINDSIGHT_VENV"
"$HINDSIGHT_VENV/bin/python" -m pip install --upgrade pip setuptools wheel
"$HINDSIGHT_VENV/bin/python" -m pip install "hindsight-api==$PINNED_HINDSIGHT_API_VERSION"

systemctl --user daemon-reload

if [ ! -f "$HOME_DIR/.hindsight-api.env" ]; then
  log "Missing $HOME_DIR/.hindsight-api.env — create it from secure secrets before relying on hindsight-api.service"
fi
if [ ! -f "$HERMES_HOME/.env" ]; then
  log "Missing $HERMES_HOME/.env — create it from secure secrets before relying on Hermes external providers"
fi
if [ ! -f "$HERMES_HOME/auth.json" ]; then
  log "Missing $HERMES_HOME/auth.json — provider/API auth must be re-established manually"
fi

restart_unit_safe hindsight-postgres.service
if [ -f "$HOME_DIR/.hindsight-api.env" ]; then
  restart_unit_safe hindsight-api.service
else
  log "Skipping hindsight-api.service start until .hindsight-api.env exists"
fi
restart_unit_safe hermes-gateway.service

if command -v codex >/dev/null 2>&1; then
  log "Codex CLI already installed. Re-auth required: run 'codex login' manually in an interactive shell."
else
  log "Installing OpenAI Codex CLI"
  npm install -g @openai/codex || log "Codex CLI install failed — install manually with: npm install -g @openai/codex"
  log "After install, run 'codex login' manually to re-authenticate OpenAI Codex."
fi

cat <<'EOF'

Restore complete.

Manual follow-up checklist:
  1. Recreate ~/.hermes/.env from secure secret storage.
  2. Recreate ~/.hindsight-api.env from secure secret storage.
  3. Recreate ~/.hermes/auth.json if you use provider auth stored there.
  4. Run: codex login
  5. Verify services:
       systemctl --user status hermes-gateway hindsight-postgres hindsight-api --no-pager
  6. Verify Hermes memory connectivity by sending a test prompt in Hermes.

EOF
