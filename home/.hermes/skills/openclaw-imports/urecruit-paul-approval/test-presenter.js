/**
 * Test script for urecruit-paul-approval
 * Run: node test-presenter.js
 */

const {
  formatCandidateCard,
  getCandidateButtons,
  formatDraftCard,
  getDraftButtons,
  formatConfirmation,
  getConfirmationButtons,
  checkRateLimit,
  recordSend,
  handleCallback,
  logDecision,
  RATE_LIMITS
} = require('./presenter');

// Wrap in async IIFE to handle async tests
(async () => {
console.log('=== URecruit Paul Approval Test Suite ===\n');

// Test 1: Standard candidate card
console.log('Test 1: Standard Candidate Card');
const candidate1 = {
  name: 'John Smith',
  currentRole: 'Project Director',
  currentCompany: 'Turner Construction',
  location: 'Dublin, Ireland',
  experience: 18,
  email: 'john@example.com'
};
const score1 = {
  tier: 'A',
  score: 85,
  breakdown: { sector: 25, stability: 8, location: 5 },
  flags: [],
  majorClient: { isMajor: false }
};
const card1 = formatCandidateCard(candidate1, score1);
console.log(`  Card contains name: ${card1.includes('John Smith')}`);
console.log(`  Card contains tier: ${card1.includes('Tier A')}`);
console.log(`  Card contains score: ${card1.includes('85/100')}`);
console.log(`  ${card1.includes('John Smith') && card1.includes('Tier A') ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Major client warning
console.log('Test 2: Major Client Warning');
const candidate2 = {
  name: 'Mike O\'Brien',
  currentRole: 'Construction Manager',
  currentCompany: 'Mercury Engineering',
  location: 'Dublin',
  experience: 15,
  email: 'mike@mercury.com'
};
const score2 = {
  tier: 'B',
  score: 72,
  breakdown: { sector: 20, stability: 6, location: 5 },
  flags: ['major_client'],
  majorClient: { isMajor: true, client: 'mercury' }
};
const card2 = formatCandidateCard(candidate2, score2);
console.log(`  Has warning: ${card2.includes('WARNING') || card2.includes('MAJOR CLIENT')}`);
console.log(`  Has protection note: ${card2.includes('Protection') || card2.includes('junior')}`);
console.log(`  ${card2.includes('WARNING') || card2.includes('MAJOR CLIENT') ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Major client buttons
console.log('Test 3: Major Client Buttons');
const buttons1 = getCandidateButtons(candidate1, score1);
const buttons2 = getCandidateButtons(candidate2, score2);
const hasSendJunior = JSON.stringify(buttons2).includes('send_junior');
const hasOverride = JSON.stringify(buttons2).includes('override');
console.log(`  Standard has APPROVE: ${JSON.stringify(buttons1).includes('approve')}`);
console.log(`  Major has SEND AS JUNIOR: ${hasSendJunior}`);
console.log(`  Major has OVERRIDE: ${hasOverride}`);
console.log(`  ${hasSendJunior && hasOverride ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Rate limiting
console.log('Test 4: Rate Limiting');
console.log(`  Hourly max: ${RATE_LIMITS.hourlyMax}`);
console.log(`  Burst max: ${RATE_LIMITS.burstMax}`);
const initialCheck = checkRateLimit('test_director');
console.log(`  Initial check allowed: ${initialCheck.allowed}`);
// Simulate 3 rapid sends
for (let i = 0; i < 3; i++) {
  recordSend('test_director');
}
const burstCheck = checkRateLimit('test_director');
console.log(`  After 3 sends (burst limit): ${!burstCheck.allowed}`);
console.log(`  Reason: ${burstCheck.reason || 'N/A'}`);
console.log(`  ${!burstCheck.allowed ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Draft card formatting
console.log('Test 5: Draft Card Formatting');
const draft = {
  subject: 'John Smith - Project Director Opportunity, Dublin',
  bodyContent: 'Hi John,\n\nHarry has looped me in on your profile...',
  fromEmail: 'colin@urecruitglobal.com'
};
const draftCard = formatDraftCard(draft, candidate1);
console.log(`  Has subject: ${draftCard.includes(draft.subject)}`);
console.log(`  Has body preview: ${draftCard.includes('Harry')}`);
console.log(`  ${draftCard.includes(draft.subject) ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 6: Confirmation message
console.log('Test 6: Confirmation Message');
const confirmation = formatConfirmation(draft, candidate1);
console.log(`  Has name: ${confirmation.includes('John Smith')}`);
console.log(`  Has email: ${confirmation.includes('john@example.com')}`);
console.log(`  ${confirmation.includes('John Smith') ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 7: Callback handling - skip
console.log('Test 7: Callback Handling (skip)');
const skipResult = await handleCallback('skip:candidate_123', { candidate: candidate1 });
console.log(`  Type: ${skipResult.type}`);
console.log(`  Has message: ${!!skipResult.message}`);
console.log(`  ${skipResult.type === 'skipped' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 8: Callback handling - approve (no phone)
console.log('Test 8: Callback Handling (approve no phone)');
const approveResult = await handleCallback('approve:candidate_123', { candidate: candidate1 });
console.log(`  Type: ${approveResult.type}`);
console.log(`  ${approveResult.type === 'generate_draft' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 9: Callback handling - approve (with phone)
console.log('Test 9: Callback Handling (approve with phone)');
const candidateWithPhone = { ...candidate1, phone: '+353 87 123 4567' };
const phoneResult = await handleCallback('approve:candidate_123', { candidate: candidateWithPhone });
console.log(`  Type: ${phoneResult.type}`);
console.log(`  Has phone number: ${phoneResult.message?.includes('+353')}`);
console.log(`  ${phoneResult.type === 'phone_available' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 10: Decision logging
console.log('Test 10: Decision Logging');
const logEntry = logDecision(candidate1, score1, 'approved', false);
console.log(`  Has timestamp: ${!!logEntry.timestamp}`);
console.log(`  Has candidate: ${logEntry.candidate === 'John Smith'}`);
console.log(`  Has decision: ${logEntry.decision === 'approved'}`);
console.log(`  ${logEntry.timestamp && logEntry.decision ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
console.log('=== Test Summary ===');
const tests = [
  card1.includes('John Smith') && card1.includes('Tier A'),
  card2.includes('WARNING') || card2.includes('MAJOR CLIENT'),
  hasSendJunior && hasOverride,
  !burstCheck.allowed,
  draftCard.includes(draft.subject),
  confirmation.includes('John Smith'),
  skipResult.type === 'skipped',
  approveResult.type === 'generate_draft',
  phoneResult.type === 'phone_available',
  logEntry.timestamp && logEntry.decision
];
const passed = tests.filter(t => t).length;
console.log(`Passed: ${passed}/${tests.length}`);
console.log(passed === tests.length ? '✅ All tests passed!' : '❌ Some tests failed');
})();
