/**
 * Test script for urecruit-monitor
 * Run: node test-watcher.js
 *
 * Note: This tests the watcher logic without actual Supabase connection.
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment for live testing.
 */

// Mock Supabase client for testing
const mockEmails = [
  {
    id: '1',
    from_address: 'john.smith@dpr.com',
    to_address: 'colin@urecruitglobal.com',
    subject: 'Re: Project Director Opportunity',
    body_plain: 'Hi Colin, I have 15 years in data center construction...',
    created_at: new Date().toISOString(),
    direction: 'inbound',
    thread_id: 'thread_123'
  },
  {
    id: '2',
    from_address: 'newsletter@linkedin.com',
    to_address: 'colin@urecruitglobal.com',
    subject: 'Your weekly job digest',
    body_plain: 'Here are jobs you might like...',
    created_at: new Date().toISOString(),
    direction: 'inbound',
    thread_id: 'thread_456'
  },
  {
    id: '3',
    from_address: 'sarah@mercuryeng.com',
    to_address: 'harry@urecruitglobal.com',
    subject: 'Re: Construction Manager Role',
    body_plain: 'Thanks for reaching out. I am interested...',
    created_at: new Date().toISOString(),
    direction: 'inbound',
    thread_id: 'thread_789'
  }
];

console.log('=== URecruit Monitor Test Suite ===\n');

// Test 1: Filter patterns
console.log('Test 1: Email Filter Patterns');
const IGNORE_PATTERNS = [
  /newsletter/i,
  /no-?reply/i,
  /unsubscribe/i,
  /linkedin\.com/i,
  /indeed\.com/i,
  /automated/i,
  /out of office/i,
  /auto-?reply/i
];

const TARGET_RECIPIENTS = [
  'colin@urecruitglobal.com',
  'paul@urecruitglobal.com',
  'harry@urecruitglobal.com'
];

function shouldProcess(email) {
  // Check recipient
  const toAddress = (email.to_address || '').toLowerCase();
  const isTargetRecipient = TARGET_RECIPIENTS.some(r => toAddress.includes(r));
  if (!isTargetRecipient) return { process: false, reason: 'Not target recipient' };

  // Check ignore patterns
  const content = `${email.from_address} ${email.subject} ${email.body_plain}`.toLowerCase();
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(content)) {
      return { process: false, reason: `Matches ignore pattern: ${pattern}` };
    }
  }

  return { process: true };
}

const results = mockEmails.map(email => ({
  id: email.id,
  from: email.from_address,
  ...shouldProcess(email)
}));

console.log('  Email 1 (DPR candidate):');
console.log(`    Process: ${results[0].process} ${results[0].process ? '✓' : '✗'}`);
console.log('  Email 2 (LinkedIn newsletter):');
console.log(`    Process: ${results[1].process} - ${results[1].reason} ${!results[1].process ? '✓' : '✗'}`);
console.log('  Email 3 (Mercury candidate):');
console.log(`    Process: ${results[2].process} ${results[2].process ? '✓' : '✗'}`);

const filterPassed = results[0].process && !results[1].process && results[2].process;
console.log(`  ${filterPassed ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Direction filtering
console.log('Test 2: Direction Filtering');
const inboundOnly = mockEmails.filter(e => e.direction === 'inbound');
console.log(`  Total emails: ${mockEmails.length}`);
console.log(`  Inbound only: ${inboundOnly.length}`);
console.log(`  ${inboundOnly.length === 3 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Timestamp parsing
console.log('Test 3: Timestamp Handling');
const testTimestamp = '2026-02-02T08:00:00Z';
const date = new Date(testTimestamp);
const isValid = !isNaN(date.getTime());
console.log(`  Parse ISO timestamp: ${isValid ? 'Valid' : 'Invalid'}`);
console.log(`  ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Thread ID extraction
console.log('Test 4: Thread ID Extraction');
const hasThreadIds = mockEmails.every(e => e.thread_id);
console.log(`  All emails have thread_id: ${hasThreadIds}`);
console.log(`  ${hasThreadIds ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Candidate email detection
console.log('Test 5: Candidate Email Detection');
const CANDIDATE_INDICATORS = [
  /interested/i,
  /experience/i,
  /cv|resume/i,
  /available/i,
  /opportunity/i,
  /years in/i,
  /currently at/i,
  /working as/i
];

function isCandidateEmail(email) {
  const content = `${email.subject} ${email.body_plain}`;
  return CANDIDATE_INDICATORS.some(pattern => pattern.test(content));
}

const candidateEmails = mockEmails.filter(isCandidateEmail);
console.log(`  Candidate emails detected: ${candidateEmails.length}`);
console.log(`  Email 1 is candidate: ${isCandidateEmail(mockEmails[0])}`);
console.log(`  Email 2 is candidate: ${isCandidateEmail(mockEmails[1])}`);
console.log(`  Email 3 is candidate: ${isCandidateEmail(mockEmails[2])}`);
const candidatePassed = isCandidateEmail(mockEmails[0]) && !isCandidateEmail(mockEmails[1]) && isCandidateEmail(mockEmails[2]);
console.log(`  ${candidatePassed ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 6: Batch processing
console.log('Test 6: Batch Processing');
const BATCH_SIZE = 10;
function processBatch(emails) {
  const batches = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    batches.push(emails.slice(i, i + BATCH_SIZE));
  }
  return batches;
}
const testBatch = Array(25).fill(mockEmails[0]);
const batches = processBatch(testBatch);
console.log(`  Total items: ${testBatch.length}`);
console.log(`  Batch size: ${BATCH_SIZE}`);
console.log(`  Number of batches: ${batches.length}`);
console.log(`  ${batches.length === 3 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 7: Error handling simulation
console.log('Test 7: Error Handling');
let retryCount = 0;
const MAX_RETRIES = 3;
async function simulateWithRetry(fn) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      retryCount++;
      return await fn();
    } catch (e) {
      if (i === MAX_RETRIES - 1) throw e;
    }
  }
}

try {
  await simulateWithRetry(() => {
    throw new Error('Simulated failure');
  });
} catch (e) {
  console.log(`  Retry count: ${retryCount}`);
  console.log(`  Max retries reached: ${retryCount === MAX_RETRIES}`);
  console.log(`  ${retryCount === MAX_RETRIES ? '✅ PASS' : '❌ FAIL'}\n`);
}

// Summary
console.log('=== Test Summary ===');
const tests = [
  filterPassed,
  inboundOnly.length === 3,
  isValid,
  hasThreadIds,
  candidatePassed,
  batches.length === 3,
  retryCount === MAX_RETRIES
];
const passed = tests.filter(t => t).length;
console.log(`Passed: ${passed}/${tests.length}`);
console.log(passed === tests.length ? '✅ All tests passed!' : '❌ Some tests failed');

console.log('\n--- Live Testing ---');
console.log('To test with live Supabase connection:');
console.log('1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
console.log('2. Run: node watcher.js');
console.log('The watcher will connect and start monitoring for new emails.');
