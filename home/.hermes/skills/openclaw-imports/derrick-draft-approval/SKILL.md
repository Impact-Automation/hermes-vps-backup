---
name: derrick-draft-approval
description: >
  Polls for pending Ghost Mode draft validations and sends them to Harry
  via Telegram with [Approve] [Edit] [Reject] inline buttons. Handles all
  button callbacks including edit sessions and rejection reasons.
  REVIEW-ONLY MODE: No emails are sent. Feedback is recorded for pipeline learning.
version: 2.0.0
env:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - TELEGRAM_BOT_TOKEN
  - HARRY_CHAT_ID
---

# Draft Approval Skill (Review-Only Mode)

## Overview

This skill handles the Telegram draft review flow for Ghost Mode.
When the ghost-drafter creates a `derrick_draft_validations` row with
`draft_status = 'pending_approval'`, the poller picks it up and sends
a formatted card to Harry with inline buttons.

**IMPORTANT: No emails are sent.** This is purely for reviewing AI drafts
and recording feedback so the pipeline can learn. Colin still handles his
own replies manually.

## Scripts

### draft-poller.js
Polls for pending drafts and sends Telegram cards. Run via cron (every 5 min).

```bash
node skills/derrick-draft-approval/draft-poller.js
node skills/derrick-draft-approval/draft-poller.js --dry-run  # Test mode
```

### callback-handler.js
Handles button press callbacks. Called when you receive a callback_query
with `draft_` prefix.

```bash
# Normal callback
node skills/derrick-draft-approval/callback-handler.js <callbackQueryId> <callbackData> <chatId> <messageId> <userId>

# Edit submission (text via stdin)
echo "edited text here" | node skills/derrick-draft-approval/callback-handler.js --edit-submit <chatId> <userId>
```

## Callback Routing

When you receive a Telegram callback_query with data starting with `draft_`,
route it to callback-handler.js:

| Callback Data | Action |
|---------------|--------|
| `draft_approve:<uuid>` | Record draft as approved. **No email sent.** |
| `draft_edit:<uuid>` | Enter edit mode (30 min timeout) |
| `draft_reject:<uuid>` | Show rejection reason picker |
| `draft_reason:<uuid>:<reason>` | Complete rejection |

## Edit Flow

**There is NO send/confirm step.** The flow is:

1. Harry taps [Edit]
2. You show the current draft and prompt for corrected version
3. Harry sends corrected text
4. Pipe text to callback-handler.js `--edit-submit` — it records the edit and auto-appends "KR" sign-off
5. **Done.** Show "Edit recorded for learning" and move on. No confirmation needed.

Do NOT ask "Ready? Say send" or "Send this?" — there is nothing to send.
The edit is the final action. The pipeline learns from Harry's corrections.

## Edit Sessions

When Harry presses [Edit], an edit session is created at
`~/.openclaw/workspace/state/draft-edit-sessions.json`.

When Harry sends a plain text message (not a command, not a callback),
check if an active edit session exists for their chat. If so, pipe the
text to callback-handler.js:

```bash
echo "Harry's replacement text" | node skills/derrick-draft-approval/callback-handler.js --edit-submit <chatId> <userId>
```

Sessions expire after 30 minutes.

## Approve Flow

1. Harry taps [Approve]
2. callback-handler.js records `draft_status: "approved"` in DB
3. **Done.** Show "Approved — recorded for learning." No email is sent.

## Reject Flow

1. Harry taps [Reject]
2. Show rejection reason picker (Wrong tone / Wrong info / Not needed / Other)
3. Harry picks reason
4. callback-handler.js records rejection + reason in DB
5. **Done.** Show "Rejected — feedback recorded."

## Key Rules

- **No emails are ever sent** — review only
- **No "send" confirmation step** — approve/edit/reject are final actions
- **KR sign-off is automatic** — Harry only writes the body when editing
- **One draft at a time** — next draft appears after Harry acts on current one
- **All categories** (A through E) flow to Harry — pipeline needs feedback on everything
