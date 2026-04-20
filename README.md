# Hermes VPS Backup Repo

This repo is the **minimal, restore-critical backup** for Derrick's Hermes environment on the VPS.

It is designed so a fresh VPS can get back to operational state in roughly **30 minutes** with:

```bash
git clone <repo>
cd hermes-vps-backup
./restore.sh
```

## What this repo includes

Only files needed to restore the current Hermes operating behavior without bloating the backup:

- `home/.hermes/config/config.yaml`
- `home/.hermes/hindsight/config.json`
- `home/.hermes/memories/MEMORY.md`
- `home/.hermes/memories/USER.md`
- custom Hermes plugin(s):
  - `home/.hermes/plugins/urecruit-recruiter-tools/`
- imported/custom skill source needed for current behavior:
  - `home/.hermes/skills/openclaw-imports/`
  - `home/.hermes/skills/software-development/migrating-fragile-shell-python-bridges/`
  - `home/.hermes/skills/software-development/patching-embedded-python-in-shell-scripts/`
- systemd user units:
  - `home/.config/systemd/user/hermes-gateway.service`
  - `home/.config/systemd/user/hindsight-api.service`
  - `home/.config/systemd/user/hindsight-postgres.service`
- operational helper script:
  - `home/scripts/hindsight-health.sh`
- restore metadata and current crontab reference:
  - `ops/restore-metadata.txt`
  - `ops/current-user-crontab.reference`

## What this repo intentionally excludes

These are intentionally **not** backed up here:

- `.env` secrets
- `~/.hermes/auth.json`
- session databases / session JSONL / logs
- `~/.hermes/hermes-agent/` source clone
- caches / `node_modules` / `__pycache__`
- generated runtime state

This means the repo is safe to push to GitHub **without shipping secrets or bloated runtime junk**.

## Restore behavior

`restore.sh` handles the important gotchas we already know about:

### 1. Hermes source clone is rebuilt, not stored
It clones Hermes fresh from:
- `https://github.com/NousResearch/hermes-agent.git`

and checks out the pinned commit captured in the repo metadata.

### 2. Hindsight client pip gap is handled
The restore explicitly installs the pinned `hindsight-client` into the Hermes venv.

### 3. Systemd cycle/start-limit bug is handled
The restore uses a defensive sequence:
- `daemon-reload`
- `reset-failed`
- `enable`
- `restart`
- fallback `stop/start` if needed

So if systemd hits a failed state or start-limit issue, the restore path is less brittle.

### 4. OpenAI Codex re-auth is handled as a manual re-auth step
The restore installs Codex CLI if missing, then reminds you to run:

```bash
codex login
```

This is intentionally manual because auth flow is interactive and should not be scripted blindly.

## Required secrets after restore

These must be recreated from secure storage after cloning this repo:

- `~/.hermes/.env`
- `~/.hindsight-api.env`
- `~/.hermes/auth.json` (if still used for provider auth)

Without those, the filesystem restores correctly but external providers/services will not be fully operational.

## Daily refresh workflow

To refresh this backup from the live VPS state:

```bash
cd ~/hermes-vps-backup
bash ops/sync-live-state.sh
```

That script:
- recopies the live restore-critical files
- refreshes plugin + skill source snapshots
- refreshes crontab reference + Hermes source metadata
- commits the changes locally

## GitHub push workflow

Current blocker:
- `gh auth status` shows **no GitHub login configured yet** on this VPS

So the next step is:
1. create/login GitHub auth on VPS
2. create a new repo
3. add remote
4. push this repo
5. optionally add a daily cron around `ops/sync-live-state.sh && git push`

## Notes

- This repo is intentionally **minimal**, not a full disk image.
- Goal is **restore exact behavior**, not preserve every transient artifact.
- Ghost Mode migration decisions are still under investigation, so this backup currently focuses on the Hermes runtime + currently needed custom extensions.
