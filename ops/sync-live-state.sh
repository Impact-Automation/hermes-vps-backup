#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOME_DIR="${HOME:-/home/moltbot}"

mkdir -p "$REPO_ROOT/home/.hermes/config" \
         "$REPO_ROOT/home/.hermes/memories" \
         "$REPO_ROOT/home/.hermes/hindsight" \
         "$REPO_ROOT/home/.hermes/plugins" \
         "$REPO_ROOT/home/.hermes/skills/openclaw-imports" \
         "$REPO_ROOT/home/.hermes/skills/software-development" \
         "$REPO_ROOT/home/.config/systemd/user" \
         "$REPO_ROOT/home/scripts" \
         "$REPO_ROOT/ops"

cp -f "$HOME_DIR/.hermes/config.yaml" "$REPO_ROOT/home/.hermes/config/config.yaml"
cp -f "$HOME_DIR/.hermes/hindsight/config.json" "$REPO_ROOT/home/.hermes/hindsight/config.json"
cp -f "$HOME_DIR/.hermes/memories/MEMORY.md" "$REPO_ROOT/home/.hermes/memories/MEMORY.md"
cp -f "$HOME_DIR/.hermes/memories/USER.md" "$REPO_ROOT/home/.hermes/memories/USER.md"
cp -f "$HOME_DIR/.config/systemd/user/hermes-gateway.service" "$REPO_ROOT/home/.config/systemd/user/hermes-gateway.service"
cp -f "$HOME_DIR/.config/systemd/user/hindsight-api.service" "$REPO_ROOT/home/.config/systemd/user/hindsight-api.service"
cp -f "$HOME_DIR/.config/systemd/user/hindsight-postgres.service" "$REPO_ROOT/home/.config/systemd/user/hindsight-postgres.service"
cp -f "$HOME_DIR/scripts/hindsight-health.sh" "$REPO_ROOT/home/scripts/hindsight-health.sh"

rsync -a --delete --exclude '__pycache__' --exclude '*.pyc' --exclude '.pytest_cache' \
  "$HOME_DIR/.hermes/plugins/" "$REPO_ROOT/home/.hermes/plugins/"

rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'twitter_cookies.txt' \
  --exclude '*.log' \
  "$HOME_DIR/.hermes/skills/openclaw-imports/" "$REPO_ROOT/home/.hermes/skills/openclaw-imports/"

rm -rf "$REPO_ROOT/home/.hermes/skills/software-development"
mkdir -p "$REPO_ROOT/home/.hermes/skills/software-development"
for skill in migrating-fragile-shell-python-bridges patching-embedded-python-in-shell-scripts; do
  if [ -d "$HOME_DIR/.hermes/skills/software-development/$skill" ]; then
    rsync -a "$HOME_DIR/.hermes/skills/software-development/$skill/" \
      "$REPO_ROOT/home/.hermes/skills/software-development/$skill/"
  fi
done

crontab -l > "$REPO_ROOT/ops/current-user-crontab.reference"

git -C "$HOME_DIR/.hermes/hermes-agent" remote get-url origin > "$REPO_ROOT/ops/hermes-source.origin"
git -C "$HOME_DIR/.hermes/hermes-agent" rev-parse HEAD > "$REPO_ROOT/ops/hermes-source.commit"
git -C "$HOME_DIR/.hermes/hermes-agent" rev-parse --abbrev-ref HEAD > "$REPO_ROOT/ops/hermes-source.branch"

# Refresh .env.template key list from live ~/.hermes/.env (values REDACTED)
if [ -f "$HOME_DIR/.hermes/.env" ]; then
  sed 's/=.*/=/' "$HOME_DIR/.hermes/.env" > "$REPO_ROOT/ops/.env.template"
fi

# Capture pinned hindsight-client version from Hermes venv
if [ -f "$HOME_DIR/.hermes/hermes-agent/venv/lib/python3.11/site-packages/hindsight_client-0.5.3.dist-info/METADATA" ]; then
  grep "^Version:" "$HOME_DIR/.hermes/hermes-agent/venv/lib/python3.11/site-packages/hindsight_client-"*"/METADATA" 2>/dev/null | awk '{print $2}' > "$REPO_ROOT/ops/hindsight-client.version"
else
  echo "0.5.3" > "$REPO_ROOT/ops/hindsight-client.version"
fi

chmod +x "$REPO_ROOT/restore.sh"

git -C "$REPO_ROOT" add .
git -C "$REPO_ROOT" commit -m "backup: refresh Hermes restore state" || true

echo "Backup repo refreshed at $REPO_ROOT"
