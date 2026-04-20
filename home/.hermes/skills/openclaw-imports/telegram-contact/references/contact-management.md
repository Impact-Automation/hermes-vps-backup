# Telegram Contact Management Guide

## Contact Hierarchy

### Level 1: Core Team (URecruit)
- **Location:** `skills/team-messaging/references/team-contacts.md`
- **Purpose:** Primary team members
- **Update Frequency:** Real-time
- **Access:** Always available

### Level 2: Memory Bank Contacts
- **Location:** `memory/bank/urecruit/<name>/telegram-contact.md`
- **Purpose:** Detailed individual profiles
- **Update Frequency:** As needed
- **Access:** Context-specific

### Level 3: Workspace Contacts
- **Location:** `contacts/telegram-contacts.md`
- **Purpose:** External and project contacts
- **Update Frequency:** Weekly
- **Access:** General use

### Level 4: Temporary Contacts
- **Location:** `tmp/telegram-contacts.json`
- **Purpose:** One-time or temporary contacts
- **Update Frequency:** Daily
- **Access:** Session-specific

## Contact Fields

### Required Fields
1. **chat_id** (string) - Numeric Telegram chat ID
2. **name** (string) - Contact name
3. **status** (enum) - Active/Inactive/Pending

### Recommended Fields
4. **username** (string) - Telegram username (with @)
5. **role** (string) - Professional role
6. **phone** (string) - Phone number with country code
7. **timezone** (string) - Preferred timezone
8. **preferences** (object) - Communication preferences
9. **last_contacted** (date) - Last contact date
10. **notes** (string) - Additional notes

### Optional Fields
11. **groups** (array) - Contact groups
12. **permissions** (object) - Message permissions
13. **guardrails** (array) - Communication rules
14. **history** (array) - Message history summary

## Contact File Formats

### Markdown Format (Preferred)
```markdown
# Contact: John Doe

## Basic Information
- **Chat ID:** 1234567890
- **Username:** @johndoe
- **Phone:** +44 79 4770 8341
- **Role:** Project Manager
- **Status:** Active
- **Timezone:** UTC

## Communication Preferences
- **Preferred Hours:** 09:00-17:00 UTC
- **Format:** Direct and concise
- **Topics:** Project updates, technical issues
- **Avoid:** Personal topics, jokes

## History
- **Added:** 2026-02-01
- **Last Contacted:** 2026-02-05
- **Last Message:** "Meeting scheduled for tomorrow"
- **Total Messages:** 15

## Notes
- Prefers text over voice messages
- Responds quickly during work hours
- Technical background
```

### JSON Format (For Automation)
```json
{
  "chat_id": "1234567890",
  "name": "John Doe",
  "username": "@johndoe",
  "phone": "+44 79 4770 8341",
  "role": "Project Manager",
  "status": "active",
  "timezone": "UTC",
  "preferences": {
    "hours": "09:00-17:00",
    "format": "direct",
    "topics": ["project_updates", "technical_issues"],
    "avoid": ["personal", "jokes"]
  },
  "history": {
    "added": "2026-02-01",
    "last_contacted": "2026-02-05",
    "total_messages": 15
  },
  "notes": "Prefers text over voice messages"
}
```

## Contact Operations

### 1. Adding a New Contact

**Step 1: Gather Information**
```bash
# Required: chat_id, name
# Recommended: username, role, phone
# Optional: timezone, preferences
```

**Step 2: Create Contact File**
```bash
# For URecruit team
edit skills/team-messaging/references/team-contacts.md

# For individual profile
write memory/bank/urecruit/john/telegram-contact.md

# For workspace contact
edit contacts/telegram-contacts.md
```

**Step 3: Verify Contact**
```bash
# Send test message
message action=send target=1234567890 message="Test: Contact verification"

# Update status
edit memory/bank/urecruit/john/telegram-contact.md
# Change status: Pending → Active
```

### 2. Updating Contact Information

**Step 1: Locate Contact**
```bash
# Search all sources
grep -r "1234567890" skills/team-messaging/ memory/bank/ contacts/
```

**Step 2: Update Information**
```bash
# Edit the file
edit <file_path> "<old_text>" "<new_text>"
```

**Step 3: Verify Changes**
```bash
# Check updated file
read <file_path>
```

### 3. Removing a Contact

**Step 1: Change Status**
```bash
edit <file_path> "Status: Active" "Status: Inactive"
```

**Step 2: Archive (Optional)**
```bash
# Move to archive
mv <file_path> archive/telegram-contacts/
```

**Step 3: Update References**
```bash
# Remove from active lists
edit skills/team-messaging/references/team-contacts.md
```

## Contact Validation

### Validation Rules
1. **Chat ID:** Must be numeric, 8-12 digits
2. **Username:** Must start with @ if present
3. **Phone:** Must include country code
4. **Status:** Must be Active/Inactive/Pending
5. **Timezone:** Must be valid timezone

### Validation Script
```bash
#!/bin/bash
# validate-contact.sh
# Basic contact validation

chat_id=$1
name=$2

if ! [[ $chat_id =~ ^[0-9]{8,12}$ ]]; then
  echo "ERROR: Invalid chat ID: $chat_id"
  exit 1
fi

if [ -z "$name" ]; then
  echo "ERROR: Name is required"
  exit 1
fi

echo "Contact validation passed: $name ($chat_id)"
```

## Contact Groups

### Group Types

**1. Team Groups**
- URecruit Leadership
- Development Team
- Support Team

**2. Project Groups**
- Project Alpha Team
- Beta Testers
- Stakeholders

**3. Functional Groups**
- Emergency Contacts
- Daily Updates
- Announcements

### Group File Format
```markdown
# Group: URecruit Leadership

## Configuration
- **Type:** Team
- **Purpose:** Daily coordination
- **Timezone:** UTC
- **Quiet Hours:** 22:00-08:00

## Members
| Name | Chat ID | Role | Status |
|------|---------|------|--------|
| Colin | 7081708673 | MD Europe | Active |
| Paul | [ID] | Senior Director | Active |
| Harry | 6884933598 | Super Admin | Active |

## Settings
- **Broadcast Mode:** Sequential
- **Delivery Reports:** Enabled
- **Message History:** 30 days
- **Admin:** Harry (6884933598)

## Rules
1. Business hours only (09:00-17:00 UTC)
2. Professional tone required
3. Critical alerts bypass quiet hours
4. All messages logged
```

## Automation

### Scheduled Contact Updates
```bash
# Weekly contact review
cron action=add job='{
  "name": "Weekly contact review",
  "schedule": {"kind": "cron", "expr": "0 9 * * 1", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Review and update Telegram contacts"
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

### Contact Backup
```bash
# Daily backup
cron action=add job='{
  "name": "Daily contact backup",
  "schedule": {"kind": "cron", "expr": "0 2 * * *", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Backup Telegram contacts to secure location"
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

## Troubleshooting Contact Issues

### Common Problems

**1. Duplicate Contacts**
```bash
# Find duplicates
grep -r "chat_id" skills/ memory/ contacts/ | sort | uniq -d
```

**2. Invalid Chat IDs**
```bash
# Validate chat IDs
grep -r "Chat ID:" skills/ memory/ contacts/ | grep -v "^[0-9]\{8,12\}$"
```

**3. Missing Information**
```bash
# Find incomplete contacts
grep -r "Status:" skills/ memory/ contacts/ | grep -v "Active\|Inactive\|Pending"
```

### Resolution Steps

1. **Identify Issue:** Use grep to find problematic contacts
2. **Locate Files:** Find all files containing the contact
3. **Consolidate:** Merge duplicate entries
4. **Update:** Correct invalid information
5. **Verify:** Test with message send

## Best Practices

### 1. Consistency
- Use same format across all contact files
- Standardize field names
- Regular format reviews

### 2. Security
- Never commit chat IDs to public repos
- Encrypt sensitive contact information
- Regular security audits

### 3. Maintenance
- Monthly contact reviews
- Archive inactive contacts
- Update preferences regularly

### 4. Documentation
- Document contact sources
- Track changes
- Maintain change history

## Integration Points

### With Team Messaging Skill
- Share contact database
- Unified lookup system
- Consistent formatting

### With Memory System
- Store contact history
- Track interactions
- Learn preferences

### With Automation System
- Scheduled messages
- Contact verification
- Status updates

## Tools and Commands

### Contact Search
```bash
# Search by name
grep -r "Colin" skills/ memory/ contacts/

# Search by chat ID
grep -r "7081708673" skills/ memory/ contacts/

# Search by username
grep -r "@csmalls5" skills/ memory/ contacts/
```

### Contact Export
```bash
# Export to JSON
find skills/ memory/ contacts/ -name "*telegram*" -type f -exec cat {} \; | jq -s '.'
```

### Contact Statistics
```bash
# Count active contacts
grep -r "Status: Active" skills/ memory/ contacts/ | wc -l

# Count by role
grep -r "Role:" skills/ memory/ contacts/ | sort | uniq -c
```

## Version Control

### Contact History
```markdown
# Contact Change Log

## 2026-02-05
- Added: John Doe (1234567890)
- Updated: Colin status to Active
- Removed: Old inactive contacts

## 2026-02-01
- Created contact management system
- Imported URecruit team contacts
- Set up backup system
```

### Backup Strategy
1. **Daily:** Incremental backup to secure location
2. **Weekly:** Full export to encrypted storage
3. **Monthly:** Archive and cleanup
