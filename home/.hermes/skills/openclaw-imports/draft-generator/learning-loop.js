#!/usr/bin/env node
/**
 * Learning Loop Processor
 * Queries pending validations and extracts patterns
 * Run from heartbeat to update training data
 */

const { fetchPendingValidations, markValidationsProcessed } = require('./lib/supabase');
const fs = require('fs').promises;
const path = require('path');

const LEARNING_LOG_PATH = path.join(__dirname, '../../../memory/learning-log.json');

async function runLearningLoop() {
  console.log('[LearningLoop] Starting...');
  
  try {
    // 1. Fetch pending validations
    const validations = await fetchPendingValidations();
    console.log(`[LearningLoop] Found ${validations.length} pending validations`);
    
    if (validations.length === 0) {
      console.log('[LearningLoop] Nothing to process');
      return { processed: 0 };
    }
    
    // 2. Group by scenario and status
    const grouped = groupValidations(validations);
    
    // 3. Extract insights
    const insights = extractInsights(grouped);
    
    // 4. Log to learning log
    await logLearning(validations, insights);
    
    // 5. Mark as processed
    const ids = validations.map(v => v.id);
    await markValidationsProcessed(ids);
    console.log(`[LearningLoop] Marked ${ids.length} as processed`);
    
    return {
      processed: validations.length,
      byScenario: Object.fromEntries(
        Object.entries(grouped).map(([k, v]) => [k, v.length])
      ),
      insights
    };
    
  } catch (error) {
    console.error('[LearningLoop] Error:', error.message);
    throw error;
  }
}

function groupValidations(validations) {
  const grouped = {};
  for (const v of validations) {
    const key = `${v.scenario_type}_${v.validation_status}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  }
  return grouped;
}

function extractInsights(grouped) {
  const insights = [];
  
  // Check for rejection patterns
  const rejected = Object.entries(grouped).filter(([k]) => k.includes('rejected'));
  if (rejected.length > 0) {
    for (const [key, items] of rejected) {
      const reasons = items.map(i => i.rejection_reason).filter(Boolean);
      if (reasons.length > 0) {
        insights.push(`Rejection pattern in ${key}: ${reasons.join(', ')}`);
      }
    }
  }
  
  // Check modification patterns
  const modified = Object.entries(grouped).filter(([k]) => k.includes('modified'));
  if (modified.length > 0) {
    insights.push(`${modified.reduce((sum, [, items]) => sum + items.length, 0)} drafts were modified`);
  }
  
  return insights;
}

async function logLearning(validations, insights) {
  const entry = {
    timestamp: new Date().toISOString(),
    count: validations.length,
    validations: validations.map(v => ({
      id: v.id,
      scenario: v.scenario_type,
      status: v.validation_status,
      score: v.style_match_score,
      rejectionReason: v.rejection_reason
    })),
    insights
  };
  
  try {
    // Append to log file
    let existing = [];
    try {
      const content = await fs.readFile(LEARNING_LOG_PATH, 'utf8');
      existing = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }
    
    existing.push(entry);
    
    // Keep only last 100 entries
    if (existing.length > 100) {
      existing = existing.slice(-100);
    }
    
    await fs.writeFile(LEARNING_LOG_PATH, JSON.stringify(existing, null, 2));
  } catch (error) {
    console.error('[LearningLoop] Failed to write log:', error.message);
  }
}

// CLI mode
if (require.main === module) {
  runLearningLoop()
    .then(result => {
      console.log('Result:', JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runLearningLoop };
