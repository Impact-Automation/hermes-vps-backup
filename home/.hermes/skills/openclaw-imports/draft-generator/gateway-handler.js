/**
 * Gateway HTTP Handler for /generate-draft
 * Receives requests from orchestrator and returns draft emails
 * 
 * Expected POST body:
 * {
 *   candidateContext: { candidateId, candidateName, currentStage, targetRole, sector, interestLevel, mlScore, threadHistory },
 *   email: { id, subject, body_plain, from_email, received_at },
 *   scenarioType: 'follow-up',
 *   colinExemplars: [{ id, subject, body_plain, sent_at }] // optional
 * }
 */

const { generateDraft } = require('./lib/generator');

/**
 * HTTP handler for Gateway
 */
async function handleGenerateDraft(req, res) {
  try {
    // Parse request body
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const data = JSON.parse(body);
    
    // Validate required fields
    if (!data.candidateContext) {
      return sendError(res, 400, 'Missing candidateContext');
    }
    if (!data.email) {
      return sendError(res, 400, 'Missing email');
    }
    if (!data.scenarioType) {
      return sendError(res, 400, 'Missing scenarioType');
    }
    
    // Generate draft
    const result = await generateDraft({
      candidateContext: data.candidateContext,
      email: data.email,
      scenarioType: data.scenarioType,
      colinExemplars: data.colinExemplars
    });
    
    // Return response in expected format
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      draft: result.draft,
      reasoning: result.reasoning,
      confidence: result.confidence,
      tokensUsed: result.tokensUsed
    }));
    
  } catch (error) {
    console.error('[Gateway] Generate draft error:', error);
    sendError(res, 500, error.message);
  }
}

function sendError(res, code, message) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

module.exports = { handleGenerateDraft };

// If run directly (for testing)
if (require.main === module) {
  // Test mode - simulate a request
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
    scenarioType: 'follow-up',
    colinExemplars: [
      {
        id: 'ex1',
        subject: 'Re: Data Center PM - Dublin',
        body_plain: 'Hi James, Harry has looped me in to assist...',
        sent_at: '2026-02-05T14:22:00Z'
      }
    ]
  };
  
  console.log('Running test generation...');
  generateDraft(mockRequest).then(result => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Test failed:', err);
  });
}
