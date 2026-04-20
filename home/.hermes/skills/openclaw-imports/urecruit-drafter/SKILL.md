---
name: urecruit-drafter
description: |
  Generates email drafts in Colin's voice for candidate outreach.

  Use when:
  - Ghost Mode pipeline has classified a candidate and needs a draft
  - Creating candidate-facing emails matching Colin's communication style
  - Drafting replies to candidate inquiries

  Don't use when:
  - Colin hasn't approved the candidate tier (wait for scorer)
  - Candidate is Tier D (not placeable - skip)
  - Email would disclose rate/salary details (use rate deflection instead)
  - Testing or debugging (use regression suite instead)

  Outputs: Email draft in Colin's voice with proper CTA and sign-off
---

# URecruit Email Drafter Skill

Generates email drafts in Colin's voice based on analysis of 166 emails.

## Purpose
Create candidate-facing emails that match Colin's communication style.

## Colin's Voice Profile

### Format
- **Length:** 100-150 words (with signature)
- **Subject:** `[Name] - [Role] Opportunity, [Location]`
- **Tone:** Professional but warm, confident, efficient, information-dense

### Key Elements
1. **Warm handoff** - "Harry has looped me in..."
2. **Authority** - "I head up the European division..."
3. **Information density** - Lists multiple companies/locations
4. **CV request** - Soft ask: "Could you kindly drop me a copy of your CV?"
5. **Call to action** - Phone call preference
6. **Trust footer** - Included on every email
7. **Full signature** - Colin Smalls, Managing Director, contact details

### What Colin Asks For
- Experience acknowledgment (98% of emails)
- CV/resume (42%) — *soft language: "Could you kindly drop me a copy..."*
- Rate/salary expectations (58%) — *asks candidate, doesn't disclose*
- Phone call (23%)

## Standard Components

### Official URecruit Signatures

**Loaded from:** `email-signatures.json`

**Usage:**
```javascript
const data = require('./email-signatures.json');
const fullBody = bodyContent + data.signatures[fromEmail] + data.disclaimer;
```

**Available signatures:**
- `colin@urecruitglobal.com` - Colin Smalls, Managing Director
- `paul@urecruitglobal.com` - Paul Geggus, Managing Director
- `harry@urecruitglobal.com` - Harry Karl, Senior Recruitment Consultant
- `liam@urecruitglobal.com` - Liam James, Contractor Care & Compliance Lead
- `tom@urecruitglobal.com` - Tom Karl, Head of Construction Recruitment UK & Europe

**Each signature includes:**
- Name and title
- Company link
- Email and WhatsApp Business
- Accreditation badges (SMI 500, Institute of Recruiters, ISO 9001, RIBAs, Feefo, Constructionline)

**Disclaimer (appended to ALL emails):**
Official URecruit trust footer with domain information and authenticity verification instructions.

## Templates

### 1. Initial Interest Response
**Body content (signature + disclaimer appended automatically):**
```
Subject: [Name] - [Role] Opportunity, [Location]

Hi [Name],

Harry has looped me in on your profile. I'm heading up recruitment for [Role] opportunities with our European data center clients.

We're currently working with:
• Winthrop (Dublin, Amsterdam, Frankfurt)
• Sisk (Amsterdam, Copenhagen)
• Jones Engineering (Dublin, London)
• Dornan (Dublin, Amsterdam)
• BAM (Copenhagen, Helsinki)
• Bouygues (Portugal, France)
• Multiplex (UK, Ireland)
• Knight Frank (UK-wide)

Having seen your background as [Current Role] at [Company], this could be a strong fit.

Could you kindly drop me a copy of your CV? Then I'll give you a call to discuss.

[Signature + Disclaimer appended via email-signatures.json]
```

### 2. Info Request Response
**Body content (signature + disclaimer appended automatically):**
```
Subject: Re: [Original Subject]

Hi [Name],

Thanks for getting back to me.

To give you the full picture, I'd need to understand your current situation — availability, what day rate you're looking for, and notice period.

Could you kindly drop me your CV? Then we can schedule a quick call — much easier than email tennis.

[Signature + Disclaimer appended via email-signatures.json]
```

### 3. CV Received
**Body content (signature + disclaimer appended automatically):**
```
Subject: Re: [Original Subject]

Hi [Name],

Thanks for sending this through. Your experience at [Company] stands out — particularly the [specific project/type] work.

I have a couple of live opportunities this could align with. I'll give you a call this afternoon to discuss — are you free around 3pm?

[Signature + Disclaimer appended via email-signatures.json]
```

### 4. Rate Discussion (Colin asks candidate)
**Body content (signature + disclaimer appended automatically):**
```
Subject: Re: [Original Subject]

Hi [Name],

Good to hear from you.

Before I share role specifics, can you let me know what day rate you're currently on or targeting? This helps me match you to the right level.

I'll give you a call this afternoon if that suits.

[Signature + Disclaimer appended via email-signatures.json]
```

### 5. Follow-up (No response)
**Body content (signature + disclaimer appended automatically):**
```
Subject: Re: [Original Subject]

Hi [Name],

Just following up on my last note. The [Role] opportunity in [Location] is still active and I think your background fits well.

Worth a brief chat? I'll keep it to 10 minutes.

[Signature + Disclaimer appended via email-signatures.json]
```

### 6. Meeting Setup
**Body content (signature + disclaimer appended automatically):**
```
Subject: Re: [Original Subject]

Hi [Name],

Sounds good. How's [Day] at [Time] for you?

My number: +44 20 7123 4567

[Signature + Disclaimer appended via email-signatures.json]
```

## Validation (5-Test)

Before sending to Paul, drafts must pass:
1. ✅ Length: 50-150 words (body content only, before signature)
2. ✅ Subject format: Name - Role, Location
3. ✅ Authority positioning present ("I head up...")
4. ✅ Company list included (initial emails)
5. ✅ No placeholder text remaining

**Note:** Signature and disclaimer are appended automatically via `email-signatures.json`, not part of body validation.

## Usage

```javascript
const { generateDraft } = require('./skills/urecruit-drafter/generator');
const signatures = require('./email-signatures.json');

// Generate body content (without signature)
// fromEmail can be: colin@, paul@, or original outreach email (for major client protection)
const draft = await generateDraft({
  template: 'initial-interest',
  candidate: {
    name: 'Michael Chen',
    role: 'Senior Project Director',
    company: 'Turner & Townsend',
    location: 'Amsterdam'
  },
  role: {
    title: 'Project Director',
    client: 'Winthrop',
    location: 'Amsterdam'
  },
  fromEmail: 'emma@urecruitglobal.com', // Junior recruiter for major client protection
  context: 'Candidate responded to initial outreach with interest'
});

// Append signature and disclaimer
const fromEmail = 'emma@urecruitglobal.com'; // Uses signature from email-signatures.json
const fullBody = draft.body + (signatures.signatures[fromEmail] || signatures.signatures['colin@urecruitglobal.com']) + signatures.disclaimer;

// Send via edge function
await sendEmail({
  to: candidate.email,
  subject: draft.subject,
  bodyHtml: fullBody,
  from: fromEmail
});
```

## Placeholder Drafts (Testing)

```javascript
// Example output for Tier A candidate
const exampleDraft = {
  subject: 'Michael Chen - Project Director Opportunity, Frankfurt',
  body: `Hi Michael,

Harry has looped me in on your profile. I'm heading up recruitment for Project Director opportunities with our European data center clients.

We're currently working with:
• Winthrop (Dublin, Amsterdam, Frankfurt)
• Sisk (Amsterdam, Copenhagen)
• Jones Engineering (Dublin, London)
• Dornan (Dublin, Amsterdam)
• BAM (Copenhagen, Helsinki)
• Bouygues (Portugal, France)
• Multiplex (UK, Ireland)
• Knight Frank (UK-wide)

Having seen your background as Project Director at DPR Construction, this could be a strong fit.

Could you kindly drop me a copy of your CV? Then I'll give you a call to discuss.

Colin Smalls
Managing Director - European Team
URecruit Global
colin@urecruitglobal.com

---
URecruit Global is a talent intelligence and recruitment technology company. We work with the world's leading data center and construction firms. If you have any authenticity concerns, please copy info@urecruitglobal.com or visit our website at www.urecruitglobal.com.`,
  wordCount: 148,
  testsPassed: ['length', 'subject_format', 'authority', 'company_list', 'trust_footer', 'signature', 'no_placeholders']
};
```

## Integration Points

| System | Direction | Method |
|--------|-----------|--------|
| urecruit-scorer | IN | Score + candidate data |
| urecruit-paul-approval | OUT | Draft for review |
| memory/bank/urecruit/colin/ | IN | Voice patterns, templates |

## Files

- `email-signatures.json` - **Official URecruit email signatures and disclaimer**
- `generator.js` - Draft generation logic
- `templates/` - Template files for each scenario
- `validator.js` - Validation logic
- `mock-data.js` - Placeholder drafts
- `SKILL.md` - This file

## Integration Note

The `send-gmail-message` edge function sends `bodyHtml` exactly as provided. It does NOT add signatures. Your drafter skill MUST append the correct signature + disclaimer from `email-signatures.json` before calling the edge function.

## Status

🟡 **In Development** - Templates updated with Colin's full signature and trust footer, awaiting validation
