---
name: urecruit-scorer
description: |
  Scores candidates using Colin's criteria extracted from 166 email analysis.

  Use when:
  - Ghost Mode pipeline needs candidate tier classification (A/B/C/D)
  - Evaluating candidate quality for Paul/Colin review
  - Determining if candidate meets placement thresholds

  Don't use when:
  - Candidate has already been scored in this run
  - Draft is being evaluated for similarity (use ghost-scorer instead)
  - Real-time scoring during Colin's reply (use pattern validation instead)

  Outputs: Tier classification (A/B/C/D), score breakdown, flags
---

# URecruit Candidate Scorer Skill

Scores candidates using Colin's criteria extracted from 166 email analysis.

## Purpose
Evaluate candidate quality and tier them for Paul/Colin review.

## Scoring Model

### Dimensions & Weights

| Dimension | Weight | High Score Criteria |
|-----------|--------|---------------------|
| Experience | 25% | 15+ years |
| Seniority | 25% | Director/Manager/Lead level |
| Sector | 25% | Data center / Construction |
| Company Tier | 10% | Tier 1: DPR, Turner, Skanska, Mace, Laing O'Rourke |
| Stability | 10% | No job hopping (<3 jobs in 5 years) |
| Location | 5% | Europe / Willing to relocate |

### Tier Classification

| Tier | Score | Action |
|------|-------|--------|
| **A** | 80-100 | Hot lead, immediate notification |
| **B** | 60-79 | Good fit, standard presentation |
| **C** | 40-59 | Marginal, lower priority |
| **D** | <40 | Not placeable (Colin would ignore) |

### Company Tier Scoring

**Tier 1 (10 points):** DPR, Turner & Townsend, Skanska, Mace, Laing O'Rourke, Bechtel, AECOM, Jacobs
**Tier 2 (7 points):** Regional major contractors (BAM, Bouygues, Sisk, Dornan, Clune, StructureTone)
**Tier 3 (3 points):** Small/local builders
**Unknown (5 points):** Not in tier list

### Major Client Detection (Relationship Protection)

**Flag if current company matches:**
- Mercury (mercuryeng.com)
- Dornan (dornan.ie)
- Winthrop (winthrop.ie)

**Why:** These are major URecruit clients. Poaching requires careful handling.
**Action:** Warn Paul/Colin — reply defaults to original outreach email (junior persona) to protect relationships.

### Red Flags (Auto-Low Tier)

- Job hopper: 3+ jobs in 5 years
- Sector mismatch: No construction/DC experience
- Junior level: <8 years experience
- Non-European with no relocation

## Usage

```javascript
const { scoreCandidate } = require('./skills/urecruit-scorer/scorer');

const result = await scoreCandidate({
  name: 'John Smith',
  currentRole: 'Senior Project Director',
  experience: 18,
  currentCompany: 'Turner & Townsend',
  previousRoles: [
    { company: 'Turner', role: 'PM', years: 5 },
    { company: 'Skanska', role: 'Director', years: 8 }
  ],
  sector: 'data center construction',
  location: 'Amsterdam',
  emailBody: '...'
});

// Returns:
// {
//   score: 87,
//   tier: 'A',
//   breakdown: { experience: 25, seniority: 23, sector: 20, ... },
//   flags: [],
//   reasoning: 'Strong DC background, 18 years, senior level, stable employment'
// }
```

## Placeholder Candidates (Testing)

```javascript
// Tier A - Colin would prioritize
const tierA_Candidate = {
  name: 'Michael Chen',
  role: 'Project Director',
  experience: 22,
  company: 'DPR Construction',
  history: [
    { company: 'DPR', role: 'PD', years: 6 },
    { company: 'Clune', role: 'PM', years: 9 },
    { company: 'StructureTone', role: 'Senior PM', years: 7 }
  ],
  sector: 'data center',
  location: 'Frankfurt'
};

// Tier B - Good fit
const tierB_Candidate = {
  name: 'Sarah Johnson',
  role: 'Senior Project Manager',
  experience: 12,
  company: 'Skanska',
  history: [
    { company: 'Skanska', role: 'SPM', years: 5 },
    { company: 'Laing ORourke', role: 'PM', years: 7 }
  ],
  sector: 'commercial construction',
  location: 'Dublin'
};

// Tier C - Marginal
const tierC_Candidate = {
  name: 'Tom Wilson',
  role: 'Project Manager',
  experience: 8,
  company: 'Local Builder Ltd',
  history: [
    { company: 'Local Builder', role: 'PM', years: 2 },
    { company: 'Another Local', role: 'Assistant PM', years: 3 },
    { company: 'Third Company', role: 'Coordinator', years: 3 }
  ],
  sector: 'residential',
  location: 'UK'
};

// Tier D - Not placeable (job hopper)
const tierD_Candidate = {
  name: 'Alex Brown',
  role: 'Senior Engineer',
  experience: 10,
  company: 'Recent Startup',
  history: [
    { company: 'Startup', role: 'Engineer', years: 0.5 },
    { company: 'Last Co', role: 'Engineer', years: 1 },
    { company: 'Previous', role: 'Junior', years: 1.5 },
    { company: 'First Job', role: 'Graduate', years: 2 }
  ],
  sector: 'software',
  location: 'US'
};
```

## Integration Points

| System | Direction | Method |
|--------|-----------|--------|
| urecruit-monitor | IN | Function call with email data |
| urecruit-paul-approval | OUT | Score + candidate data |
| memory/bank/urecruit/candidates/ | OUT | Write scored candidate |

## Colin's Patterns (From Analysis)

- **Avg experience (placeable):** 16.8 years
- **Top rejection:** Job hopper (29%), Sector mismatch (24%)
- **Placeable rate:** 63%
- **Focus:** European data center hubs

## Files

- `scorer.js` - Core scoring algorithm
- `extractor.js` - Parse email/CV for candidate data
- `mock-data.js` - Placeholder candidates for testing
- `SKILL.md` - This file

## Status

🟡 **In Development** - Placeholder data active, awaiting Colin validation
