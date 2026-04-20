# URecruit Paul Approval Skill

Manages candidate presentation and draft approval workflow for Paul via Telegram.

## Purpose
Present scored candidates and email drafts to Paul for approve/edit/skip decisions.

## Workflow

```
Candidate Scored (Tier A/B/C)
    ↓
Send Telegram Card to Paul
    ↓
Paul taps: [APPROVE] [EDIT] [SKIP]
    ↓
    ├── APPROVE → Check for CV
    │               ├── Has CV → Generate draft → Paul approves → Double confirm → Send
    │               └── No CV → Request CV draft → Send CV request
    ├── EDIT → Open edit interface → Resubmit
    └── SKIP → Log rejection → Next candidate
```

## Candidate Card Format

### Tier A (Hot Lead)
```
🎯 NEW CANDIDATE - Tier A

👤 Michael Chen
💼 Project Director  
⭐ 22 years experience
🏢 DPR Construction
📍 Frankfurt

📊 Quality Score: 87/100
✅ Data center background
✅ Senior level
✅ Stable employment
✅ European location

🎯 Matches:
• Frankfurt PD (Winthrop)
• Amsterdam PD (Sisk)

[👍 APPROVE]  [✏️ EDIT]  [❌ SKIP]
```

### Tier A — Major Client Warning
```
🎯 NEW CANDIDATE - Tier A
⚠️ MAJOR CLIENT — RELATIONSHIP PROTECTION

👤 James Wilson
💼 Senior Project Manager
⭐ 16 years experience
🏢 Mercury Engineering ⬅️ CURRENT EMPLOYER
📍 Dublin

🚨 WARNING: Candidate currently works at Mercury — a major URecruit client.

📋 Protection Protocol:
• Reply will be sent from original outreach email
• Junior recruiter persona protects Colin/Paul
• Candidate won't know senior leadership is involved

Paul's options:
[📧 SEND AS JUNIOR] — Protect relationship
[👤 OVERRIDE AS PAUL] — Send as myself (I accept risk)
[❌ SKIP] — Pass on this candidate
```

### Tier B (Good Fit)
```
📋 NEW CANDIDATE - Tier B

👤 Sarah Johnson
💼 Senior Project Manager
⭐ 12 years experience
🏢 Skanska
📍 Dublin

📊 Quality Score: 72/100
✅ Construction background
⚠️ Adjacent sector (commercial)
✅ Stable employment

🎯 Matches:
• Dublin CSA (Jones Engineering)

[👍 APPROVE]  [✏️ EDIT]  [❌ SKIP]
```

### Tier C (Review Needed)
```
⚠️ NEW CANDIDATE - Tier C

👤 Tom Wilson
💼 Project Manager
⭐ 8 years experience
🏢 Local Builder Ltd
📍 UK

📊 Quality Score: 58/100
⚠️ Limited sector experience
⚠️ Junior for senior roles

🎯 Low priority matches available

[👍 APPROVE]  [✏️ EDIT]  [❌ SKIP]
```

## Approval Flow with CV Check

When Paul approves:
```javascript
if (approval === 'APPROVE') {
  const phone = extractPhone(candidate);
  
  if (phone) {
    notifyPaul(`📞 Call directly: ${phone}`);
    log('Approved with phone - no draft needed');
  } else if (candidate.hasCV) {
    // CV received - generate full response
    generateDraft(candidate, 'cv-received');
    sendDraftForApproval(candidate, draft);
  } else {
    // No CV - request it first
    generateDraft(candidate, 'cv-request');
    sendDraftForApproval(candidate, draft);
  }
}
```

### CV Request Draft Template
```
Subject: Re: [Role] Opportunity, [Location]

Hi [Name],

Thanks for getting back to me.

To give you the full picture, could you kindly drop me a copy of your CV? 
Then I'll give you a call to discuss the opportunity in more detail.

[Signature + Trust Footer]
```

## Draft Approval Card

```
📧 DRAFT for Michael Chen

Subject: Michael Chen - Project Director Opportunity, Frankfurt

Hi Michael,

Harry has looped me in on your profile. I'm heading up recruitment for Project Director roles with our European data center clients.

[Full draft body...]

[✅ SEND]  [✏️ EDIT]  [🗑️ DISCARD]
```

## Edit Interface

### Voice Edit
```
Paul sends voice: "Change 'this week' to 'early next week'"
    ↓
Transcribe → Parse → Apply → Confirm → Resubmit
```

### Text Edit
```
Paul types: "Make it shorter, remove the DPR mention"
    ↓
Parse instructions → Regenerate → Confirm → Resubmit
```

### Edit Patterns Supported
- "Change [X] to [Y]"
- "Remove [section]"
- "Make it [shorter/longer/warmer]"
- "Add [detail]"

## Learning Log

Track Paul's decisions to improve future drafts:
```markdown
## Paul Decision Log - 2026-02-XX

| Candidate | Tier | Decision | Edit? | Edit Type |
|-----------|------|----------|-------|-----------|
| Michael C. | A | APPROVE | No | - |
| Sarah J. | B | APPROVE | Yes | Tone softer |
| Tom W. | C | SKIP | - | - |

### Patterns
- Approval rate by tier: A=95%, B=70%, C=20%
- Common edits: Tone adjustments (40%), Length (30%)
```

## Button Handlers

```javascript
// APPROVE
handler.approve = async (candidate) => {
  const phone = extractPhone(candidate);
  if (phone) {
    await notifyPaul(`📞 ${candidate.name}: ${phone}`);
  } else {
    const draft = await generateDraft(candidate);
    await sendDraftCard(draft);
  }
};

// EDIT
handler.edit = async (candidate, editType) => {
  if (editType === 'voice') {
    await requestVoiceEdit();
  } else {
    await openTextEdit();
  }
};

// SKIP
handler.skip = async (candidate) => {
  await logRejection(candidate, 'Paul skipped');
  await presentNextCandidate();
};

// MAJOR CLIENT — SEND AS JUNIOR (Relationship Protection)
handler.sendAsJunior = async (candidate, originalSenderEmail) => {
  await notifyHarry(`Paul chose JUNIOR persona for ${candidate.name} at ${candidate.currentCompany}`);
  
  // Use original outreach email as sender
  const draft = await generateDraft(candidate, {
    fromEmail: originalSenderEmail, // e.g., "emma@urecruitglobal.com"
    template: 'cv-request' // or appropriate template
  });
  
  await sendDraftCard(draft, { 
    note: 'Sending as junior recruiter to protect relationship',
    fromEmail: originalSenderEmail 
  });
};

// MAJOR CLIENT — OVERRIDE AS PAUL
handler.overrideAsPaul = async (candidate) => {
  await notifyHarry(`⚠️ Paul OVERRIDE for ${candidate.name} at ${candidate.currentCompany} — sending as himself`);
  
  // Use Paul's email despite major client status
  const draft = await generateDraft(candidate, {
    fromEmail: 'paul@urecruitglobal.com',
    template: 'cv-request'
  });
  
  await sendDraftCard(draft, {
    note: 'OVERRIDE: Paul accepting risk of direct contact',
    fromEmail: 'paul@urecruitglobal.com'
  });
};
```

## Placeholder Data (Testing)

```javascript
// Mock approval session
const mockSession = {
  date: '2026-02-02',
  candidatesPresented: 5,
  approved: 3,
  edited: 1,
  skipped: 1,
  avgDecisionTime: '45 seconds'
};
```

## Email Sending Integration

### Double-Confirmation Flow
```
Paul taps [SEND]
    ↓
System replies: "Confirm: Send to {name} at {email}?"
    ↓
Paul taps [YES]
    ↓
Call send-gmail-message edge function
    ↓
Log success/failure
    ↓
Notify Paul: "✅ Sent" or "❌ Failed - notified Harry"
```

### Implementation
```javascript
async function sendApprovedEmail(draft, candidate) {
  // Load credentials from environment
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-gmail-message`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: candidate.email,
          subject: draft.subject,
          body: draft.body, // Includes signature + trust footer
          from_account: 'colin@urecruitglobal.com',
          thread_id: candidate.threadId
        })
      }
    );
    
    const result = await response.json();
    
    // Log the send
    await logEmailSend({
      timestamp: new Date().toISOString(),
      to: candidate.email,
      subject: draft.subject,
      approvedBy: 'Paul',
      status: result.success ? 'sent' : 'failed'
    });
    
    return result;
  } catch (error) {
    // Notify Harry of failure
    await notifyHarry(`🚨 Email send failed: ${error.message}`);
    throw error;
  }
}
```

### Rate Limiting
```javascript
const rateLimits = {
  hourlyMax: 10,
  burstMax: 3,
  burstWindow: 5 * 60 * 1000 // 5 minutes
};

function checkRateLimit(director) {
  const sends = getRecentSends(director, '1 hour');
  if (sends.length >= rateLimits.hourlyMax) {
    return { allowed: false, reason: 'Hourly limit exceeded' };
  }
  
  const burstSends = getRecentSends(director, '5 minutes');
  if (burstSends.length >= rateLimits.burstMax) {
    return { allowed: false, reason: 'Burst limit exceeded' };
  }
  
  return { allowed: true };
}
```

### New Contact Quarantine
```javascript
async function checkNewContact(email) {
  const isNew = !await hasSentToBefore(email);
  if (isNew) {
    // Require Harry approval for first contact
    await notifyHarry(`🆕 New contact requires approval: ${email}`);
    return { allowed: false, pendingHarry: true };
  }
  return { allowed: true };
}
```

## Integration Points

| System | Direction | Method |
|--------|-----------|--------|
| urecruit-scorer | IN | Scored candidate data |
| urecruit-drafter | IN/OUT | Draft generation + edits |
| Telegram | OUT | Messages with inline buttons |
| URecruit edge function | OUT | Send email (on SEND) |
| urecruit-safety | IN | Guardrails enforcement |

## Files

- `presenter.js` - Candidate card generation
- `buttons.js` - Button handler logic
- `editor.js` - Edit interface (voice/text)
- `logger.js` - Decision tracking
- `mock-data.js` - Placeholder sessions
- `SKILL.md` - This file

## Status

🟡 **In Development** - Placeholder flow active, awaiting Paul onboarding
