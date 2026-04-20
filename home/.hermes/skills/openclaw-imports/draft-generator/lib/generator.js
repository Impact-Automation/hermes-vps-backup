/**
 * Draft Generator Core
 * Orchestrates pattern loading, prompt building, generation, and validation
 */

const https = require('https');
const { 
  loadPattern, 
  buildSystemPrompt, 
  buildUserPrompt 
} = require('./prompt-builder');
const { 
  run5TestValidation, 
  calculateConfidence 
} = require('./validator');
const { 
  fetchColinExemplars, 
  logValidation 
} = require('./supabase');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const USE_GEMINI = process.env.USE_GEMINI === 'true'; // Default to Kimi K2.5 (Gemini opt-in via USE_GEMINI=true)

/**
 * Generate a draft email
 * Main entry point for Gateway integration
 */
async function generateDraft({ 
  candidateContext, 
  email, 
  scenarioType, 
  colinExemplars = null,
  mockMode = false
}) {
  const startTime = Date.now();
  
  // Mock mode for testing (returns immediately without calling API)
  if (mockMode || process.env.DRAFT_MOCK_MODE === 'true') {
    console.log('[DraftGen] MOCK MODE - returning test draft');
    const mockDraft = `Hi ${candidateContext?.candidateName || 'Candidate'},

Harry has looped me in on your profile. Having reviewed your background, this opportunity looks closely aligned with your experience.

Could you kindly drop me a copy of your CV? Then I'll give you a call to discuss.

Best,
Colin`;
    
    return {
      draft: mockDraft,
      reasoning: `Mock ${scenarioType} draft for testing`,
      confidence: 85,
      tokensUsed: 450,
      validationId: 'mock-' + Date.now(),
      passed5Tests: true,
      testResults: { mock: true },
      duration: 10
    };
  }
  
  try {
    // 1. Load pattern for scenario
    console.log(`[DraftGen] Loading pattern for: ${scenarioType}`);
    const pattern = await loadPattern(scenarioType);
    
    // 2. Get Colin exemplars (from request or query Supabase)
    let exemplars = colinExemplars;
    if (!exemplars || exemplars.length === 0) {
      console.log('[DraftGen] No exemplars provided, querying Supabase...');
      exemplars = await fetchColinExemplars(3); // Reduced from 5 to 3 for speed
      console.log(`[DraftGen] Found ${exemplars.length} exemplars`);
    }
    
    // 3. Build prompts
    const systemPrompt = await buildSystemPrompt({ scenarioType, exemplars, pattern });
    const userPrompt = buildUserPrompt({ candidateContext, email, scenarioType });
    
    // 4. Call AI model (Gemini Flash for speed, Kimi for quality if needed)
    let generation;
    if (USE_GEMINI && GEMINI_API_KEY) {
      console.log('[DraftGen] Calling Gemini 3 Flash...');
      generation = await callGemini(systemPrompt, userPrompt);
    } else {
      console.log('[DraftGen] Calling Kimi K2.5...');
      generation = await callKimi(systemPrompt, userPrompt);
    }
    
    // 5. Parse response - strip markdown code fences if present
    let draft, reasoning, rawConfidence;
    let rawContent = (generation.content || '').trim();
    // Kimi K2.5 often wraps responses in ```json ... ``` code fences
    const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
    const fenceMatch = rawContent.match(fenceRegex);
    if (fenceMatch) {
      rawContent = fenceMatch[1].trim();
    }
    try {
      const parsed = JSON.parse(rawContent);
      draft = parsed.draft;
      reasoning = parsed.reasoning;
      rawConfidence = parsed.confidence;
    } catch (e) {
      // Fallback: use raw content as draft text
      draft = rawContent;
      reasoning = 'Generated (parsing fallback)';
      rawConfidence = 50;
    }

    // 6. Run 5-test validation
    console.log('[DraftGen] Running 5-test validation...');
    const validation = run5TestValidation(draft, scenarioType);
    
    // 7. Calculate final confidence
    const confidence = calculateConfidence(validation.tests);
    
    // 8. Log to Supabase
    console.log('[DraftGen] Logging validation...');
    const validationId = await logValidation({
      candidateId: candidateContext?.candidateId,
      emailId: email?.id,
      scenarioType,
      draft,
      reasoning,
      confidence,
      tokensUsed: generation.tokensUsed,
      testResults: validation.tests
    });
    
    const duration = Date.now() - startTime;
    console.log(`[DraftGen] Complete in ${duration}ms, validationId: ${validationId}`);
    
    return {
      draft,
      reasoning,
      confidence,
      tokensUsed: generation.tokensUsed,
      validationId,
      passed5Tests: validation.passed,
      testResults: validation.tests,
      duration
    };
    
  } catch (error) {
    console.error('[DraftGen] Error:', error.message);
    throw error;
  }
}

/**
 * Call Gemini 3 Flash via Google API (FAST - ~2-5s response)
 */
async function callGemini(systemPrompt, userPrompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }
  
  const requestBody = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      responseMimeType: 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    const url = `${GEMINI_BASE_URL}/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Gemini error: ${json.error.message}`));
            return;
          }
          
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const tokensUsed = json.usageMetadata?.totalTokenCount || 0;
          
          resolve({ content, tokensUsed });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(15000, () => { // 15s timeout for Gemini (should be much faster)
      req.destroy();
      reject(new Error('Gemini API timeout (15s)'));
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Call Kimi K2.5 via Moonshot API (SLOWER - ~30-60s for large prompts)
 */
async function callKimi(systemPrompt, userPrompt) {
  const https = require('https');
  const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
  const MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1';
  
  if (!MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY not set');
  }
  
  const requestBody = {
    model: 'kimi-k2.5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 1,
    max_tokens: 2000
  };
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    
    const req = https.request(`${MOONSHOT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Kimi error: ${json.error.message}`));
            return;
          }
          
          const content = json.choices?.[0]?.message?.content || '';
          const tokensUsed = json.usage?.total_tokens || 0;
          
          resolve({ content, tokensUsed });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Kimi API timeout (60s)'));
    });
    
    req.write(postData);
    req.end();
  });
}

module.exports = {
  generateDraft
};
