---
name: openclaw-pipeline-migration-assessment
description: Methodology for analyzing an OpenClaw-based pipeline and producing a migration decision table (Keep / Migrate / Kill / Need info) when transitioning to Hermes.
trigger: When asked to investigate an OpenClaw pipeline, skill, cron, or subsystem for potential migration to Hermes. Also when evaluating whether existing OpenClaw infrastructure should be retained, rewritten, or removed.
---

# OpenClaw → Hermes Pipeline Migration Assessment

## Goal
Produce a decision table per component with a recommended migration sequence. No code changes during investigation.

## Phase 1: Discover & Read

1. **Locate canonical docs**
   - Search for `*REFERENCE*.md`, `*SYSTEM*.md`, or `*ARCHITECTURE*.md` in the workspace.
   - Read the single source of truth first. Note the file path for citations.

2. **Enumerate active crons**
   - `crontab -l` (user-level)
   - Check for systemd timers: `systemctl --user list-timers`
   - Note cron expression + script/skill path for every entry.

3. **Read all relevant scripts/skills**
   - Read the actual source of each script identified in crontab.
   - Look at state files, config files, and environment variables they depend on.
   - For each, determine: what DB tables/storage does it touch? What external APIs? What Telegram/chat actions?

## Phase 2: Classify Data Flow

For every component, classify into exactly one of:

| Classification | Definition | Typical Examples |
|----------------|-----------|------------------|
| **Pure Supabase** | Runs entirely in Supabase (edge functions, DB triggers, Storage). No OpenClaw involvement. | Edge function crons, DB triggers, Storage buckets |
| **OpenClaw Orchestration** | Uses OpenClaw gateway, agents, skills, or `openclaw agent --local` spawn. | `instruction-processor`, `task-dispatcher`, `proactive-scanner` |
| **Mixed / Bridge** | Reads Supabase data but Telegram/chat delivery goes through OpenClaw gateway. | `draft-poller`, `callback-handler`, `pipeline-watchdog` |

Document this in a clear table.

## Phase 3: Hermes-Native Gap Analysis

For each **OpenClaw Orchestration** or **Mixed** component, determine if Hermes has a native equivalent:

| Hermes Capability | Replaces |
|-------------------|----------|
| `cronjob` tool | All crontab scheduling |
| `send_message` tool | Telegram raw API calls |
| `candidate-query`, `job-board`, `recruiter-stats` | Recruiter-specific DB queries |
| `hindsight_retain` / `memory` | State persistence across sessions |
| `clarify` tool | Interactive multi-step flows (e.g. edit/reject with reason picker) |
| **Hermes itself as agent** | `proactive-scanner`, `task-dispatcher`, `instruction-processor` |

Note any **missing native capability** that would block migration:
- Telegram inline keyboard callbacks (no native webhook receiver)
- Supabase Storage write/upload
- GitHub PR creation
- Gmail auto-send

## Phase 4: Decision Table

For each component, apply this logic:

```
IF Pure Supabase → KEEP (no migration needed)
IF Hermes has native equivalent AND component is simple → MIGRATE
IF Hermes has native equivalent BUT component is complex → MIGRATE (schedule later)
IF component is OpenClaw-specific (monitors OpenClaw, uses openclaw agent spawn) → KILL
IF component's value is unproven (few PRs, no alerts fired) → KILL or NEED INFO
IF missing native capability blocks it → NEED INFO
```

Columns: Component | Verdict | Effort | Why | Dependencies

## Phase 5: Recommended Sequence

Order migrations by **risk × value**:

1. **Wave 1: Kill dead wood** — Remove components that are purely OpenClaw-internal or have zero cross-system value. Lowest risk, immediate cleanup.
2. **Wave 2: Monitoring** — Migrate watchdog/alerting first. Gives Hermes visibility into the system it now owns.
3. **Wave 3: Reporting** — Daily/weekly reports. Builds confidence with low-risk, read-only operations.
4. **Wave 4: Critical path** — Any component whose failure breaks business flow (e.g. draft approval queue). Schedule after solving any blocking missing capabilities.
5. **Wave 5: Learning loops** — Pattern updaters, feedback processors. Non-blocking if stale.
6. **Wave 6: Evaluate unproven** — Code fixers, auto-PR creators. Check ROI before committing effort.

## Phase 6: Open Questions

List every blocking question that needs a user/architecture decision before Wave 4 can begin. Examples:
- How will Hermes receive Telegram inline button callbacks?
- Does Hermes need a Supabase Storage upload wrapper?
- Has component X delivered measurable value (PRs merged, alerts caught)?

## Output Format

Present as:
1. Brief summary of what was investigated
2. Data flow classification table
3. Hermes-native coverage summary
4. Decision table (one row per component)
5. Recommended sequence (numbered waves)
6. Open questions (bullet list)

No code changes during the investigation. The user decides which waves to execute.
