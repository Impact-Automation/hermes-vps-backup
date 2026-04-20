#!/usr/bin/env node
/**
 * Test script for draft generator
 */

const { generateDraft } = require('./lib/generator');

const mockRequest = {
  candidateContext: {
    candidateId: 'test-uuid',
    candidateName: 'John Smith',
    currentStage: 'cold_outreach_reply',
    targetRole: 'Senior Electrical Engineer',
    sector: 'Data Center',
    interestLevel: 'high',
    mlScore: 78,
    threadHistory: [
      { direction: 'inbound', body_snippet: 'Hi, I saw your message...' },
      { direction: 'outbound', body_snippet: 'Harry has looped me in...' }
    ]
  },
  email: {
    id: 'email-uuid',
    subject: 'Re: Senior Electrical Engineer - Amsterdam',
    body_plain: 'Hi Colin, thanks for reaching out...',
    from_email: 'john@example.com',
    received_at: '2026-02-07T10:30:00Z'
  },
  scenarioType: 'follow-up'
  // No colinExemplars - should query Supabase
};

console.log('=== Testing Draft Generator ===\n');
console.log('Scenario:', mockRequest.scenarioType);
console.log('Candidate:', mockRequest.candidateContext.candidateName);
console.log('Target Role:', mockRequest.candidateContext.targetRole);
console.log('\nGenerating...\n');

generateDraft(mockRequest)
  .then(result => {
    console.log('\n=== RESULT ===');
    console.log('\nDRAFT:');
    console.log(result.draft);
    console.log('\nREASONING:');
    console.log(result.reasoning);
    console.log('\nMETADATA:');
    console.log(`- Confidence: ${result.confidence}%`);
    console.log(`- Tokens Used: ${result.tokensUsed}`);
    console.log(`- Passed 5 Tests: ${result.passed5Tests}`);
    console.log(`- Validation ID: ${result.validationId}`);
    console.log(`- Duration: ${result.duration}ms`);
    console.log('\nTEST RESULTS:');
    console.log(JSON.stringify(result.testResults, null, 2));
  })
  .catch(err => {
    console.error('\nERROR:', err.message);
    console.error(err.stack);
  });
