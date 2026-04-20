/**
 * Test script for urecruit-drafter
 * Run: node test-generator.js
 */

const { generateDraft, autoDraft, selectTemplate, validateDraft, TEMPLATES, formatClientList } = require('./generator');

console.log('=== URecruit Drafter Test Suite ===\n');

// Test 1: Initial interest template
console.log('Test 1: Initial Interest Response');
const candidate1 = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  currentRole: 'Senior Project Manager',
  currentCompany: 'Turner Construction',
  location: 'Amsterdam'
};
const draft1 = generateDraft({
  template: 'initial-interest',
  candidate: candidate1,
  role: { title: 'Project Director', location: 'Dublin' }
});
console.log(`  Subject: ${draft1.subject}`);
console.log(`  Word count: ${draft1.validation.wordCount}`);
console.log(`  Valid: ${draft1.validation.valid}`);
console.log(`  Failed tests: ${draft1.validation.failedTests.join(', ') || 'None'}`);
console.log(`  ${draft1.validation.valid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: CV received template
console.log('Test 2: CV Received Response');
const candidate2 = {
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
  currentRole: 'Construction Manager',
  currentCompany: 'BAM',
  originalSubject: 'Re: Project Director Opportunity, Dublin'
};
const draft2 = generateDraft({
  template: 'cv-received',
  candidate: candidate2
});
console.log(`  Subject: ${draft2.subject}`);
console.log(`  Mentions sector: ${draft2.bodyContent.includes('work')}`);
console.log(`  Has CTA: ${draft2.validation.tests.has_cta}`);
console.log(`  ${draft2.validation.tests.has_cta ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Auto template selection
console.log('Test 3: Auto Template Selection');
const testCases = [
  { context: 'CV attached', expected: 'cv-received' },
  { context: 'What is the day rate?', expected: 'rate-discussion' },
  { context: 'Just following up', expected: 'follow-up' },
  { context: 'Can we schedule a call?', expected: 'meeting-setup' },
  { context: 'Initial outreach', expected: 'initial-interest' },
  { context: 'Can you give me more details?', expected: 'info-request' }
];
let autoTestsPassed = 0;
testCases.forEach(tc => {
  const selected = selectTemplate({}, tc.context);
  const pass = selected === tc.expected;
  console.log(`  "${tc.context}" => ${selected} (expected: ${tc.expected}) ${pass ? '✓' : '✗'}`);
  if (pass) autoTestsPassed++;
});
console.log(`  ${autoTestsPassed === testCases.length ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Signature integration
console.log('Test 4: Signature Integration');
const draft4 = generateDraft({
  template: 'cv-request',
  candidate: { name: 'Test User', email: 'test@example.com' },
  fromEmail: 'colin@urecruitglobal.com'
});
console.log(`  Has signature: ${draft4.fullBody.includes('Colin') || draft4.fullBody.includes('URecruit')}`);
console.log(`  Body != Full body: ${draft4.bodyContent !== draft4.fullBody}`);
console.log(`  ${draft4.fullBody.length > draft4.bodyContent.length ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: No placeholder text
console.log('Test 5: No Placeholder Text Remaining');
const candidate5 = {
  name: 'Complete User',
  email: 'complete@example.com',
  currentRole: 'Director',
  currentCompany: 'Big Corp',
  location: 'London'
};
const draft5 = generateDraft({
  template: 'initial-interest',
  candidate: candidate5,
  role: { title: 'Senior PM', location: 'Dublin' }
});
const hasPlaceholders = /\{[a-zA-Z]+\}/.test(draft5.subject) || /\{[a-zA-Z]+\}/.test(draft5.bodyContent);
console.log(`  Subject: ${draft5.subject}`);
console.log(`  Has placeholders: ${hasPlaceholders}`);
console.log(`  ${!hasPlaceholders ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 6: Client list formatting
console.log('Test 6: Client List Formatting');
const clientList = formatClientList();
console.log(`  Clients formatted: ${clientList.split('\n').length} entries`);
console.log(`  Has Winthrop: ${clientList.includes('Winthrop')}`);
console.log(`  Has locations: ${clientList.includes('Dublin')}`);
console.log(`  ${clientList.includes('Winthrop') && clientList.includes('Dublin') ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 7: Validation rules
console.log('Test 7: Validation Rules');
const testDraft = {
  template: 'initial-interest',
  subject: 'John Smith - Project Director, Dublin',
  bodyContent: 'Hi John, I\'m heading up recruitment for data center opportunities with our European clients. We\'re currently working with several major contractors across Dublin, Amsterdam, and Frankfurt. Having seen your background, this could be a strong fit. Could you kindly drop me a copy of your CV? Then I\'ll give you a call to discuss.'
};
const validation = validateDraft(testDraft);
console.log(`  Length OK: ${validation.tests.length}`);
console.log(`  Subject format OK: ${validation.tests.subject_format}`);
console.log(`  Authority OK: ${validation.tests.authority}`);
console.log(`  No placeholders: ${validation.tests.no_placeholders}`);
console.log(`  Has CTA: ${validation.tests.has_cta}`);
console.log(`  ${validation.valid ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
console.log('=== Test Summary ===');
const tests = [
  draft1.validation.valid,
  draft2.validation.tests.has_cta,
  autoTestsPassed === testCases.length,
  draft4.fullBody.length > draft4.bodyContent.length,
  !hasPlaceholders,
  clientList.includes('Winthrop'),
  validation.valid
];
const passed = tests.filter(t => t).length;
console.log(`Passed: ${passed}/${tests.length}`);
console.log(passed === tests.length ? '✅ All tests passed!' : '❌ Some tests failed');
