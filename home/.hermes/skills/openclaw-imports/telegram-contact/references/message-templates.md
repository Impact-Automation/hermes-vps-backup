# Telegram Message Templates

## Template Categories

### 1. Team Communication
### 2. Project Updates
### 3. Meeting Coordination
### 4. Status Reports
### 5. Follow-ups
### 6. Emergency/Alerts
### 7. Informal/Check-ins

## Template Format

```markdown
# [Template Name]

## Purpose
[Brief description]

## When to Use
- Situation 1
- Situation 2
- Situation 3

## Template
```
[Message text with variables]
```

## Variables
- `{name}` - Recipient name
- `{project}` - Project name
- `{date}` - Date
- `{time}` - Time
- `{url}` - URL/link
- `{details}` - Additional details

## Example
```
Hi {name}, just checking in on {project}. Let me know if you need anything.
```

## Notes
[Any additional notes]
```

---

# Team Communication Templates

## 1. Daily Standup Update

**Purpose:** Daily team coordination and status sharing

**When to Use:**
- Morning check-ins
- Remote team coordination
- Project status tracking

**Template:**
```
Good morning team! Here's my update for {date}:

✅ Completed:
- {completed_item_1}
- {completed_item_2}

🎯 Today's Focus:
- {focus_item_1}
- {focus_item_2}

🚧 Blockers:
- {blocker_1} (if any)
- {blocker_2} (if any)

Need help with: {help_needed}
```

**Variables:**
- `{date}` - Today's date
- `{completed_item_x}` - Completed tasks
- `{focus_item_x}` - Planned tasks
- `{blocker_x}` - Blockers/issues
- `{help_needed}` - Assistance needed

**Example:**
```
Good morning team! Here's my update for 2026-02-05:

✅ Completed:
- Implemented user authentication
- Fixed login bug

🎯 Today's Focus:
- Database optimization
- API documentation

🚧 Blockers:
- Waiting on design assets

Need help with: Deployment configuration
```

## 2. Project Status Update

**Purpose:** Regular project progress reporting

**When to Use:**
- Weekly project updates
- Stakeholder reporting
- Milestone completion

**Template:**
```
📊 Project: {project_name}
📅 Period: {start_date} to {end_date}
👤 From: {sender_name}

## Progress Summary
- Overall: {progress_percentage}% complete
- Status: {status} ({trend})

## Key Achievements
1. {achievement_1}
2. {achievement_2}
3. {achievement_3}

## Next Steps
1. {next_step_1} (by {deadline_1})
2. {next_step_2} (by {deadline_2})

## Risks/Issues
- {risk_1} - {mitigation_1}
- {risk_2} - {mitigation_2}

## Support Needed
- {support_1}
- {support_2}
```

**Variables:**
- `{project_name}` - Project name
- `{start_date}` - Period start
- `{end_date}` - Period end
- `{progress_percentage}` - Progress percentage
- `{status}` - Project status
- `{trend}` - Progress trend
- `{achievement_x}` - Key achievements
- `{next_step_x}` - Planned actions
- `{deadline_x}` - Action deadlines
- `{risk_x}` - Identified risks
- `{mitigation_x}` - Risk mitigations
- `{support_x}` - Support requests

**Example:**
```
📊 Project: URecruit Platform v2
📅 Period: 2026-01-29 to 2026-02-04
👤 From: Development Team

## Progress Summary
- Overall: 75% complete
- Status: On Track (↑ 15% from last week)

## Key Achievements
1. User dashboard completed
2. API integration tested
3. Performance improvements implemented

## Next Steps
1. Final testing (by 2026-02-07)
2. Deployment preparation (by 2026-02-10)

## Risks/Issues
- Database migration complexity - Additional testing scheduled
- Third-party API rate limits - Caching implemented

## Support Needed
- Final QA review
- Deployment approval
```

## 3. Meeting Invitation

**Purpose:** Schedule and coordinate meetings

**When to Use:**
- Team meetings
- Client meetings
- Project reviews

**Template:**
```
📅 Meeting Invitation: {meeting_topic}

**Date:** {date}
**Time:** {time} ({timezone})
**Duration:** {duration}
**Location:** {location}
**Format:** {format}

## Agenda
1. {agenda_item_1}
2. {agenda_item_2}
3. {agenda_item_3}

## Preparation
- {prep_item_1}
- {prep_item_2}

## Participants
- {participant_1}
- {participant_2}
- {participant_3}

## Links
- Calendar: {calendar_link}
- Documents: {documents_link}
- Join: {meeting_link}

Please confirm your availability.
```

**Variables:**
- `{meeting_topic}` - Meeting subject
- `{date}` - Meeting date
- `{time}` - Meeting time
- `{timezone}` - Timezone
- `{duration}` - Meeting duration
- `{location}` - Physical/virtual location
- `{format}` - Meeting format
- `{agenda_item_x}` - Agenda items
- `{prep_item_x}` - Preparation items
- `{participant_x}` - Participants
- `{calendar_link}` - Calendar invite
- `{documents_link}` - Document links
- `{meeting_link}` - Meeting join link

**Example:**
```
📅 Meeting Invitation: Q1 Planning Review

**Date:** 2026-02-08
**Time:** 14:00 (UTC)
**Duration:** 60 minutes
**Location:** Google Meet
**Format:** Virtual

## Agenda
1. Q1 goals review
2. Resource allocation
3. Timeline adjustments
4. Risk assessment

## Preparation
- Review Q1 objectives document
- Prepare department updates

## Participants
- Colin (MD Europe)
- Paul (Senior Director)
- Harry (Super Admin)
- Development leads

## Links
- Calendar: https://calendar.link/xyz
- Documents: https://docs.urecruit.com/q1
- Join: https://meet.google.com/abc-defg-hij

Please confirm your availability.
```

## 4. Quick Check-in

**Purpose:** Informal status check

**When to Use:**
- Daily touchpoints
- Quick updates
- Remote team connection

**Template:**
```
Hey {name}! 👋

Quick check-in:
- How's {project/task} going?
- Any blockers I can help with?
- Need anything from me?

Reply when you have a moment. No rush!
```

**Variables:**
- `{name}` - Recipient name
- `{project/task}` - Specific project or task

**Example:**
```
Hey Colin! 👋

Quick check-in:
- How's the European team onboarding going?
- Any blockers I can help with?
- Need anything from me?

Reply when you have a moment. No rush!
```

## 5. Follow-up Message

**Purpose:** Follow up on previous conversations

**When to Use:**
- After meetings
- Pending actions
- Unanswered questions

**Template:**
```
Following up on our conversation about {topic}:

**Previous:** {previous_context}
**Action Item:** {action_item}
**Deadline:** {deadline} (originally)
**Status:** {current_status}

**Questions:**
1. {question_1}
2. {question_2}

**Next Steps:**
- {next_step_1}
- {next_step_2}

Please provide an update when possible.
```

**Variables:**
- `{topic}` - Discussion topic
- `{previous_context}` - Previous discussion
- `{action_item}` - Assigned action
- `{deadline}` - Original deadline
- `{current_status}` - Current status
- `{question_x}` - Follow-up questions
- `{next_step_x}` - Suggested next steps

**Example:**
```
Following up on our conversation about candidate screening:

**Previous:** Discussed automated screening process
**Action Item:** Review screening criteria document
**Deadline:** 2026-02-03 (originally)
**Status:** Pending review

**Questions:**
1. Have you had a chance to review the document?
2. Any feedback or changes needed?

**Next Steps:**
- Update criteria based on feedback
- Implement in screening system

Please provide an update when possible.
```

## 6. Urgent/Alert Message

**Purpose:** Critical or time-sensitive communications

**When to Use:**
- System outages
- Security incidents
- Emergency situations
- Deadline changes

**Template:**
```
🚨 URGENT: {alert_type}

**Issue:** {issue_description}
**Impact:** {impact_level}
**Time:** {detection_time}
**Status:** {current_status}

**Immediate Actions:**
1. {action_1}
2. {action_2}

**Contacts:**
- Primary: {primary_contact}
- Backup: {backup_contact}

**Updates:**
- Will provide updates every {update_frequency}
- Monitor {channel} for latest information

**Do Not:** {prohibited_actions}
```

**Variables:**
- `{alert_type}` - Type of alert
- `{issue_description}` - Issue details
- `{impact_level}` - Impact severity
- `{detection_time}` - When detected
- `{current_status}` - Current situation
- `{action_x}` - Required actions
- `{primary_contact}` - Main contact
- `{backup_contact}` - Backup contact
- `{update_frequency}` - Update schedule
- `{channel}` - Update channel
- `{prohibited_actions}` - Actions to avoid

**Example:**
```
🚨 URGENT: System Outage

**Issue:** Database server unresponsive
**Impact:** CRITICAL - All services affected
**Time:** 2026-02-05 10:30 UTC
**Status:** Investigating

**Immediate Actions:**
1. Do not attempt to restart services
2. Redirect users to status page
3. Activate backup systems

**Contacts:**
- Primary: Harry (6884933598)
- Backup: Colin (7081708673)

**Updates:**
- Will provide updates every 15 minutes
- Monitor #system-alerts for latest information

**Do Not:** Attempt manual fixes or restart services
```

## 7. Thank You/Appreciation

**Purpose:** Recognize contributions and achievements

**When to Use:**
- Project completion
- Team achievements
- Individual contributions
- Milestone celebrations

**Template:**
```
🎉 Great work on {achievement}!

**Team/Person:** {recipient}
**Achievement:** {specific_achievement}
**Impact:** {impact_description}

**Special Thanks:**
- {contribution_1}
- {contribution_2}
- {contribution_3}

**Next Steps:**
- {next_step_1}
- {next_step_2}

**Celebration:** {celebration_plan}

Well done everyone! 👏
```

**Variables:**
- `{achievement}` - General achievement
- `{recipient}` - Who achieved it
- `{specific_achievement}` - Specific accomplishment
- `{impact_description}` - Impact/benefits
- `{contribution_x}` - Specific contributions
- `{next_step_x}` - What's next
- `{celebration_plan}` - Celebration details

**Example:**
```
🎉 Great work on Q1 Launch!

**Team/Person:** Development Team
**Achievement:** Successfully launched URecruit v2
**Impact:** 40% faster candidate processing

**Special Thanks:**
- Frontend team for responsive design
- Backend team for performance optimization
- QA team for thorough testing

**Next Steps:**
- Monitor system performance
- Gather user feedback
- Plan v2.1 enhancements

**Celebration:** Team lunch on Friday!

Well done everyone! 👏
```

## 8. Information Request

**Purpose:** Request specific information or documents

**When to Use:**
- Data collection
- Document requests
- Information gathering

**Template:**
```
Hi {name},

I'm working on {project/task} and need some information:

**Request:** {information_request}
**Purpose:** {purpose}
**Format:** {preferred_format}
**Deadline:** {deadline}

**Details Needed:**
1. {detail_1}
2. {detail_2}
3. {detail_3}

**Examples/Templates:**
- {example_link}
- {template_link}

Please let me know if you need clarification or if the deadline needs adjustment.

Thanks!
```

**Variables:**
- `{name}` - Recipient name
- `{project/task}` - Context
- `{information_request}` - What's needed
- `{purpose}` - Why it's needed
- `{preferred_format}` - Preferred format
- `{deadline}` - When needed
- `{detail_x}` - Specific details
- `{example_link}` - Example link
- `{template_link}` - Template link

**Example:**
```
Hi Paul,

I'm working on the monthly performance report and need some information:

**Request:** Department metrics for January
**Purpose:** Executive reporting
**Format:** Excel or CSV
**Deadline:** 2026-02-07 EOD

**Details Needed:**
1. Candidate pipeline numbers
2. Conversion rates by source
3. Team productivity metrics

**Examples/Templates:**
- https://docs.urecruit.com/reports/template
- https://docs.urecruit.com/reports/example

Please let me know if you need clarification or if the deadline needs adjustment.

Thanks!
```

## Template Management

### Storage Location
```
skills/telegram-contact/templates/
├── team-communication/
│   ├── daily-standup.md
│   ├── project-update.md
│   └── meeting-invitation.md
├── project-updates/
├── alerts/
└── informal/
```

### Using Templates

**Step 1: Select Template**
```bash
read skills/telegram-contact/templates/team-communication/daily-standup.md
```

**Step 2: Customize**
- Replace variables with actual values
- Adjust tone for recipient
- Add/remove sections as needed

**Step 3: Send**
```bash
message action=send target=7081708673 message="<customized_template>"
```

### Creating New Templates

**Template Creation Guidelines:**
1. **Purpose:** Clear, single purpose
2. **Structure:** Consistent format
3. **Variables:** Clearly marked
4. **Examples:** Include working example
5. **Notes:** Usage guidelines

**Template Validation:**
```bash
# Check template structure
grep -n "## Purpose\|## When to Use\|## Template\|## Variables\|## Example" template.md
```

### Template Variables System

**Standard Variables:**
- `{date}` - Current date (auto-filled)
- `{time}` - Current time (auto-filled)
- `{sender}` - Sender name (auto-filled)
- `{recipient}` - Recipient name (context)

**Custom Variables:**
- Define in template
- Document in Variables section
- Provide examples

### Automation with Templates

**Scheduled Messages:**
```bash
cron action=add job='{
  "name": "Daily standup reminder",
  "schedule": {"kind": "cron", "expr": "0 9 * * 1-5", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Send daily standup template to team"
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

**Template Library:**
- Maintain index of all templates
- Search by category/purpose
- Version control templates

## Best Practices

### 1. Template Selection
- Match template to communication purpose
- Consider recipient preferences
- Adjust formality level

### 2. Customization
- Always personalize templates
- Update variables accurately
- Maintain consistent tone

### 3. Quality Control
- Review before sending
- Check variable replacement
- Verify links and dates

### 4. Maintenance
- Regular template reviews
- Update outdated templates
- Archive unused templates

### 5. Feedback Loop
- Track template effectiveness
- Gather recipient feedback
- Continuously improve templates

## Integration

### With Contact Management
- Link templates to contact preferences
- Store frequently used templates per contact
- Track template usage history

### With Automation System
- Schedule template-based messages
- Trigger templates based on events
- Automate variable filling

### With Analytics
- Track template usage
- Measure response rates
- Optimize based on data
