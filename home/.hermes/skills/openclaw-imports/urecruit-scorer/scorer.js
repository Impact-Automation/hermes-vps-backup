/**
 * URecruit Candidate Scorer - scorer.js
 * Scores candidates using Colin's criteria from 166 email analysis
 *
 * Dimensions:
 * - Experience (25%): Years in industry
 * - Seniority (25%): Role level
 * - Sector (25%): Data center / construction fit
 * - Company Tier (10%): Quality of current/past employers
 * - Stability (10%): Job hopping detection
 * - Location (5%): European preference
 */

// Major clients - relationship protection required
const MAJOR_CLIENTS = {
  mercury: ['mercury', 'mercury engineering', 'mercuryeng', 'mercuryeng.com'],
  dornan: ['dornan', 'dornan.ie', 'dornan engineering'],
  winthrop: ['winthrop', 'winthrop.ie', 'winthrop engineering']
};

// Company tier classifications
const COMPANY_TIERS = {
  tier1: [
    'DPR', 'DPR Construction',
    'Turner', 'Turner & Townsend',
    'Skanska',
    'Mace',
    'Laing ORourke', "Laing O'Rourke",
    'Bechtel',
    'AECOM',
    'Jacobs',
    'Multiplex'
  ],
  tier2: [
    'BAM',
    'Bouygues',
    'Sisk', 'John Sisk',
    'Dornan',
    'Clune', 'Clune Construction',
    'StructureTone', 'Structure Tone',
    'Jones Engineering',
    'Knight Frank',
    'Winthrop',
    'Mercury', 'Mercury Engineering'
  ]
};

// Scoring weights (total = 100)
const WEIGHTS = {
  experience: 25,
  seniority: 25,
  sector: 25,
  companyTier: 10,
  stability: 10,
  location: 5
};

// Tier thresholds
const TIER_THRESHOLDS = {
  A: 80,
  B: 60,
  C: 40
};

/**
 * Check if company is a major client (requires relationship protection)
 */
function checkMajorClient(companyName) {
  if (!companyName) return { isMajor: false };

  const normalized = companyName.toLowerCase().trim();

  for (const [client, variations] of Object.entries(MAJOR_CLIENTS)) {
    for (const variation of variations) {
      if (normalized.includes(variation.toLowerCase())) {
        return {
          isMajor: true,
          client: client,
          warning: `Candidate currently at ${client.charAt(0).toUpperCase() + client.slice(1)} — major URecruit client. Poaching requires relationship protection.`
        };
      }
    }
  }

  return { isMajor: false };
}

/**
 * Get company tier
 */
function getCompanyTier(companyName) {
  if (!companyName) return { tier: 'unknown', score: 5 };

  const normalized = companyName.toLowerCase();

  for (const company of COMPANY_TIERS.tier1) {
    if (normalized.includes(company.toLowerCase())) {
      return { tier: 'tier1', score: 10 };
    }
  }

  for (const company of COMPANY_TIERS.tier2) {
    if (normalized.includes(company.toLowerCase())) {
      return { tier: 'tier2', score: 7 };
    }
  }

  // Tier 3 detection: small/local builders
  const tier3Keywords = ['local', 'builder', 'contractor', 'ltd', 'limited'];
  if (tier3Keywords.some(kw => normalized.includes(kw))) {
    return { tier: 'tier3', score: 3 };
  }

  return { tier: 'unknown', score: 5 };
}

/**
 * Score experience (0-25)
 */
function scoreExperience(years) {
  if (!years || years < 0) return { score: 0, note: 'Unknown experience' };

  if (years >= 20) return { score: 25, note: `${years} years - exceptional` };
  if (years >= 15) return { score: 22, note: `${years} years - senior` };
  if (years >= 10) return { score: 18, note: `${years} years - experienced` };
  if (years >= 8) return { score: 12, note: `${years} years - mid-level` };
  if (years >= 5) return { score: 8, note: `${years} years - junior` };

  return { score: 5, note: `${years} years - entry level` };
}

/**
 * Score seniority (0-25)
 */
function scoreSeniority(role) {
  if (!role) return { score: 10, note: 'Unknown role' };

  const normalized = role.toLowerCase();

  // Director level
  if (/director|head of|vp|vice president|principal/i.test(normalized)) {
    return { score: 25, note: 'Director level' };
  }

  // Manager level
  if (/manager|lead|supervisor/i.test(normalized)) {
    return { score: 20, note: 'Manager level' };
  }

  // Senior level
  if (/senior|sr\.|lead/i.test(normalized)) {
    return { score: 17, note: 'Senior level' };
  }

  // Mid level
  if (/engineer|consultant|specialist/i.test(normalized)) {
    return { score: 12, note: 'Mid level' };
  }

  // Junior
  if (/junior|graduate|assistant|trainee/i.test(normalized)) {
    return { score: 5, note: 'Junior level' };
  }

  return { score: 10, note: 'Unknown seniority' };
}

/**
 * Score sector fit (0-25)
 */
function scoreSector(sector, emailBody) {
  const content = ((sector || '') + ' ' + (emailBody || '')).toLowerCase();

  // Data center - perfect fit
  if (/data\s*cent(er|re)|hyperscale|colo|colocation|server farm/i.test(content)) {
    return { score: 25, note: 'Data center background' };
  }

  // Construction - good fit
  if (/construction|building|infrastructure|civil/i.test(content)) {
    if (/commercial|office|retail|residential/i.test(content)) {
      return { score: 18, note: 'Commercial construction' };
    }
    return { score: 22, note: 'Construction background' };
  }

  // Adjacent sectors
  if (/m&e|mechanical|electrical|engineering/i.test(content)) {
    return { score: 15, note: 'M&E/Engineering background' };
  }

  if (/industrial|manufacturing|pharma|life science/i.test(content)) {
    return { score: 12, note: 'Industrial background' };
  }

  // Weak fit
  if (/healthcare|hospital|education|residential/i.test(content)) {
    return { score: 8, note: 'Adjacent sector' };
  }

  // No construction
  if (/software|tech|finance|banking|consulting/i.test(content)) {
    return { score: 0, note: 'Non-construction sector', flag: 'sector_mismatch' };
  }

  return { score: 10, note: 'Unknown sector' };
}

/**
 * Score stability (0-10)
 * Job hopper = 3+ jobs in 5 years
 */
function scoreStability(history) {
  if (!history || history.length === 0) {
    return { score: 5, note: 'Unknown stability' };
  }

  // Count short tenures (< 2 years)
  const shortJobs = history.filter(h => (h.years || 0) < 2).length;
  const totalJobs = history.length;

  // Calculate average tenure
  const totalYears = history.reduce((sum, h) => sum + (h.years || 0), 0);
  const avgTenure = totalYears / totalJobs;

  // Job hopper detection
  if (shortJobs >= 3 || (totalJobs >= 4 && avgTenure < 2)) {
    return { score: 0, note: 'Job hopper detected', flag: 'job_hopper' };
  }

  if (avgTenure >= 5) {
    return { score: 10, note: 'Very stable (5+ yr avg)' };
  }

  if (avgTenure >= 3) {
    return { score: 8, note: 'Stable (3-5 yr avg)' };
  }

  return { score: 5, note: 'Moderate stability' };
}

/**
 * Score location (0-5)
 */
function scoreLocation(location) {
  if (!location) return { score: 3, note: 'Unknown location' };

  const normalized = location.toLowerCase();

  // European data center hubs - perfect
  const euroHubs = ['amsterdam', 'dublin', 'frankfurt', 'london', 'copenhagen', 'paris'];
  if (euroHubs.some(hub => normalized.includes(hub))) {
    return { score: 5, note: 'European DC hub' };
  }

  // Europe - good
  const euroCountries = ['ireland', 'uk', 'germany', 'netherlands', 'denmark', 'sweden', 'france', 'belgium', 'spain', 'portugal'];
  if (euroCountries.some(c => normalized.includes(c)) || /europe/i.test(normalized)) {
    return { score: 5, note: 'European location' };
  }

  // Middle East/Asia (growing markets)
  if (/uae|dubai|singapore|japan|korea/i.test(normalized)) {
    return { score: 3, note: 'Regional market' };
  }

  // US (requires relocation)
  if (/us|usa|america|united states/i.test(normalized)) {
    return { score: 2, note: 'US - relocation needed' };
  }

  return { score: 2, note: 'Non-European' };
}

/**
 * Determine tier from total score
 */
function getTier(score) {
  if (score >= TIER_THRESHOLDS.A) return 'A';
  if (score >= TIER_THRESHOLDS.B) return 'B';
  if (score >= TIER_THRESHOLDS.C) return 'C';
  return 'D';
}

/**
 * Main scoring function
 */
function scoreCandidate(candidate) {
  const flags = [];
  const breakdown = {};

  // Score each dimension
  const expResult = scoreExperience(candidate.experience);
  breakdown.experience = expResult.score;

  const senResult = scoreSeniority(candidate.currentRole || candidate.role);
  breakdown.seniority = senResult.score;

  const sectorResult = scoreSector(candidate.sector, candidate.emailBody);
  breakdown.sector = sectorResult.score;
  if (sectorResult.flag) flags.push(sectorResult.flag);

  const companyResult = getCompanyTier(candidate.currentCompany || candidate.company);
  breakdown.companyTier = companyResult.score;

  const stabilityResult = scoreStability(candidate.history || candidate.previousRoles);
  breakdown.stability = stabilityResult.score;
  if (stabilityResult.flag) flags.push(stabilityResult.flag);

  const locationResult = scoreLocation(candidate.location);
  breakdown.location = locationResult.score;

  // Check major client
  const majorClient = checkMajorClient(candidate.currentCompany || candidate.company);
  if (majorClient.isMajor) {
    flags.push('major_client');
  }

  // Calculate total
  const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const tier = getTier(totalScore);

  // Build reasoning
  const reasoning = [
    expResult.note,
    senResult.note,
    sectorResult.note,
    `Company: ${companyResult.tier}`,
    stabilityResult.note,
    locationResult.note
  ].filter(Boolean).join(', ');

  return {
    score: totalScore,
    tier,
    breakdown,
    flags,
    majorClient,
    reasoning,
    timestamp: new Date().toISOString()
  };
}

/**
 * Parse candidate from email
 */
function parseCandidateFromEmail(email, candidateInfo = {}) {
  const body = email.body || '';
  const subject = email.subject || '';

  // Extract name from email
  const emailAddr = email.from_address || email.from || '';
  const nameMatch = emailAddr.match(/^([^@]+)@/);
  let name = nameMatch ? nameMatch[1].replace(/[._]/g, ' ') : 'Unknown';
  name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Extract experience - prioritize "X years of experience" over generic "X years"
  const expPatterns = [
    /(\d+)\s*(?:\+\s*)?years?\s+(?:of\s+)?(?:experience|exp)/i,           // "12 years of experience", "15+ years experience"
    /(\d+)\s*(?:\+\s*)?years?\s+(?:in\s+)?(?:construction|the industry|data cent)/i,  // "12 years in construction"
    /(?:experience|exp)(?:\s+of)?\s+(\d+)\s*(?:\+\s*)?years?/i,           // "experience of 12 years"
    /(?:total|overall|combined)\s+(?:of\s+)?(\d+)\s*(?:\+\s*)?years?/i,   // "total of 12 years"
    /(\d+)\s*(?:\+\s*)?years?\s+(?:total|overall|combined)/i              // "12 years total"
  ];

  let experience = candidateInfo.experience;
  for (const pattern of expPatterns) {
    const match = body.match(pattern);
    if (match) {
      experience = parseInt(match[1]);
      break;
    }
  }

  // Fallback: generic "X years" only if no specific match found
  if (!experience) {
    const genericMatch = body.match(/(\d+)\s*(?:\+\s*)?years?/i);
    if (genericMatch) {
      experience = parseInt(genericMatch[1]);
    }
  }

  // Extract role
  const rolePatterns = [
    /(?:I am|I'm|currently|work as|working as)\s+(?:a\s+)?([\w\s]+?)(?:\s+at|\s+with|\.|,)/i,
    /(?:as|role of)\s+([\w\s]+?)(?:\s+at|\s+with|\.|,)/i
  ];

  let role = candidateInfo.role;
  for (const pattern of rolePatterns) {
    const match = body.match(pattern);
    if (match) {
      role = match[1].trim();
      break;
    }
  }

  // Extract company
  const companyPatterns = [
    /(?:at|with|for)\s+([A-Z][\w\s&]+?)(?:\.|\,|\s+for|\s+as|$)/,
    /(?:currently at|work at|working at)\s+([A-Z][\w\s&]+)/i
  ];

  let company = candidateInfo.company;
  for (const pattern of companyPatterns) {
    const match = body.match(pattern);
    if (match) {
      company = match[1].trim();
      break;
    }
  }

  // Extract location
  const locationMatch = body.match(/(?:based in|located in|from|in)\s+([A-Z][\w\s,]+?)(?:\.|\,|$)/i);
  const location = locationMatch ? locationMatch[1].trim() : candidateInfo.location;

  return {
    name,
    email: emailAddr,
    experience,
    currentRole: role,
    currentCompany: company,
    location,
    sector: candidateInfo.sector || 'unknown',
    emailBody: body,
    threadId: email.thread_id,
    hasCV: candidateInfo.hasCV || false,
    phone: candidateInfo.phone,
    originalEmail: email
  };
}

// Export
module.exports = {
  scoreCandidate,
  parseCandidateFromEmail,
  checkMajorClient,
  getCompanyTier,
  scoreExperience,
  scoreSeniority,
  scoreSector,
  scoreStability,
  scoreLocation,
  getTier,
  WEIGHTS,
  TIER_THRESHOLDS,
  MAJOR_CLIENTS,
  COMPANY_TIERS
};
