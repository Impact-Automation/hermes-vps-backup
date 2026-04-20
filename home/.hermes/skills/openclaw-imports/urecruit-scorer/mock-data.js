// Placeholder candidates for testing urecruit-scorer

const placeholderCandidates = {
  // Tier A - Hot lead (Colin would prioritize)
  tierA: {
    name: 'Michael Chen',
    currentRole: 'Project Director',
    experience: 22,
    currentCompany: 'DPR Construction',
    companyTier: 'tier1',
    history: [
      { company: 'DPR Construction', role: 'Project Director', years: 6 },
      { company: 'Clune Construction', role: 'Senior PM', years: 9 },
      { company: 'StructureTone', role: 'PM', years: 7 }
    ],
    sector: 'data center',
    location: 'Frankfurt',
    emailBody: '22 years in construction, last 6 as PD at DPR, hyperscale data centers (Google, Meta projects)',
    attachments: ['CV.pdf'],
    expected: {
      score: 95,
      tier: 'A',
      breakdown: { experience: 25, seniority: 25, sector: 25, companyTier: 10, stability: 10, location: 5 },
      flags: [],
      reasoning: 'Strong DC background, 22 years, senior level, Tier 1 company, stable employment'
    }
  },

  // Tier B - Good fit
  tierB: {
    name: 'Sarah Johnson',
    currentRole: 'Senior Project Manager',
    experience: 12,
    currentCompany: 'Skanska',
    companyTier: 'tier1',
    history: [
      { company: 'Skanska', role: 'Senior PM', years: 5 },
      { company: 'Laing ORourke', role: 'PM', years: 7 }
    ],
    sector: 'commercial construction',
    location: 'Dublin',
    emailBody: '12 years experience, 5 as Senior PM at Skanska, mostly commercial and healthcare',
    attachments: [],
    expected: {
      score: 80,
      tier: 'B',
      breakdown: { experience: 18, seniority: 20, sector: 15, companyTier: 10, stability: 10, location: 5 },
      flags: ['adjacent_sector'],
      reasoning: 'Good experience level, Tier 1 company, adjacent sector, stable employment'
    }
  },

  // Tier C - Marginal
  tierC: {
    name: 'Tom Wilson',
    currentRole: 'Project Manager',
    experience: 8,
    currentCompany: 'Local Builder Ltd',
    companyTier: 'tier3',
    history: [
      { company: 'Local Builder Ltd', role: 'PM', years: 2 },
      { company: 'Another Local', role: 'Assistant PM', years: 3 },
      { company: 'Third Company', role: 'Coordinator', years: 3 }
    ],
    sector: 'residential',
    location: 'UK',
    emailBody: '8 years experience as PM, residential and small commercial projects',
    attachments: [],
    expected: {
      score: 50,
      tier: 'C',
      breakdown: { experience: 12, seniority: 15, sector: 8, companyTier: 3, stability: 10, location: 5 },
      flags: ['limited_sector', 'junior_for_senior', 'tier3_company'],
      reasoning: 'Limited sector experience, junior for senior roles, Tier 3 company, small company background'
    }
  },

  // Tier D - Not placeable (job hopper)
  tierD: {
    name: 'Alex Brown',
    currentRole: 'Senior Engineer',
    experience: 10,
    currentCompany: 'Recent Startup',
    companyTier: 'unknown',
    history: [
      { company: 'Recent Startup', role: 'Engineer', years: 0.5 },
      { company: 'Last Co', role: 'Engineer', years: 1 },
      { company: 'Previous Inc', role: 'Junior Engineer', years: 1.5 },
      { company: 'First Job Ltd', role: 'Graduate Engineer', years: 2 },
      { company: 'Contracting', role: 'Various', years: 5 }
    ],
    sector: 'software',
    location: 'US',
    emailBody: '10 years in software engineering, various projects',
    attachments: ['resume.doc'],
    expected: {
      score: 23,
      tier: 'D',
      breakdown: { experience: 15, seniority: 8, sector: 0, companyTier: 5, stability: 0, location: 0 },
      flags: ['job_hopper', 'sector_mismatch', 'non_european'],
      reasoning: 'Job hopper (5 jobs in 5 years), sector mismatch, non-European location'
    }
  },

  // Edge case - Borderline
  borderline: {
    name: 'David Kumar',
    currentRole: 'Project Manager',
    experience: 14,
    currentCompany: 'Turner & Townsend',
    companyTier: 'tier1',
    history: [
      { company: 'Turner & Townsend', role: 'PM', years: 6 },
      { company: 'Mace', role: 'Senior PE', years: 8 }
    ],
    sector: 'infrastructure',
    location: 'Amsterdam',
    emailBody: '14 years PM experience, infrastructure and transport projects, looking to move into data center',
    attachments: ['CV.pdf'],
    expected: {
      score: 78,
      tier: 'B',
      breakdown: { experience: 22, seniority: 20, sector: 15, companyTier: 10, stability: 10, location: 5 },
      flags: ['sector_adjacent'],
      reasoning: 'Good experience and stability, Tier 1 company, adjacent sector, European location'
    }
  },

  // Major client — requires relationship protection
  majorClient: {
    name: 'James Wilson',
    currentRole: 'Senior Project Manager',
    experience: 16,
    currentCompany: 'Mercury Engineering',
    companyTier: 'tier2',
    history: [
      { company: 'Mercury Engineering', role: 'SPM', years: 4 },
      { company: 'Dornan', role: 'PM', years: 6 },
      { company: 'Local Contractor', role: 'Site Manager', years: 6 }
    ],
    sector: 'data center',
    location: 'Dublin',
    emailBody: '16 years experience, currently Senior PM at Mercury, looking for new DC opportunities',
    attachments: ['CV.pdf'],
    majorClient: {
      isMajor: true,
      client: 'mercury',
      warning: 'Candidate currently at Mercury — major URecruit client. Poaching requires relationship protection.'
    },
    expected: {
      score: 82,
      tier: 'B',
      breakdown: { experience: 25, seniority: 22, sector: 25, companyTier: 7, stability: 8, location: 5 },
      flags: ['major_client', 'recent_major_client'],
      reasoning: 'Strong DC background, 16 years, currently at Mercury — RELATIONSHIP PROTECTION REQUIRED'
    }
  }
};

// Colin's scoring thresholds (from analysis)
// Sector weighted higher (25%) as it's a top rejection reason per Colin's data
const scoringCriteria = {
  experience: {
    weights: { '20+': 25, '15-19': 24, '10-14': 18, '5-9': 12, '<5': 5 }
  },
  seniority: {
    weights: { 'Director': 25, 'Manager': 22, 'Senior': 20, 'Lead': 18, 'Other': 10 }
  },
  sector: {
    weights: { 'data_center': 25, 'construction': 20, 'infrastructure': 15, 'other': 5 }
  },
  companyTier: {
    weights: { 'tier1': 10, 'tier2': 7, 'tier3': 3, 'unknown': 5 }
  },
  stability: {
    weights: { 'stable': 10, 'moderate': 7, 'job_hopper': 0 }
  },
  location: {
    weights: { 'europe': 5, 'uk': 4, 'remote_eu': 3, 'other': 1 }
  }
};

// Major clients — poaching requires relationship protection
const majorClients = {
  mercury: ['mercury', 'mercury engineering', 'mercuryeng', 'mercuryeng.com'],
  dornan: ['dornan', 'dornan.ie', 'dornan engineering'],
  winthrop: ['winthrop', 'winthrop.ie', 'winthrop engineering']
};

function isMajorClient(companyName) {
  if (!companyName) return false;
  const normalized = companyName.toLowerCase();
  
  for (const [client, variations] of Object.entries(majorClients)) {
    for (const variation of variations) {
      if (normalized.includes(variation.toLowerCase())) {
        return { isMajor: true, client: client, variations: variations };
      }
    }
  }
  return { isMajor: false };
}

// Company tier classification
const companyTiers = {
  tier1: ['DPR', 'Turner & Townsend', 'Turner', 'Skanska', 'Mace', 'Laing ORourke', 'Bechtel', 'AECOM', 'Jacobs', 'Multiplex'],
  tier2: ['BAM', 'Bouygues', 'Sisk', 'Dornan', 'Clune', 'StructureTone', 'Clune Construction', 'Jones Engineering', 'Knight Frank', 'Winthrop'],
  tier3: [] // Small/local builders - detected by exclusion
};

function detectJobHopper(history) {
  const recentJobs = history.filter(h => h.years !== undefined);
  const shortJobs = recentJobs.filter(h => h.years < 2).length;
  return shortJobs >= 3;
}

function calculateStability(history) {
  if (detectJobHopper(history)) return 'job_hopper';
  const avgTenure = history.reduce((sum, h) => sum + (h.years || 0), 0) / history.length;
  return avgTenure >= 4 ? 'stable' : 'moderate';
}

function getCompanyTier(companyName) {
  if (!companyName) return 'unknown';
  const normalized = companyName.toLowerCase();
  
  for (const company of companyTiers.tier1) {
    if (normalized.includes(company.toLowerCase())) return 'tier1';
  }
  for (const company of companyTiers.tier2) {
    if (normalized.includes(company.toLowerCase())) return 'tier2';
  }
  
  // Tier 3: Small/local builders (detected by keywords or exclusion)
  const tier3Keywords = ['local', 'ltd', 'limited', 'builder', 'contractor'];
  if (tier3Keywords.some(kw => normalized.includes(kw))) return 'tier3';
  
  return 'unknown';
}

module.exports = { placeholderCandidates, scoringCriteria, companyTiers, majorClients, detectJobHopper, calculateStability, getCompanyTier, isMajorClient };
