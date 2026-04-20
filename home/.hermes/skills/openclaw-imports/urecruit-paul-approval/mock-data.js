// Placeholder approval sessions for testing urecruit-paul-approval

const mockApprovalSessions = [
  {
    sessionId: 'session-001',
    date: '2026-02-02',
    candidates: [
      {
        candidateId: 'cand-001',
        name: 'Michael Chen',
        tier: 'A',
        score: 87,
        decision: 'APPROVE',
        decisionTime: '30 seconds',
        editMade: false,
        phoneAvailable: true,
        phoneNumber: '+49 170 1234 5678',
        outcome: 'Direct call provided'
      },
      {
        candidateId: 'cand-maj-001',
        name: 'James Wilson',
        tier: 'A',
        score: 82,
        currentCompany: 'Mercury Engineering',
        majorClient: {
          isMajor: true,
          client: 'mercury',
          warning: 'Candidate currently at Mercury — major URecruit client'
        },
        decision: 'SEND_AS_JUNIOR',
        decisionTime: '45 seconds',
        editMade: false,
        phoneAvailable: false,
        originalSender: 'emma@urecruitglobal.com',
        outcome: 'Sent as junior recruiter to protect relationship',
        harryNotified: true
      },
      {
        candidateId: 'cand-002',
        name: 'Sarah Johnson',
        tier: 'B',
        score: 72,
        decision: 'APPROVE',
        decisionTime: '45 seconds',
        editMade: true,
        editType: 'tone_softer',
        editInstruction: 'Make it sound less formal',
        phoneAvailable: false,
        outcome: 'Draft generated, edited, then approved'
      },
      {
        candidateId: 'cand-003',
        name: 'Tom Wilson',
        tier: 'C',
        score: 58,
        decision: 'SKIP',
        decisionTime: '10 seconds',
        editMade: false,
        skipReason: 'Not senior enough for current roles',
        outcome: 'Logged rejection'
      },
      {
        candidateId: 'cand-004',
        name: 'Emma Davis',
        tier: 'A',
        score: 91,
        decision: 'APPROVE',
        decisionTime: '25 seconds',
        editMade: false,
        phoneAvailable: false,
        outcome: 'Draft generated, approved without edits'
      }
    ],
    summary: {
      totalPresented: 4,
      approved: 3,
      skipped: 1,
      edited: 1,
      avgDecisionTime: '27.5 seconds',
      tierAApprovalRate: '100%',
      tierBApprovalRate: '100%',
      tierCApprovalRate: '0%'
    }
  },
  {
    sessionId: 'session-002',
    date: '2026-02-02',
    candidates: [
      {
        candidateId: 'cand-005',
        name: 'James Miller',
        tier: 'B',
        score: 68,
        decision: 'SKIP',
        decisionTime: '15 seconds',
        editMade: false,
        skipReason: 'Sector not quite right',
        outcome: 'Logged rejection'
      },
      {
        candidateId: 'cand-006',
        name: 'Lisa Wong',
        tier: 'A',
        score: 85,
        decision: 'APPROVE',
        decisionTime: '35 seconds',
        editMade: true,
        editType: 'length',
        editInstruction: 'Make it shorter',
        phoneAvailable: true,
        outcome: 'Draft regenerated shorter, then approved'
      }
    ],
    summary: {
      totalPresented: 2,
      approved: 1,
      skipped: 1,
      edited: 1,
      avgDecisionTime: '25 seconds'
    }
  }
];

// Telegram message formats
const telegramFormats = {
  tierA: `
🎯 NEW CANDIDATE - Tier A

👤 {name}
💼 {role}
⭐ {experience} years experience
🏢 {company}
📍 {location}

📊 Quality Score: {score}/100
✅ {check1}
✅ {check2}
✅ {check3}

🎯 Matches:
{matches}

[👍 APPROVE]  [✏️ EDIT]  [❌ SKIP]
`,

  majorClientWarning: `
🎯 NEW CANDIDATE - Tier {tier}
⚠️ MAJOR CLIENT — RELATIONSHIP PROTECTION

👤 {name}
💼 {role}
⭐ {experience} years experience
🏢 {company} ⬅️ CURRENT EMPLOYER
📍 {location}

🚨 WARNING: Candidate currently works at {majorClient} — a major URecruit client.

📋 Protection Protocol:
• Reply will be sent from {originalSender}
• Junior recruiter persona protects you
• Candidate won't know senior leadership is involved

Your options:
[📧 SEND AS JUNIOR] — Protect relationship
[👤 OVERRIDE AS PAUL] — Send as myself (I accept risk)
[❌ SKIP] — Pass on this candidate
`,

  tierB: `
📋 NEW CANDIDATE - Tier B

👤 {name}
💼 {role}
⭐ {experience} years experience
🏢 {company}
📍 {location}

📊 Quality Score: {score}/100
✅ {check1}
⚠️ {warning1}
✅ {check2}

🎯 Matches:
{matches}

[👍 APPROVE]  [✏️ EDIT]  [❌ SKIP]
`,

  tierC: `
⚠️ NEW CANDIDATE - Tier C

👤 {name}
💼 {role}
⭐ {experience} years experience
🏢 {company}
📍 {location}

📊 Quality Score: {score}/100
⚠️ {warning1}
⚠️ {warning2}

🎯 Low priority matches available

[👍 APPROVE]  [✏️ EDIT]  [❌ SKIP]
`,

  draftCard: `
📧 DRAFT for {name}

Subject: {subject}

{body}

[✅ SEND]  [✏️ EDIT]  [🗑️ DISCARD]
`,

  phoneNotification: `
📞 {name} - Direct Call Available

Phone: {phone}

Click to call: tel:{phone}
`,

  editRequest: `
✏️ EDIT MODE - {name}

Current draft shown above.

Reply with:
• Voice note with changes
• Text: "Change [X] to [Y]"
• "Remove [section]"
• "Make it [shorter/longer]"

Or tap [🔄 REGENERATE] to start fresh.
`
};

// Learning patterns from sessions
function analyzePatterns(sessions) {
  const allDecisions = sessions.flatMap(s => s.candidates);
  
  return {
    totalCandidates: allDecisions.length,
    approvalRate: (allDecisions.filter(c => c.decision === 'APPROVE').length / allDecisions.length * 100).toFixed(1) + '%',
    editRate: (allDecisions.filter(c => c.editMade).length / allDecisions.length * 100).toFixed(1) + '%',
    tierAApproval: (allDecisions.filter(c => c.tier === 'A' && c.decision === 'APPROVE').length / 
                   allDecisions.filter(c => c.tier === 'A').length * 100).toFixed(1) + '%',
    tierBApproval: (allDecisions.filter(c => c.tier === 'B' && c.decision === 'APPROVE').length / 
                   allDecisions.filter(c => c.tier === 'B').length * 100).toFixed(1) + '%',
    tierCApproval: (allDecisions.filter(c => c.tier === 'C' && c.decision === 'APPROVE').length / 
                   allDecisions.filter(c => c.tier === 'C').length * 100).toFixed(1) + '%',
    commonEdits: allDecisions.filter(c => c.editMade).map(c => c.editType)
  };
}

module.exports = { mockApprovalSessions, telegramFormats, analyzePatterns };
