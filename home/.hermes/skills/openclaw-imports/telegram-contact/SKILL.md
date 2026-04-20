---
name: telegram-contact
description: |
  Comprehensive Telegram contact management, messaging, and automation.

  Use when:
  - Looking up Telegram contact information for team members
  - Managing contact lists and verifying contact details
  - Automating Telegram workflows and scheduled messages
  - Need contact metadata (chat IDs, usernames) for messaging

  Don't use when:
  - Actually sending messages (use team-messaging skill or message tool)
  - Real-time conversation (use direct Telegram)
  - External candidate communication (use email/ghost-drafter)

  Outputs: Contact information, chat IDs, verified contact status
---

# Telegram Contact Management Skill

Complete Telegram contact management system for URecruit Global team and external contacts.

## Core Features

1. **Contact Management** - Store, retrieve, and update Telegram contact information
2. **Message Sending** - Send messages to individuals and groups
3. **Contact Verification** - Verify contact details and availability
4. **Team Coordination** - Manage team contact lists and permissions
5. **Automation** - Schedule messages and automate workflows

## Quick Start

### 1. Contact Lookup

When you need to message someone, first check these sources:

```bash
# Check team contacts
read skills/team-messaging/references/team-contacts.md

# Check memory bank
read memory/bank/urecruit/<name>/telegram-contact.md

# Check workspace contacts
read contacts/telegram-contacts.md
```

### 2. Message Sending

**Basic message syntax:**
```json
{
  "action": "send",
  "target": "<numeric_chat_id>",
  "message": "Your message here"
}
```

**With reply:**
```json
{
  "action": "send",
  "target": "7081708673",
  "message": "Reply text",
  "replyTo": "<message_id>"
}
```

**CRITICAL:** Always use numeric chat IDs, NOT @usernames. Usernames only work for receiving.

### 3. Contact Verification

Before sending important messages:
1. Check if contact is active (last seen)
2. Verify correct chat ID
3. Confirm message format preferences

## Contact Storage Locations

### Primary Sources

1. **Team Contacts** (`skills/team-messaging/references/team-contacts.md`)
   - URecruit team members (Colin, Paul, Harry)
   - Regularly updated
   - Includes roles and permissions

2. **Memory Bank** (`memory/bank/urecruit/<name>/telegram-contact.md`)
   - Individual contact files
   - Historical context and preferences
   - Guardrails and communication rules

3. **Workspace Contacts** (`contacts/telegram-contacts.md`)
   - External contacts
   - Project-specific contacts
   - Temporary contacts

### Contact File Format

```markdown
# Contact: [Name]

## Basic Info
- **Telegram Chat ID:** 1234567890
- **Telegram Username:** @username
- **Phone:** +44 79 4770 8341
- **Role:** [Role]
- **Status:** Active/Inactive/Pending

## Communication Preferences
- Preferred time: 09:00-17:00 UTC
- Format: Direct/Formal
- Topics: [Allowed topics]

## History
- Last contacted: 2026-02-05
- Last message: "Message preview"
- Notes: [Any notes]
```

## Workflows

### A. Adding a New Contact

1. **Gather Information:**
   - Get numeric chat ID (essential)
   - Get username (optional, for receiving)
   - Get phone number (optional)
   - Get role/context

2. **Create Contact File:**
   ```bash
   # Create memory bank file
   write memory/bank/urecruit/<name>/telegram-contact.md "<content>"
   
   # Update team contacts if URecruit member
   edit skills/team-messaging/references/team-contacts.md
   ```

3. **Verify Contact:**
   - Send test message
   - Confirm receipt
   - Update status to Active

### B. Sending a Message

1. **Identify Recipient:**
   - Look up contact in available sources
   - Verify chat ID is numeric

2. **Prepare Message:**
   - Format according to recipient preferences
   - Include necessary context
   - Check for sensitive information

3. **Send Message:**
   ```bash
   message action=send target=7081708673 message="Your message"
   ```

4. **Confirm Delivery:**
   - Log message in memory
   - Update last contacted date
   - Note any issues

### C. Managing Contact Lists

1. **Regular Updates:**
   - Review contact status monthly
   - Remove inactive contacts
   - Update role changes

2. **Backup Contacts:**
   - Export to JSON format
   - Store in secure location
   - Version control important changes

## URecruit Team Specific

### Colin Smalls
- **Chat ID:** 7081708673
- **Role:** Managing Director (Europe)
- **Guardrails:** Always professional, honor email expertise
- **Communication:** Follow his lead on tone and assessment

### Paul
- **Chat ID:** TBD (check contacts file)
- **Role:** Senior Director  
- **Communication:** Always professional and respectful
- **Preferences:** Frame positively, not as deficiencies

### Harry
- **Chat ID:** 6884933598 (current session)
- **Role:** Super Admin
- **Communication:** Deep and loose - casual, direct, no filters

## Automation Features

### Scheduled Messages
Use cron jobs for scheduled messages:

```bash
cron action=add job='{
  "name": "Morning update to Colin",
  "schedule": {"kind": "cron", "expr": "0 9 * * 1-5", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Send daily update to Colin: Project status..."
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

### Message Templates
Store common message templates in `templates/`:

- Project updates
- Meeting reminders
- Status reports
- Follow-ups

### Contact Groups
Create group contact files for team coordination:

```markdown
# Group: URecruit Leadership

## Members
- Colin: 7081708673
- Paul: [chat_id]
- Harry: 6884933598

## Purpose
- Daily standups
- Critical alerts
- Decision coordination

## Settings
- Broadcast mode: Sequential
- Timezone: UTC
- Quiet hours: 22:00-08:00
```

## Troubleshooting

### Common Issues

1. **"Unknown target" error:**
   - You're using @username instead of numeric ID
   - Solution: Always use `target=7081708673` format

2. **Message not delivered:**
   - Check if contact is active
   - Verify chat ID is correct
   - Check Telegram connection status

3. **Contact not found:**
   - Search all contact sources
   - Check for typos in name
   - Create new contact if needed

4. **Permission denied:**
   - Verify you have permission to message
   - Check communication boundaries
   - Consult Harry for sensitive contacts

### Debug Steps

1. Check Telegram connection:
   ```bash
   message action=send target=6884933598 message="Test connection"
   ```

2. Verify contact exists:
   ```bash
   read skills/team-messaging/references/team-contacts.md
   ```

3. Check message format:
   - No special characters in target field
   - Message text properly escaped
   - Correct action parameter

## Best Practices

### Security
- Never share chat IDs publicly
- Store contacts in secure locations
- Regular backup of contact lists
- Permission checks before messaging

### Communication
- Respect time zones
- Follow recipient preferences
- Keep messages concise
- Include necessary context

### Maintenance
- Monthly contact review
- Update status changes
- Archive old contacts
- Document communication patterns

## Integration with Other Skills

### Team Messaging Skill
This skill extends the team-messaging skill with:
- More detailed contact management
- External contact support
- Automation features
- Advanced workflows

### Browser Automation
For web-based Telegram:
- Use browser automation skill
- Access web.telegram.org
- Automated contact management

### Cron Management
For scheduled messages:
- Use cron tool
- Set up recurring messages
- Manage delivery schedules

## References

### Essential Files
- `skills/team-messaging/references/team-contacts.md` - Team contacts
- `memory/bank/urecruit/` - Individual contact files
- `contacts/telegram-contacts.md` - External contacts

### Documentation
- `memory/bank/urecruit/colin/colin-guardrails.md` - Colin's rules
- `memory/bank/urecruit/colin/active-roles.md` - Colin's roles
- `MEMORY.md` - Long-term memory and rules

### Tools
- `message` tool - Send messages
- `cron` tool - Schedule messages
- `read`/`write`/`edit` - Manage contact files
