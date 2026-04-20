// Placeholder candidate emails for testing urecruit-monitor

const mockCandidateEmails = [
  {
    id: 'email-001',
    direction: 'inbound',
    from_address: 'michael.chen@dpr.com',
    to_address: 'colin@urecruitglobal.com',
    subject: 'Re: Project Director Opportunity, Frankfurt',
    body: `Hi Colin,

Thanks for reaching out. I'm definitely interested in exploring the Frankfurt opportunity.

Quick background:
- 22 years in construction, last 6 as PD at DPR
- Specialised in hyperscale data centers (Google, Meta projects)
- Currently on €750/day, open to discussion
- 3 month notice but can negotiate

CV attached. Available for a call tomorrow afternoon if that works?

Best,
Michael

---
Michael Chen
Project Director
michael.chen@dpr.com
+49 170 1234 5678`,
    thread_id: 'thread-frankfurt-pd-001',
    created_at: '2026-02-02T10:30:00Z',
    attachments: [
      { filename: 'Michael_Chen_CV_2026.pdf', size: 2400000 }
    ]
  },
  {
    id: 'email-002',
    direction: 'inbound',
    from_address: 'sarah.johnson@skanska.ie',
    to_address: 'colin@urecruitglobal.com',
    subject: 'Re: Senior PM Role, Dublin',
    body: `Hi Colin,

Appreciate the message. I'm open to hearing more about the Dublin role.

Current situation:
- 12 years experience, 5 as Senior PM at Skanska
- Mostly commercial and healthcare projects
- Looking for something new
- Available immediately

Let me know if you'd like my CV.

Sarah`,
    thread_id: 'thread-dublin-spm-002',
    created_at: '2026-02-02T11:15:00Z',
    attachments: []
  },
  {
    id: 'email-003',
    direction: 'inbound',
    from_address: 'tom.wilson@localbuilder.co.uk',
    to_address: 'colin@urecruitglobal.com',
    subject: 'Re: Construction Opportunities',
    body: `Hi,

Saw your message. I have 8 years experience as a PM. Done some residential and small commercial projects.

Looking for something bigger. What do you have?

Tom`,
    thread_id: 'thread-general-003',
    created_at: '2026-02-02T12:00:00Z',
    attachments: []
  },
  {
    id: 'email-004',
    direction: 'outbound',
    from_address: 'colin@urecruitglobal.com',
    to_address: 'candidate@example.com',
    subject: 'John Smith - Director Opportunity, Amsterdam',
    body: 'This is an outbound email (should be filtered out)',
    thread_id: 'thread-outbound-004',
    created_at: '2026-02-02T09:00:00Z',
    attachments: []
  },
  {
    id: 'email-005',
    direction: 'inbound',
    from_address: 'system@urecruitglobal.com',
    to_address: 'colin@urecruitglobal.com',
    subject: 'Daily Report',
    body: 'System email (should be filtered out)',
    thread_id: 'thread-system-005',
    created_at: '2026-02-02T08:00:00Z',
    attachments: []
  }
];

// Filter function
function isCandidateEmail(email) {
  return (
    email.direction === 'inbound' &&
    !email.from_address.includes('urecruit') &&
    !email.from_address.includes('system') &&
    (hasProfileInfo(email) || isReplyToOutreach(email))
  );
}

function hasProfileInfo(email) {
  const indicators = [
    /\d+\s*years?\s*(experience|exp)/i,
    /CV|resume|curriculum/i,
    /currently\s*at/i,
    /linkedin\.com/i,
    /€|\$|\bp\.d\.\b|day\s*rate/i
  ];
  const body = email.body + ' ' + email.subject;
  return indicators.some(pattern => pattern.test(body));
}

function isReplyToOutreach(email) {
  return email.subject.toLowerCase().startsWith('re:');
}

// Test filter
const candidateEmails = mockCandidateEmails.filter(isCandidateEmail);
console.log(`Filtered ${candidateEmails.length} candidate emails from ${mockCandidateEmails.length} total`);

module.exports = { mockCandidateEmails, isCandidateEmail, candidateEmails };
