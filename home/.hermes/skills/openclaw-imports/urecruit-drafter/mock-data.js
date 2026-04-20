// Placeholder email drafts for testing urecruit-drafter

const mockDrafts = {
  // Initial interest response - Tier A candidate
  initialInterest: {
    template: 'initial-interest',
    candidate: {
      name: 'Michael Chen',
      currentRole: 'Project Director',
      currentCompany: 'DPR Construction',
      location: 'Frankfurt'
    },
    role: {
      title: 'Project Director',
      client: 'Winthrop',
      location: 'Frankfurt'
    },
    fromEmail: 'colin@urecruitglobal.com',
    context: 'Candidate responded to initial outreach with interest',
    expectedOutput: {
      subject: 'Michael Chen - Project Director Opportunity, Frankfurt',
      // Body content only - signature and disclaimer appended separately
      bodyContent: `Hi Michael,

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

Could you kindly drop me a copy of your CV? Then I'll give you a call to discuss.`,
      // Full HTML body = bodyContent + signature + disclaimer
      fullBodyHtml: `[bodyContent] + signatures['colin@urecruitglobal.com'] + disclaimer`,
      wordCountBodyOnly: 85,
      testsPassed: ['length', 'subject_format', 'authority', 'company_list', 'no_placeholders'],
      signatureSource: 'email-signatures.json'
    }
  },

  // Info request response
  infoRequest: {
    template: 'info-request',
    candidate: {
      name: 'Sarah Johnson',
      currentRole: 'Senior Project Manager'
    },
    role: {
      title: 'Senior Project Manager',
      location: 'Dublin'
    },
    fromEmail: 'colin@urecruitglobal.com',
    context: 'Candidate asked for more information about the role',
    expectedOutput: {
      subject: 'Re: Senior PM Role, Dublin',
      bodyContent: `Hi Sarah,

Thanks for getting back to me.

To give you the full picture, I'd need to understand your current situation — availability, what day rate you're looking for, and notice period.

Could you kindly drop me your CV? Then we can schedule a quick call — much easier than email tennis.`,
      fullBodyHtml: `[bodyContent] + signatures['colin@urecruitglobal.com'] + disclaimer`,
      wordCountBodyOnly: 45,
      testsPassed: ['length', 'subject_format', 'authority', 'no_placeholders'],
      signatureSource: 'email-signatures.json'
    }
  },

  // CV received response
  cvReceived: {
    template: 'cv-received',
    candidate: {
      name: 'David Kumar',
      currentRole: 'Project Manager',
      currentCompany: 'Turner & Townsend'
    },
    role: {
      title: 'Project Manager',
      location: 'Amsterdam'
    },
    fromEmail: 'colin@urecruitglobal.com',
    context: 'Candidate sent CV',
    expectedOutput: {
      subject: 'Re: Project Manager Opportunity, Amsterdam',
      body: `Hi David,

Thanks for sending this through. Your experience at Turner & Townsend stands out — particularly the major infrastructure project work.

I have a couple of live opportunities this could align with. I'll give you a call this afternoon to discuss — are you free around 3pm?`,
      fullBodyHtml: `[bodyContent] + signatures['colin@urecruitglobal.com'] + disclaimer`,
      wordCountBodyOnly: 48,
      testsPassed: ['length', 'subject_format', 'authority', 'no_placeholders'],
      signatureSource: 'email-signatures.json'
    }
  },

  // Rate discussion (Colin asks candidate)
  rateDiscussion: {
    template: 'rate-discussion',
    candidate: {
      name: 'Michael Chen'
    },
    fromEmail: 'colin@urecruitglobal.com',
    context: 'Need to discuss rates before proceeding',
    expectedOutput: {
      subject: 'Re: Project Director Opportunity, Frankfurt',
      body: `Hi Michael,

Good to hear from you.

Before I share role specifics, can you let me know what day rate you're currently on or targeting? This helps me match you to the right level.

I'll give you a call this afternoon if that suits.`,
      fullBodyHtml: `[bodyContent] + signatures['colin@urecruitglobal.com'] + disclaimer`,
      wordCountBodyOnly: 42,
      testsPassed: ['length', 'subject_format', 'authority', 'no_placeholders'],
      signatureSource: 'email-signatures.json'
    }
  },

  // Follow-up (No response)
  followUp: {
    template: 'follow-up',
    candidate: {
      name: 'Sarah Johnson'
    },
    role: {
      title: 'Senior Project Manager',
      location: 'Dublin'
    },
    fromEmail: 'colin@urecruitglobal.com',
    daysSinceLastEmail: 3,
    expectedOutput: {
      subject: 'Re: Senior PM Role, Dublin',
      body: `Hi Sarah,

Just following up on my last note. The Senior Project Manager opportunity in Dublin is still active and I think your background fits well.

Worth a brief chat? I'll keep it to 10 minutes.`,
      fullBodyHtml: `[bodyContent] + signatures['colin@urecruitglobal.com'] + disclaimer`,
      wordCountBodyOnly: 38,
      testsPassed: ['length', 'subject_format', 'authority', 'no_placeholders'],
      signatureSource: 'email-signatures.json'
    }
  },

  // Meeting setup
  meetingSetup: {
    template: 'meeting-setup',
    candidate: {
      name: 'David Kumar'
    },
    fromEmail: 'colin@urecruitglobal.com',
    proposedTime: 'Thursday at 3pm',
    expectedOutput: {
      subject: 'Re: Project Manager Opportunity, Amsterdam',
      body: `Hi David,

Sounds good. How's Thursday at 3pm for you?

My number: +44 20 7123 4567`,
      fullBodyHtml: `[bodyContent] + signatures['colin@urecruitglobal.com'] + disclaimer`,
      wordCountBodyOnly: 20,
      testsPassed: ['length', 'subject_format', 'authority', 'no_placeholders'],
      signatureSource: 'email-signatures.json'
    }
  }
};

// Signature helper
const signatures = require('./email-signatures.json');

function assembleEmail(bodyContent, fromEmail) {
  const signature = signatures.signatures[fromEmail] || signatures.signatures['colin@urecruitglobal.com'];
  return bodyContent + signature + signatures.disclaimer;
}

// Validation rules (body content only, before signature)
const validationRules = {
  length: (draft) => {
    // Check bodyContent if available, otherwise body
    const content = draft.bodyContent || draft.body;
    const wordCount = content.split(/\s+/).length;
    return wordCount >= 50 && wordCount <= 150; // Body content only
  },
  subject_format: (draft) => {
    const pattern = /^[A-Za-z\s]+ - [A-Za-z\s]+(,| -) [A-Za-z\s]+$/;
    return pattern.test(draft.subject);
  },
  authority: (draft) => {
    const content = draft.bodyContent || draft.body;
    return content.includes('I\'m heading up') || 
           content.includes('heading up recruitment') ||
           content.includes('I head up');
  },
  no_placeholders: (draft) => {
    const content = draft.bodyContent || draft.body;
    const placeholderPattern = /\[[A-Z\s]+\]/;
    return !placeholderPattern.test(content) && !placeholderPattern.test(draft.subject);
  }
};

function validateDraft(draft) {
  const results = {};
  let allPassed = true;
  
  for (const [test, fn] of Object.entries(validationRules)) {
    const passed = fn(draft);
    results[test] = passed;
    if (!passed) allPassed = false;
  }
  
  return { valid: allPassed, results };
}

module.exports = { mockDrafts, signatures, assembleEmail, validationRules, validateDraft };
