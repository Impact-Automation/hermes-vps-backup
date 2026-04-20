#!/usr/bin/env bash
# Daily push to hermes-vps-backup GitHub repo
# Normal incremental push — sync-live-state.sh commits locally, then this pushes.
# Orphan-branch strategy retired after GitHub secret allowlist.

set -euo pipefail

REPO="$HOME/hermes-vps-backup"
LOG="$HOME/logs/backup-push.log"

{
    echo "---"
    echo "$(date -Iseconds) backup-push: starting"

    cd "$REPO"

    # Stage any changes from sync-live-state.sh or manual edits
    git add -A

    # Commit if there are changes; bail silently if nothing staged
    if git diff --cached --quiet; then
        echo "$(date -Iseconds) backup-push: nothing staged, skipping commit"
    else
        git commit -m "backup: $(date +%F)"
        echo "$(date -Iseconds) backup-push: committed"
    fi

    # Push if there are unpushed commits
    if git log --branches --not --remotes --oneline | grep -q .; then
        git push origin main
        echo "$(date -Iseconds) backup-push: pushed"
    else
        echo "$(date -Iseconds) backup-push: up to date, nothing to push"
    fi
} >> "$LOG" 2>&1
