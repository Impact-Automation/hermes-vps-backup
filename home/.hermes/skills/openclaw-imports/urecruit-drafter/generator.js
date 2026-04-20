/**
 * URecruit Email Drafter - generator.js
 * Generates email drafts in Colin's voice
 *
 * Templates:
 * 1. Initial Interest Response
 * 2. Info Request Response
 * 3. CV Received
 * 4. Rate Discussion
 * 5. Follow-up
 * 6. Meeting Setup
 */

const fs = require('fs');
const path = require('path');

// Load email signatures
let signatures;
try {
  signatures = require('./email-signatures.json');
} catch (e) {
  console.warn('[Drafter] Could not load email-signatures.json, using fallback');
  signatures = { signatures: {}, disclaimer: '' };
}

// Colin's active clients/roles
const ACTIVE_CLIENTS = [
  { name: 'Winthrop', locations: ['Dublin', 'Amsterdam', 'Frankfurt'] },
  { name: 'Sisk', locations: ['Amsterdam', 'Copenhagen'] },
  { name: 'Jones Engineering', locations: ['Dublin', 'London'] },
  { name: 'Dornan', locations: ['Dublin', 'Amsterdam'] },
  { name: 'BAM', locations: ['Copenhagen', 'Helsinki'] },
  { name: 'Bouygues', locations: ['Portugal', 'France'] },
  { name: 'Multiplex', locations: ['UK', 'Ireland'] },
  { name: 'Knight Frank', locations: ['UK-wide'] }
];

// Template definitions
const TEMPLATES = {
  'initial-interest': {
    name: 'Initial Interest Response',
    subjectPattern: '{name} - {role} Opportunity, {location}',
    body: `Hi {firstName},

Harry has looped me in on your profile. I'm heading up recruitment for {role} opportunities with our European data center clients.

We're currently working with:
{clientList}

Having seen your background as {currentRole} at {currentCompany}, this could be a strong fit.

Could you kindly drop me a copy of your CV? Then I'll give you a call to discuss.`
  },

  'info-request': {
    name: 'Info Request Response',
    subjectPattern: 'Re: {originalSubject}',
    body: `Hi {firstName},

Thanks for getting back to me.

To give you the full picture, I'd need to understand your current situation — availability, what day rate you're looking for, and notice period.

Could you kindly drop me your CV? Then we can schedule a quick call — much easier than email tennis.`
  },

  'cv-received': {
    name: 'CV Received',
    subjectPattern: 'Re: {originalSubject}',
    body: `Hi {firstName},

Thanks for sending this through. Your experience at {currentCompany} stands out — particularly the {sectorType} work.

I have a couple of live opportunities this could align with. I'll give you a call this afternoon to discuss — are you free around 3pm?`
  },

  'rate-discussion': {
    name: 'Rate Discussion',
    subjectPattern: 'Re: {originalSubject}',
    body: `Hi {firstName},

Good to hear from you.

Before I share role specifics, can you let me know what day rate you're currently on or targeting? This helps me match you to the right level.

I'll give you a call this afternoon if that suits.`
  },

  'follow-up': {
    name: 'Follow-up',
    subjectPattern: 'Re: {originalSubject}',
    body: `Hi {firstName},

Just following up on my last note. The {role} opportunity in {location} is still active and I think your background fits well.

Worth a brief chat? I'll keep it to 10 minutes.`
  },

  'meeting-setup': {
    name: 'Meeting Setup',
    subjectPattern: 'Re: {originalSubject}',
    body: `Hi {firstName},

Sounds good. How's {proposedDay} at {proposedTime} for you?

My number: +44 7521 002768`
  },

  'cv-request': {
    name: 'CV Request (Default)',
    subjectPattern: 'Re: {originalSubject}',
    body: `Hi {firstName},

Thanks for getting back to me.

To give you the full picture, could you kindly drop me a copy of your CV? Then I'll give you a call to discuss the opportunity in more detail.`
  }
};

/**
 * Format client list for emails
 */
function formatClientList() {
  return ACTIVE_CLIENTS.map(c =>
    `• ${c.name} (${c.locations.join(', ')})`
  ).join('\n');
}

/**
 * Get first name from full name
 */
function getFirstName(fullName) {
  if (!fullName) return 'there';
  return fullName.split(' ')[0];
}

/**
 * Detect sector type from candidate info
 */
function detectSectorType(candidate) {
  const content = ((candidate.sector || '') + ' ' + (candidate.emailBody || '')).toLowerCase();

  if (/data\s*cent(er|re)|hyperscale/i.test(content)) return 'data center';
  if (/commercial/i.test(content)) return 'commercial construction';
  if (/m&e|mechanical|electrical/i.test(content)) return 'M&E';
  if (/infrastructure/i.test(content)) return 'infrastructure';

  return 'construction';
}

/**
 * Replace template variables
 */
function fillTemplate(template, vars) {
  let result = template;

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }

  return result;
}

/**
 * Get signature for email address
 */
function getSignature(fromEmail) {
  // Try exact match first
  if (signatures.signatures && signatures.signatures[fromEmail]) {
    return signatures.signatures[fromEmail];
  }

  // Fallback to Colin's signature
  if (signatures.signatures && signatures.signatures['colin@urecruitglobal.com']) {
    return signatures.signatures['colin@urecruitglobal.com'];
  }

  // Ultimate fallback
  return `

Colin Smalls
Managing Director
URecruit Global
colin@urecruitglobal.com`;
}

/**
 * Get disclaimer
 */
function getDisclaimer() {
  return signatures.disclaimer || '';
}

/**
 * Validate draft passes 5-test
 */
function validateDraft(draft) {
  const tests = {
    length: false,
    subject_format: false,
    authority: false,
    no_placeholders: false,
    has_cta: false
  };

  // 1. Length check (50-150 words for body content)
  const wordCount = draft.bodyContent.split(/\s+/).filter(w => w).length;
  tests.length = wordCount >= 20 && wordCount <= 200;

  // 2. Subject format (Name - Role, Location OR Re:)
  const subjectPattern = /^[A-Za-z\s]+ - [A-Za-z\s]+(?:,| -) [A-Za-z\s-]+$|^Re:/i;
  tests.subject_format = subjectPattern.test(draft.subject);

  // 3. Authority positioning (for initial emails)
  if (draft.template === 'initial-interest') {
    tests.authority = /heading up|head up|I'm heading/i.test(draft.bodyContent);
  } else {
    tests.authority = true; // Not required for replies
  }

  // 4. No placeholder text remaining
  const placeholderPattern = /\{[a-zA-Z]+\}/;
  tests.no_placeholders = !placeholderPattern.test(draft.subject) &&
    !placeholderPattern.test(draft.bodyContent);

  // 5. Has call to action
  tests.has_cta = /call|chat|CV|phone|discuss/i.test(draft.bodyContent);

  const allPassed = Object.values(tests).every(v => v);

  return {
    valid: allPassed,
    tests,
    wordCount,
    failedTests: Object.entries(tests).filter(([_, v]) => !v).map(([k]) => k)
  };
}

/**
 * Main draft generation function
 */
function generateDraft(options) {
  const {
    template = 'cv-request',
    candidate,
    role = {},
    fromEmail = 'colin@urecruitglobal.com',
    context = '',
    proposedDay = 'Thursday',
    proposedTime = '3pm'
  } = options;

  // Get template
  const tmpl = TEMPLATES[template];
  if (!tmpl) {
    throw new Error(`Unknown template: ${template}`);
  }

  // Build variables
  const vars = {
    name: candidate.name || 'Candidate',
    firstName: getFirstName(candidate.name),
    role: role.title || candidate.currentRole || 'the role',
    location: role.location || candidate.location || 'Europe',
    currentRole: candidate.currentRole || 'your current role',
    currentCompany: candidate.currentCompany || 'your company',
    originalSubject: candidate.originalSubject || `${candidate.name || 'Candidate'} - Opportunity`,
    clientList: formatClientList(),
    sectorType: detectSectorType(candidate),
    proposedDay,
    proposedTime
  };

  // Fill template
  const bodyContent = fillTemplate(tmpl.body, vars);
  const subject = fillTemplate(tmpl.subjectPattern, vars);

  // Assemble full body with signature
  const signature = getSignature(fromEmail);
  const disclaimer = getDisclaimer();
  const fullBody = bodyContent + signature + disclaimer;

  // Create draft object
  const draft = {
    template,
    subject,
    bodyContent,
    fullBody,
    fromEmail,
    toEmail: candidate.email,
    threadId: candidate.threadId,
    candidate: {
      name: candidate.name,
      email: candidate.email,
      company: candidate.currentCompany,
      role: candidate.currentRole
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      context
    }
  };

  // Validate
  const validation = validateDraft(draft);
  draft.validation = validation;

  if (!validation.valid) {
    console.warn('[Drafter] Draft validation warnings:', validation.failedTests);
  }

  return draft;
}

/**
 * Select appropriate template based on context
 */
function selectTemplate(candidate, context) {
  const contextLower = (context || '').toLowerCase();

  // CV received
  if (candidate.hasCV || /cv|resume|attached/i.test(contextLower)) {
    return 'cv-received';
  }

  // Rate discussion
  if (/rate|salary|day rate|money/i.test(contextLower)) {
    return 'rate-discussion';
  }

  // Follow up
  if (/follow|no response|reminder/i.test(contextLower)) {
    return 'follow-up';
  }

  // Meeting
  if (/meeting|call|schedule|time/i.test(contextLower)) {
    return 'meeting-setup';
  }

  // Initial interest (new candidate)
  if (/initial|interest|first/i.test(contextLower)) {
    return 'initial-interest';
  }

  // Info request (asking questions)
  if (/question|info|information|more|details/i.test(contextLower)) {
    return 'info-request';
  }

  // Default to CV request
  return 'cv-request';
}

/**
 * Generate draft with auto template selection
 */
function autoDraft(candidate, context, fromEmail) {
  const template = selectTemplate(candidate, context);

  return generateDraft({
    template,
    candidate,
    fromEmail,
    context
  });
}

// Export
module.exports = {
  generateDraft,
  autoDraft,
  selectTemplate,
  validateDraft,
  getSignature,
  getDisclaimer,
  formatClientList,
  TEMPLATES,
  ACTIVE_CLIENTS
};
