---
name: pipeline-status-updater
description: >
  Interprets pipeline status changes from the recruiter's messages and pushes
  them to the dashboard via update-knowledge and job-board tool calls.
  Handles batch reports, shorthand updates, and stage transitions.
version: 2.0.0
---

# Pipeline Status Updater

## Purpose

Recruiters communicate pipeline progress in shorthand ("Finland filled",
"got 3 CVs for Dublin", "offered the Milan QS 420/day"). This skill
interprets those status changes and pushes them to the dashboard via
**tool calls** — not direct file edits.

## How It Works

Every pipeline update goes through **update-knowledge** with `type=role`,
`action=pipeline`. The tool automatically:
1. Syncs to the job-board dashboard (creates the role if it doesn't exist)
2. Updates local knowledge files

You do NOT read or write knowledge files directly. You call the tools.

## Trigger Patterns

Activate when the recruiter's message indicates a pipeline change:

| Pattern | Example | Tool call |
|---------|---------|-----------|
| Candidate offered | "offered Liam 160k for Sweden" | update-knowledge: type=role, action=pipeline, candidate=Liam Davies, role=Project Director, location=Sweden, stage=offered, detail=€160k + Pkg |
| Offer accepted | "Liam accepted the Sweden offer" | update-knowledge: type=role, action=pipeline, candidate=Liam Davies, role=Project Director, location=Sweden, stage=accepted |
| CVs received | "got 3 CVs for the Dublin job" | update-knowledge: type=role, action=pipeline, candidate=[each name], role=[title], location=Dublin, stage=cv-submitted |
| Interview scheduled | "interview next week for the Sisk PM" | update-knowledge: type=role, action=pipeline, candidate=[name], stage=interview, detail=scheduled next week |
| Role filled / placed | "Finland role is filled" | update-knowledge: type=role, action=filled, role=[title], location=Finland, candidate=[name] |
| Role cancelled / on hold | "Winthrop put Milan on hold" | job-board: action=update, role_type=[title], location=Milan, updates={status: "on_hold"} |
| Candidate withdrew | "Dublin candidate pulled out" | update-knowledge: type=role, action=pipeline, candidate=[name], stage=withdrew |
| Counter-offer / not starting | "Sanzi counter-offered, not starting" | update-knowledge: type=role, action=pipeline, candidate=[name], stage=withdrew, detail=Counter-offered |

## Pipeline Stages

Use these exact stage values in tool calls:

| Stage | Meaning |
|-------|---------|
| sourced | Identified, not yet contacted |
| cv-submitted | CV received or submitted to client |
| submitted | Formally presented to client |
| interview | Interview scheduled or completed |
| second-round | Second/final round interview |
| offered | Offer made, awaiting response |
| accepted | Offer accepted |
| withdrew | Candidate withdrew or counter-offered |
| rejected | Client rejected candidate |
| removed | Removed from pipeline |
| on-hold | Paused |

## Batch Report Handling

When the recruiter sends a full pipeline report (multiple candidates/roles):

1. **Process EVERY candidate** — don't skip any
2. **Call update-knowledge for EACH candidate separately** — one tool call per candidate
3. **Infer the role from context** — if the report says "Liam Davies — Sweden (Winthrop)", the role is whatever Sweden/Winthrop role exists or needs creating
4. **Include company in the tool call** — pass `client` so auto-create gets the right company
5. **Confirm when done** — list what you updated in a brief summary

### Example batch:

Recruiter sends:
> Alasdair Higgs — Winthrop — Germany
> Offered €150k — awaiting work permit
>
> Ohi Ajakaiye — Winthrop — Finland
> Offered €110k + Package

You call (in parallel):
- update-knowledge: {type: "role", action: "pipeline", role: "TBD", location: "Germany", client: "Winthrop", candidate: "Alasdair Higgs", stage: "offered", detail: "€150k — awaiting work permit", agent: "[your-agent]"}
- update-knowledge: {type: "role", action: "pipeline", role: "TBD", location: "Finland", client: "Winthrop", candidate: "Ohi Ajakaiye", stage: "offered", detail: "€110k + Pkg", agent: "[your-agent]"}

**NOTE on role names:** If the report doesn't specify a job title, use the
candidate's known title or a reasonable inference. If truly unknown, use the
most specific description available (e.g. "Engineer" for an engineering candidate).
The dashboard will auto-create the role if needed.

## Key Rules

- **Always use tool calls** — never read/write knowledge files directly
- **Always pass your agent name** in every tool call
- **Never expose rate/salary information** when confirming updates to the recruiter
- **Process every candidate** in a batch — don't summarize or skip
- **If a role doesn't exist, the tool creates it automatically** — don't worry about missing roles
- **Confirm briefly after updates** — "Updated 6 candidates on the dashboard" not a full recap
