/**
 * Test script for urecruit-scorer
 * Run: node test-scorer.js
 */

const { scoreCandidate, parseCandidateFromEmail, checkMajorClient, getTier } = require('./scorer');

console.log('=== URecruit Scorer Test Suite ===\n');

// Test 1: High-quality candidate
console.log('Test 1: High-quality data center candidate');
const highQuality = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  experience: 18,
  currentRole: 'Project Director',
  currentCompany: 'DPR Construction',
  location: 'Dublin, Ireland',
  sector: 'Data Center Construction'
};
const result1 = scoreCandidate(highQuality);
console.log(`  Score: ${result1.score}/100`);
console.log(`  Tier: ${result1.tier}`);
console.log(`  Reasoning: ${result1.reasoning}`);
console.log(`  Expected: Tier A (80+)`);
console.log(`  ${result1.tier === 'A' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Mid-level candidate
console.log('Test 2: Mid-level construction candidate');
const midLevel = {
  name: 'Sarah Johnson',
  email: 'sarah.j@example.com',
  experience: 8,
  currentRole: 'Senior Project Manager',
  currentCompany: 'BAM Construction',
  location: 'Amsterdam, Netherlands',
  sector: 'Commercial Construction'
};
const result2 = scoreCandidate(midLevel);
console.log(`  Score: ${result2.score}/100`);
console.log(`  Tier: ${result2.tier}`);
console.log(`  Reasoning: ${result2.reasoning}`);
console.log(`  Expected: Tier B (60-79)`);
console.log(`  ${result2.tier === 'B' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Major client detection
console.log('Test 3: Major client detection (Mercury)');
const mercuryCandidate = {
  name: 'Mike O\'Brien',
  email: 'mike@mercuryeng.com',
  experience: 15,
  currentRole: 'Construction Manager',
  currentCompany: 'Mercury Engineering',
  location: 'Dublin',
  sector: 'M&E'
};
const result3 = scoreCandidate(mercuryCandidate);
console.log(`  Major Client Detected: ${result3.majorClient.isMajor}`);
console.log(`  Client: ${result3.majorClient.client || 'None'}`);
console.log(`  Flags: ${result3.flags.join(', ')}`);
console.log(`  Expected: isMajor=true, client=mercury`);
console.log(`  ${result3.majorClient.isMajor && result3.majorClient.client === 'mercury' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Job hopper detection
console.log('Test 4: Job hopper detection');
const jobHopper = {
  name: 'Frequent Flyer',
  email: 'hopper@example.com',
  experience: 10,
  currentRole: 'Project Manager',
  currentCompany: 'Some Builder Ltd',
  location: 'London',
  sector: 'Construction',
  history: [
    { company: 'Company A', years: 1 },
    { company: 'Company B', years: 1.5 },
    { company: 'Company C', years: 1 },
    { company: 'Company D', years: 0.5 }
  ]
};
const result4 = scoreCandidate(jobHopper);
console.log(`  Flags: ${result4.flags.join(', ')}`);
console.log(`  Stability Score: ${result4.breakdown.stability}/10`);
console.log(`  Expected: job_hopper flag`);
console.log(`  ${result4.flags.includes('job_hopper') ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Sector mismatch
console.log('Test 5: Sector mismatch (software developer)');
const sectorMismatch = {
  name: 'Tech Person',
  email: 'tech@example.com',
  experience: 12,
  currentRole: 'Software Engineer',
  currentCompany: 'Google',
  location: 'San Francisco',
  sector: 'Software Technology'
};
const result5 = scoreCandidate(sectorMismatch);
console.log(`  Sector Score: ${result5.breakdown.sector}/25`);
console.log(`  Flags: ${result5.flags.join(', ') || 'None'}`);
console.log(`  Tier: ${result5.tier}`);
console.log(`  Expected: sector_mismatch flag, low tier`);
console.log(`  ${result5.flags.includes('sector_mismatch') ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 6: Parse candidate from email
console.log('Test 6: Parse candidate from email body');
const mockEmail = {
  from_address: 'mark.wilson@company.com',
  subject: 'Re: Project Manager Opportunity',
  body: 'Hi Colin,\n\nI am currently working as a Senior Construction Manager at Skanska for the past 5 years. I have 12 years of experience in data center construction. I am based in Frankfurt, Germany.\n\nBest regards,\nMark',
  thread_id: 'thread_123'
};
const parsed = parseCandidateFromEmail(mockEmail);
console.log(`  Parsed Name: ${parsed.name}`);
console.log(`  Parsed Experience: ${parsed.experience}`);
console.log(`  Parsed Location: ${parsed.location}`);
console.log(`  ${parsed.experience === 12 ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
console.log('=== Test Summary ===');
const tests = [result1.tier === 'A', result2.tier === 'B', result3.majorClient.isMajor, result4.flags.includes('job_hopper'), result5.flags.includes('sector_mismatch'), parsed.experience === 12];
const passed = tests.filter(t => t).length;
console.log(`Passed: ${passed}/${tests.length}`);
console.log(passed === tests.length ? '✅ All tests passed!' : '❌ Some tests failed');
