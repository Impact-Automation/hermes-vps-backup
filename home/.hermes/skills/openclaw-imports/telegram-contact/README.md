# Telegram Contact Management Skill

A comprehensive Telegram contact management system for OpenClaw.

## Features

- **Contact Management**: Store, retrieve, and update Telegram contact information
- **Message Sending**: Send messages to individuals and groups with proper formatting
- **Contact Verification**: Verify contact details and availability
- **Team Coordination**: Manage team contact lists and permissions
- **Automation**: Schedule messages and automate workflows
- **Templates**: Pre-built message templates for common scenarios

## Directory Structure

```
telegram-contact/
├── SKILL.md                    # Main skill documentation
├── README.md                   # This file
├── references/
│   ├── contact-management.md   # Contact management guide
│   └── message-templates.md    # Message templates reference
├── scripts/
│   ├── contact-lookup.sh       # Find contacts
│   ├── add-contact.sh          # Add new contacts
│   └── verify-contact.sh       # Verify contact status
└── templates/
    └── team-communication/
        └── daily-standup.md    # Daily standup template
```

## Quick Start

### 1. Lookup a Contact
```bash
./scripts/contact-lookup.sh Colin
./scripts/contact-lookup.sh 7081708673
./scripts/contact-lookup.sh @csmalls5
```

### 2. Add a New Contact
```bash
./scripts/add-contact.sh "John Doe" 1234567890 @johndoe "Developer" "+44 79 4770 8341"
```

### 3. Verify a Contact
```bash
./scripts/verify-contact.sh 7081708673
./scripts/verify-contact.sh Colin
```

### 4. Send a Message
```bash
# Using the message tool
message action=send target=7081708673 message="Hello from URecruit!"
```

## Integration with Team Messaging Skill

This skill extends the existing `team-messaging` skill with:
- More detailed contact management
- External contact support  
- Automation features
- Advanced workflows
- Template system

## Contact Storage Locations

1. **Team Contacts**: `skills/team-messaging/references/team-contacts.md`
2. **Memory Bank**: `memory/bank/urecruit/<name>/telegram-contact.md`
3. **Workspace Contacts**: `contacts/telegram-contacts.md`

## Message Templates

Pre-built templates for common scenarios:
- Daily standups
- Project updates
- Meeting invitations
- Status reports
- Follow-ups
- Emergency alerts

## Automation

### Scheduled Messages
```bash
# Daily standup reminder
cron action=add job='{
  "name": "Daily standup",
  "schedule": {"kind": "cron", "expr": "0 9 * * 1-5", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Send daily standup to team"
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

### Contact Verification
```bash
# Monthly contact verification
cron action=add job='{
  "name": "Monthly contact check",
  "schedule": {"kind": "cron", "expr": "0 9 1 * *", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Verify all active Telegram contacts"
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

## URecruit Team Integration

### Colin Smalls
- Chat ID: `7081708673`
- Role: Managing Director (Europe)
- Guardrails: Professional communication, honor email expertise

### Paul
- Chat ID: Check contacts file
- Role: Senior Director
- Communication: Always professional and respectful

### Harry
- Chat ID: `6884933598` (current session)
- Role: Super Admin
- Communication: Deep and loose - casual, direct

## Best Practices

### Security
- Never share chat IDs publicly
- Store contacts in secure locations
- Regular backups of contact lists
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

## Troubleshooting

### Common Issues

1. **"Unknown target" error**
   - Cause: Using @username instead of numeric ID
   - Fix: Always use `target=7081708673` format

2. **Message not delivered**
   - Check contact status
   - Verify chat ID
   - Check Telegram connection

3. **Contact not found**
   - Search all contact sources
   - Check for typos
   - Create new contact if needed

### Debug Steps
```bash
# Test connection
message action=send target=6884933598 message="Test connection"

# Verify contact exists
./scripts/contact-lookup.sh 7081708673

# Check message format
echo 'message action=send target=7081708673 message="Test"'
```

## Development

### Adding New Features
1. Update `SKILL.md` with new functionality
2. Add reference documentation in `references/`
3. Create scripts in `scripts/` if needed
4. Add templates in `templates/` if applicable
5. Test thoroughly before use

### Script Requirements
- All scripts must be executable (`chmod +x`)
- Include proper error handling
- Document usage in script headers
- Test with sample data

### Template Guidelines
- Clear purpose and usage instructions
- Variable placeholders marked with `{}`
- Working examples included
- Consistent formatting

## License

This skill is part of the OpenClaw workspace and follows the same licensing terms.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review reference documentation
3. Test with sample data
4. Contact system administrator if needed

## Changelog

### v1.0.0 (2026-02-05)
- Initial release
- Contact management system
- Message templates
- Automation scripts
- URecruit team integration