---
name: team-messaging
description: |
  Access team contact information and send messages to URecruit Global team members.

  Use when:
  - User asks to message, notify, or contact Colin, Paul, or any URecruit team member
  - User says "Tell Colin..." or "Message Paul..."
  - Need to send urgent alert to team member

  Don't use when:
  - Sending to external candidates (use ghost-drafter for email)
  - Broadcasting to multiple people (use message broadcast)
  - Scheduling future messages (use cron)
  - User is testing or role-playing (confirm intent first)

  Outputs: Message sent confirmation with delivery status
---

# Team Messaging Skill

Auto-loads URecruit Global team contacts from memory and enables reliable messaging.

## Team Contacts

Read `references/team-contacts.md` at skill trigger to get current contact info.

### Quick Reference

| Name | Role | Telegram Chat ID | Username |
|------|------|------------------|----------|
| Colin | Managing Director (Europe) | 7081708673 | @csmalls5 |
| Paul | Senior Director | (load from contacts file) | @username |
| Harry | Super Admin | (current session) | @NO_tec_H |

## Messaging Syntax

```json
{
  "action": "send",
  "target": "<chat_id>",
  "message": "Your message here"
}
```

**CRITICAL:** Always use numeric `target` (chat ID), NOT @username. Usernames only work for receiving.

## Workflow

1. User says "Tell Colin..." or "Message Paul..."
2. Load `references/team-contacts.md` 
3. Extract the numeric chat ID for the target
4. Send message using `message action=send target=<chat_id>`
5. Confirm delivery to user

## Contact Management

When new contacts are added:
1. Update `references/team-contacts.md`
2. Also update `memory/bank/urecruit/<name>/telegram-contact.md` for redundancy
3. Use numeric chat IDs only

## Troubleshooting

**"Unknown target" error:**
- You're using @username instead of numeric ID
- Solution: Use `target=7081708673` not `target=@csmalls5`

**Contact not found:**
- Check if `references/team-contacts.md` exists
- If missing, check `memory/bank/urecruit/<name>/telegram-contact.md`
- Extract chat ID and update references file
