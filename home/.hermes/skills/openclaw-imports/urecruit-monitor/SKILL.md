---
name: urecruit-monitor
description: |
  Monitors Supabase emails table via Realtime for new candidate responses.

  Use when:
  - Detecting new inbound emails from candidates in real-time
  - Triggering Ghost Mode pipeline when candidate replies arrive
  - Monitoring email flow for live candidates

  Don't use when:
  - Processing historical emails (use batch processor)
  - Candidate already in pipeline (check ghost_runs first)
  - Testing pipeline (use regression suite with golden emails)

  Outputs: Filtered candidate emails ready for assessment
---

# URecruit Email Monitor Skill

Monitors Supabase `emails` table via Realtime for new candidate responses.

## Purpose
Subscribe to inbound emails from candidates and trigger scoring workflow.

## Architecture
```
Supabase Realtime → Email Filter → Candidate Detection → Scorer Trigger
```

## Requirements

- `SUPABASE_URL` - Database URL (from `.env`)
- `SUPABASE_SERVICE_ROLE_KEY` - For Realtime subscription (from `.env`)
- Connection to `poll-gmail-accounts` edge function output

## Environment Setup

```javascript
// Load from OpenClaw environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials in environment');
}
```

## Usage

```javascript
// From skill or agent code
const { watchEmails } = require('./skills/urecruit-monitor/watcher');

watchEmails({
  onCandidateEmail: (email) => {
    // Trigger scorer
    scoreCandidate(email);
  }
});
```

## Filter Logic

### Candidate Detection
```javascript
function isCandidateEmail(email) {
  return (
    email.direction === 'inbound' &&
    !email.from.includes('urecruit') &&
    !email.from.includes('system') &&
    (hasProfileInfo(email) || isReplyToOutreach(email))
  );
}
```

### Profile Info Detection
- CV attachments (pdf, doc, docx)
- LinkedIn URLs
- Experience mentions ("X years at Y")
- Contact details

## Database Schema (Expected)

```sql
create table emails (
  id uuid primary key default gen_random_uuid(),
  direction text check (direction in ('inbound', 'outbound')),
  from_address text,
  to_address text,
  subject text,
  body text,
  thread_id text,
  created_at timestamp default now(),
  attachments jsonb default '[]'
);
```

## Fallback Behavior

If Realtime drops:
1. Log disconnection
2. Poll `emails` table every 5 minutes
3. Re-establish Realtime when available

## Placeholder Data (Testing)

```javascript
// Mock email for testing
const mockCandidateEmail = {
  id: 'test-001',
  direction: 'inbound',
  from_address: 'john.smith@example.com',
  to_address: 'colin@urecruitglobal.com',
  subject: 'Re: Project Director Opportunity, Amsterdam',
  body: 'Hi Colin, thanks for reaching out. I have 18 years experience in data center construction...',
  thread_id: 'thread-123',
  created_at: new Date().toISOString(),
  attachments: [{ filename: 'John_Smith_CV.pdf', size: 2400000 }]
};
```

## Integration Points

| System | Direction | Method |
|--------|-----------|--------|
| Supabase emails table | IN | Realtime subscription |
| urecruit-scorer skill | OUT | Function call |
| State/Logs | OUT | File write |

## Files

- `watcher.js` - Core subscription logic
- `filter.js` - Email filtering rules
- `mock-data.js` - Placeholder emails for testing
- `SKILL.md` - This file

## Status

🟡 **In Development** - Placeholder data active, awaiting Supabase connection
