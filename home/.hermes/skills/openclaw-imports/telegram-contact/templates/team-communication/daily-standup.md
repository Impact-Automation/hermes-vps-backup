# Daily Standup Template

## Purpose
Daily team coordination and status sharing

## When to Use
- Morning check-ins
- Remote team coordination  
- Project status tracking
- Daily accountability

## Template
```
Good morning team! Here's my update for {date}:

✅ Completed:
- {completed_item_1}
- {completed_item_2}
- {completed_item_3}

🎯 Today's Focus:
- {focus_item_1}
- {focus_item_2}
- {focus_item_3}

🚧 Blockers:
- {blocker_1} (if any)
- {blocker_2} (if any)

💡 Notes:
- {note_1}
- {note_2}

Need help with: {help_needed}
```

## Variables
- `{date}` - Today's date (YYYY-MM-DD)
- `{completed_item_x}` - Tasks completed since last update
- `{focus_item_x}` - Planned tasks for today
- `{blocker_x}` - Blockers or issues preventing progress
- `{note_x}` - Additional notes or observations
- `{help_needed}` - Specific help or support needed

## Example
```
Good morning team! Here's my update for 2026-02-05:

✅ Completed:
- Implemented user authentication system
- Fixed login bug reported yesterday
- Updated API documentation

🎯 Today's Focus:
- Database optimization for performance
- Write unit tests for new features
- Prepare deployment checklist

🚧 Blockers:
- Waiting on design assets from creative team
- API rate limit issue with third-party service

💡 Notes:
- User feedback session scheduled for tomorrow
- Performance improvements showing good results

Need help with: Deployment configuration review
```

## Customization Tips

### For Different Team Sizes:
**Small team (2-5 people):**
- Keep it concise
- Focus on key achievements
- Mention direct dependencies

**Large team (6+ people):**
- Include project context
- Reference specific tickets/issues
- Highlight cross-team dependencies

### For Different Timezones:
**Same timezone:**
- Use local time references
- Schedule consistent timing

**Multiple timezones:**
- Always include UTC time
- Use 24-hour format
- Consider asynchronous updates

### For Different Projects:
**Development projects:**
- Include technical details
- Reference code/PR numbers
- Mention testing status

**Business projects:**
- Focus on outcomes
- Include metrics/KPIs
- Mention stakeholder updates

## Best Practices

1. **Be Specific:** Instead of "worked on project," say "implemented user login feature"
2. **Keep it Brief:** 3-5 items per section maximum
3. **Be Honest:** Don't hide blockers or challenges
4. **Actionable:** Make it clear what help is needed
5. **Consistent:** Use same format daily for easy scanning

## Integration

### With Project Management:
- Reference ticket numbers: `[PROJ-123]`
- Link to project boards
- Sync with sprint goals

### With Calendar:
- Schedule standup time
- Include meeting links if applicable
- Reference upcoming deadlines

### With Documentation:
- Link to relevant docs
- Reference decision logs
- Include progress metrics

## Automation

### Scheduled Standups:
```bash
# Cron job for daily standup reminder
cron action=add job='{
  "name": "Daily standup reminder",
  "schedule": {"kind": "cron", "expr": "0 9 * * 1-5", "tz": "UTC"},
  "payload": {
    "kind": "systemEvent",
    "text": "Time for daily standup! Use daily-standup template"
  },
  "sessionTarget": "main",
  "enabled": true
}'
```

### Template Variables Auto-fill:
- `{date}`: Auto-filled with current date
- `{sender}`: Auto-filled with sender name
- `{team}`: Auto-filled with team name

## Response Handling

### Expected Responses:
- 👍 - Acknowledgment
- ❓ - Questions
- 🔄 - Updates on blockers
- ✅ - Help provided

### Follow-up Actions:
1. Address blockers within 24 hours
2. Update completed items next day
3. Track help requests resolution

## Quality Metrics

### Good Standup:
- Clear completed items
- Specific focus items
- Honest about blockers
- Actionable help requests

### Poor Standup:
- Vague descriptions
- No specific focus
- Hidden blockers
- Unclear help needed

## Template Variations

### Quick Standup (30 seconds):
```
✅ {main_completion}
🎯 {main_focus}
🚧 {main_blocker}
```

### Detailed Standup (2 minutes):
```
📅 {date}
✅ Completed ({count}):
  • {item_1} - {details}
  • {item_2} - {details}

🎯 Today's Focus:
  • {item_1} - {priority}
  • {item_2} - {priority}

🚧 Blockers:
  • {blocker} - {impact}

🆘 Help Needed:
  • {help} - {urgency}

📊 Metrics:
  • {metric_1}: {value}
  • {metric_2}: {value}
```

### Async Standup (Written):
```
# Daily Update - {name} - {date}

## What I did yesterday
{bullet_list}

## What I'm doing today  
{bullet_list}

## Blockers
{bullet_list_or_none}

## Questions/Help
{bullet_list_or_none}
```

## Storage and History

### Archive Location:
```
standup-archive/
├── 2026-02/
│   ├── 2026-02-01-team.md
│   ├── 2026-02-02-team.md
│   └── ...
└── summaries/
    ├── weekly-summary-2026-02-01.md
    └── monthly-summary-2026-02.md
```

### Analysis:
- Track completion rates
- Identify common blockers
- Measure help response time
- Improve team velocity