---
name: rate-card-manager
description: >
  Captures rate and fee data from Colin's conversations, maintains structured
  records in knowledge/rate-cards.md, and enforces strict confidentiality —
  rates are never disclosed to candidates or external parties.
version: 1.0.0
---

# Rate Card Manager

## Purpose

Colin negotiates day rates, margins, and fee structures across multiple
clients and trades. This skill captures rate intelligence as it surfaces in
conversation so Colin has an always-current reference without maintaining
spreadsheets — while ensuring rates are never leaked to candidates.

## Trigger Patterns

Activate this skill when Colin's message contains any of the following:

| Pattern | Example |
|---------|---------|
| Day rate or hourly rate mentioned | "450 a day for QS roles" |
| Margin or markup discussed | "we're making 60 a day on that" |
| Client fee structure | "Sisk pay 550 for senior PMs" |
| Rate change or negotiation | "Mercury bumped the rate to 500" |
| Candidate rate expectation | "he wants 420 a day minimum" |
| Charge rate vs pay rate | "charging 500, paying 430" |
| Rate comparison | "Dublin rates are higher than Cork" |

## Extraction Rules

1. **Extract immediately.** When rate data appears in conversation, capture
   it without asking Colin to repeat information already given.

2. **Required fields:** Client/company and rate amount are mandatory. If
   either is missing and cannot be inferred from context, ask Colin once.

3. **Optional fields:** Trade/discipline, seniority level, location,
   pay rate vs charge rate, margin, contract type (day rate / fixed price),
   currency, effective date, notes.

4. **Match before creating.** Before adding a new entry, check
   `knowledge/rate-cards.md` for existing entries with the same client
   and trade/seniority. Update in place rather than duplicating.

5. **Cross-reference roles.** When a rate is linked to a specific active
   role, note the connection in both `knowledge/rate-cards.md` and
   `knowledge/active-roles.md` (via the knowledge-extractor skill).

6. **Date-stamp all updates.** Use YYYY-MM-DD format for effective-from
   and last-updated fields.

7. **Distinguish rate types.** Always clarify whether a figure is a pay
   rate (what the contractor receives) or a charge rate (what the client
   pays). If Colin only mentions one, record it and label clearly.

## Entry Format

Follow this structure when adding to `knowledge/rate-cards.md`:

```
## [Client] — [Trade/Discipline]
- **Seniority:** [junior / mid / senior / principal, if known]
- **Location:** [if known]
- **Charge rate:** [amount per day/hour]
- **Pay rate:** [amount per day/hour, if known]
- **Margin:** [amount or %, if known]
- **Contract type:** [day rate / fixed price / permanent fee %]
- **Currency:** [EUR / GBP / USD, default EUR]
- **Linked roles:** [role references if any]
- **Notes:** [negotiation context, benchmarks, special terms]
- **Effective from:** [YYYY-MM-DD]
- **Last updated:** [YYYY-MM-DD]
```

## Actions After Extraction

- **New rate captured:** Confirm briefly: "Noted — Sisk QS rates at €450/day."
- **Existing rate updated:** Confirm if the rate changed: "Updated Sisk QS
  from €400 to €450/day." Silent update for minor note additions.
- **Margin calculated:** If Colin provides both charge and pay rates,
  calculate and store the margin automatically.
- **Rate negotiation in progress:** Track both the current and proposed
  rates with notes on the negotiation status.

## Recall Behaviour

When Colin discusses a role, client, or candidate placement, proactively
surface relevant rate data:

- "Sisk QS rates are currently €450/day — last updated 2026-03-10."
- "Mercury senior PM charge rate is €550, your margin is €60/day."

Only surface rates when directly relevant to the current conversation.
Do not dump the full rate card unprompted.

## Key Rules

- **NEVER expose rates to candidates.** If a candidate is present in a
  group chat or Colin is composing a message to a candidate, do not
  include any rate, margin, or fee information. This is the most critical
  rule for this skill.
- **NEVER share charge rates or margins externally.** These are strictly
  internal to Colin's business.
- Rate intelligence goes to `knowledge/rate-cards.md` only — not MEMORY.md
- If Colin corrects a rate ("actually Sisk are paying 475 now"), update
  immediately and confirm the correction
- When rates differ by location for the same client and trade, create
  separate entries per location
- Default currency is EUR unless Colin specifies otherwise
- Do not infer rates from similar roles — only record what Colin states
