---
name: hiring-manager-tracker
description: >
  Extracts hiring manager and client contact intelligence from Colin's
  conversations, persists structured records to knowledge/hiring-managers.md,
  and surfaces relevant contacts when Colin discusses roles with matching
  companies or locations.
version: 1.0.0
---

# Hiring Manager Tracker

## Purpose

Colin builds relationships with hiring managers across construction,
engineering, and infrastructure firms. This skill captures contact
intelligence as it appears naturally in conversation so Colin never has to
maintain a separate CRM — Derrick does it for him.

## Trigger Patterns

Activate this skill when Colin's message contains any of the following:

| Pattern | Example |
|---------|---------|
| Named person at a company | "speaking to Dave at Sisk tomorrow" |
| Meeting or call scheduled | "call with Sarah from Mercury on Thursday" |
| Contact role/title mentioned | "Dave is head of procurement at Sisk" |
| Contact preference or note | "Dave prefers WhatsApp, not email" |
| Referral or introduction | "Dave introduced me to Mike at BAM" |
| Feedback from contact | "Sarah said they need someone by April" |

## Extraction Rules

1. **Extract immediately.** When a hiring manager is mentioned, capture all
   available details without asking Colin to repeat information already given.

2. **Required fields:** Name and Company are mandatory. If either is missing
   and cannot be inferred from context, ask Colin once.

3. **Optional fields:** Title/role, phone, email, preferred contact method,
   location, notes, relationship status, last contact date.

4. **Match before creating.** Before adding a new entry, check
   `knowledge/hiring-managers.md` for existing entries with the same name
   and company. Update in place rather than duplicating.

5. **Cross-reference roles.** When a hiring manager is linked to a specific
   role or requirement, note the connection in both `knowledge/hiring-managers.md`
   and `knowledge/active-roles.md` (via the knowledge-extractor skill).

6. **Date-stamp all updates.** Use YYYY-MM-DD format for last-contacted and
   last-updated fields.

## Entry Format

Follow this structure when adding to `knowledge/hiring-managers.md`:

```
## [Name] — [Company]
- **Title:** [if known]
- **Location:** [if known]
- **Contact:** [phone/email/WhatsApp if shared]
- **Preferred method:** [if mentioned]
- **Linked roles:** [role references if any]
- **Relationship:** [warm / cold / new / long-standing]
- **Notes:** [any context — preferences, referrals, personality notes]
- **Last contact:** [YYYY-MM-DD]
- **Last updated:** [YYYY-MM-DD]
```

## Actions After Extraction

- **New contact added:** Confirm briefly: "Noted Dave at Sisk — I'll track him."
- **Existing contact updated:** Confirm only if significant new info was added
  (e.g. title, phone number). Silent update for routine last-contact bumps.
- **Meeting scheduled:** Note the date in the contact's entry. If Colin hasn't
  mentioned what the meeting is about, don't ask — he'll share if relevant.
- **Referral chain:** Record who introduced whom in both contacts' Notes fields.

## Recall Behaviour

When Colin mentions a company or role, proactively surface relevant contacts:

- "You last spoke to Dave at Sisk on 2026-03-15 about Dublin PMs."
- "Sarah at Mercury is your contact for Cork roles — last touch was 2 weeks ago."

Only surface contacts when directly relevant to the current conversation.
Do not dump the full contact list unprompted.

## Key Rules

- NEVER share contact details (phone, email) in group chats or forwarded messages
- Contact intelligence goes to `knowledge/hiring-managers.md` only — not MEMORY.md
- If Colin corrects a detail ("Dave moved to BAM actually"), update immediately
  and confirm the correction
- Do not infer relationships that Colin hasn't stated — "mentioned Dave at Sisk"
  means Colin knows Dave, but don't assume they're close unless Colin says so
