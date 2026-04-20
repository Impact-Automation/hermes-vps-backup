/**
 * Supabase Client for Draft Generator
 * Handles queries for exemplars and learning loop
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Query Supabase REST API
 */
async function supabaseQuery(table, options = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  
  // Build query params
  if (options.select) url.searchParams.set('select', options.select);
  if (options.order) url.searchParams.set('order', options.order);
  if (options.limit) url.searchParams.set('limit', options.limit);
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      url.searchParams.set(key, value);
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.get(url.toString(), {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Supabase error: ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Supabase query timeout'));
    });
  });
}

/**
 * Update Supabase rows
 */
async function supabaseUpdate(table, match, updates) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  
  // Build match params
  for (const [key, value] of Object.entries(match)) {
    if (Array.isArray(value)) {
      // IN clause
      url.searchParams.set(key, `in.(${value.join(',')})`);
    } else {
      url.searchParams.set(key, `eq.${value}`);
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url.toString(), {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ updated: true });
        } else {
          try {
            const json = JSON.parse(data);
            reject(new Error(`Update error: ${JSON.stringify(json)}`));
          } catch {
            reject(new Error(`Update error: ${res.statusCode}`));
          }
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(updates));
    req.end();
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Supabase update timeout'));
    });
  });
}

/**
 * Insert into Supabase
 */
async function supabaseInsert(table, data) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

  return new Promise((resolve, reject) => {
    const req = https.request(url.toString(), {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Insert error: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Supabase insert timeout'));
    });
  });
}

/**
 * Fetch Colin exemplars from emails table
 * Fallback when colinExemplars not provided in request
 */
async function fetchColinExemplars(limit = 5) {
  try {
    const result = await supabaseQuery('emails', {
      select: 'body_plain,subject,sent_at',
      filters: {
        'from_email': 'like.colin@%',
        'direction': 'eq.outbound'
      },
      order: 'sent_at.desc',
      limit
    });
    return result || [];
  } catch (error) {
    console.error('Failed to fetch Colin exemplars:', error.message);
    return [];
  }
}

/**
 * Fetch pending validations for learning loop
 * Query: validations not yet processed for learning
 */
async function fetchPendingValidations() {
  try {
    const result = await supabaseQuery('derrick_draft_validations', {
      select: '*',
      filters: {
        'validation_status': 'in.(approved,modified,rejected)',
        'processed_for_learning': 'eq.false'
      },
      order: 'validated_at.asc'
    });
    return result || [];
  } catch (error) {
    console.error('Failed to fetch pending validations:', error.message);
    return [];
  }
}

/**
 * Mark validations as processed for learning
 */
async function markValidationsProcessed(ids) {
  if (!ids || ids.length === 0) return { updated: 0 };
  
  try {
    return await supabaseUpdate('derrick_draft_validations', 
      { id: ids },
      { processed_for_learning: true, processed_at: new Date().toISOString() }
    );
  } catch (error) {
    console.error('Failed to mark validations processed:', error.message);
    throw error;
  }
}

/**
 * Log new draft validation to Supabase
 */
async function logValidation(data) {
  try {
    const insertData = {
      scenario_type: data.scenarioType,
      original_draft: data.draft,
      validation_status: 'pending',
      created_at: new Date().toISOString(),
      metadata: {
        reasoning: data.reasoning,
        confidence: data.confidence,
        tokens_used: data.tokensUsed,
        test_results: data.testResults
      },
      model_used: 'kimi-k2.5',
      draft_confidence: data.confidence || 0,
      tokens_used: data.tokensUsed || 0,
      generation_latency_ms: 0
    };
    // Only include fields if they have values (avoid NOT NULL violations)
    if (data.candidateId) insertData.candidate_id = data.candidateId;
    if (data.emailId) insertData.email_id = data.emailId;
    if (data.candidateEmail) insertData.candidate_email = data.candidateEmail;

    const result = await supabaseInsert('derrick_draft_validations', insertData);
    return result[0]?.id || null;
  } catch (error) {
    console.error('Failed to log validation:', error.message);
    return null;
  }
}

module.exports = {
  fetchColinExemplars,
  fetchPendingValidations,
  markValidationsProcessed,
  logValidation,
  supabaseQuery,
  supabaseUpdate,
  supabaseInsert
};
