#!/usr/bin/env node

/**
 * Context Compactor for Moonshot Cache Optimization
 * Reduces token usage by maintaining rolling summaries instead of full raw history
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/home/moltbot/.openclaw/workspace';
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const STATE_FILE = path.join(WORKSPACE, 'state', 'rolling-summary.json');

// Ensure directories exist
[MEMORY_DIR, path.dirname(STATE_FILE)].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Main compaction function
 */
async function compactContext(options = {}) {
  const {
    sessionKey = 'agent:main:main',
    keepLastN = 3,
    summaryDepth = 'standard'
  } = options;

  console.log(`Compacting context for ${sessionKey}...`);
  
  // 1. Load current state
  const state = loadState();
  
  // 2. Archive old detailed history
  await archiveHistory(state, sessionKey);
  
  // 3. Generate new rolling summary
  const summary = generateSummary(state, keepLastN, summaryDepth);
  
  // 4. Save compact state
  saveState({
    ...state,
    lastCompacted: Date.now(),
    summary,
    sessionKey
  });
  
  // 5. Calculate savings
  const originalTokens = estimateTokens(JSON.stringify(state));
  const compactTokens = estimateTokens(JSON.stringify(summary));
  const savings = ((originalTokens - compactTokens) / originalTokens * 100).toFixed(1);
  
  console.log(`✓ Compaction complete`);
  console.log(`  Original: ~${originalTokens} tokens`);
  console.log(`  Compact:  ~${compactTokens} tokens`);
  console.log(`  Savings:  ${savings}%`);
  
  return {
    success: true,
    originalTokens,
    compactTokens,
    savings: parseFloat(savings)
  };
}

/**
 * Load current state from disk
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading state:', e.message);
  }
  
  // Default empty state
  return {
    created: Date.now(),
    heartbeats: [],
    summary: null
  };
}

/**
 * Save state to disk
 */
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Archive detailed history to dated file
 */
async function archiveHistory(state, sessionKey) {
  if (!state.heartbeats || state.heartbeats.length === 0) return;
  
  const date = new Date().toISOString().split('T')[0];
  const archiveFile = path.join(MEMORY_DIR, `compaction-${date}.json`);
  
  const archive = {
    archivedAt: Date.now(),
    sessionKey,
    heartbeats: state.heartbeats
  };
  
  // Append to existing archive or create new
  let existing = [];
  if (fs.existsSync(archiveFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
      if (!Array.isArray(existing)) existing = [existing];
    } catch (e) {
      existing = [];
    }
  }
  
  existing.push(archive);
  fs.writeFileSync(archiveFile, JSON.stringify(existing, null, 2));
  
  console.log(`  Archived ${state.heartbeats.length} heartbeats to ${archiveFile}`);
}

/**
 * Generate condensed summary of recent activity
 */
function generateSummary(state, keepLastN, depth) {
  const heartbeats = state.heartbeats || [];
  const recent = heartbeats.slice(-keepLastN);
  const older = heartbeats.slice(0, -keepLastN);
  
  // Summarize older heartbeats
  const historicalSummary = older.length > 0 ? {
    totalOlderHeartbeats: older.length,
    timeSpan: {
      first: older[0]?.timestamp,
      last: older[older.length - 1]?.timestamp
    },
    actions: summarizeActions(older, depth),
    filesAccessed: [...new Set(older.flatMap(h => h.filesAccessed || []))],
    candidatesProcessed: older.filter(h => h.candidateId).length,
    emailsDrafted: older.filter(h => h.emailDrafted).length
  } : null;
  
  // Keep recent in full detail
  return {
    generatedAt: Date.now(),
    historicalSummary,
    recentHeartbeats: recent.map(h => ({
      timestamp: h.timestamp,
      actions: h.actions,
      filesWritten: h.filesWritten,
      candidatesProcessed: h.candidatesProcessed,
      status: h.status
    })),
    currentQueue: state.currentQueue || [],
    lastCheckpoint: state.lastCheckpoint
  };
}

/**
 * Summarize actions from multiple heartbeats
 */
function summarizeActions(heartbeats, depth) {
  const actionCounts = {};
  const uniqueFiles = new Set();
  
  heartbeats.forEach(hb => {
    (hb.actions || []).forEach(action => {
      const type = action.type || 'unknown';
      actionCounts[type] = (actionCounts[type] || 0) + 1;
    });
    
    (hb.filesAccessed || []).forEach(f => uniqueFiles.add(f));
  });
  
  if (depth === 'brief') {
    return {
      actionTypes: Object.keys(actionCounts),
      totalActions: Object.values(actionCounts).reduce((a, b) => a + b, 0)
    };
  }
  
  return {
    actionCounts,
    filesAccessed: [...uniqueFiles].slice(0, 20), // Top 20 files
    totalHeartbeats: heartbeats.length
  };
}

/**
 * Rough token estimation (4 chars ≈ 1 token)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    sessionKey: args.find(a => a.startsWith('--session='))?.split('=')[1] || 'agent:main:main',
    keepLastN: parseInt(args.find(a => a.startsWith('--keep='))?.split('=')[1]) || 3,
    summaryDepth: args.find(a => a.startsWith('--depth='))?.split('=')[1] || 'standard'
  };
  
  compactContext(options).catch(console.error);
}

module.exports = { compactContext, loadState, saveState };
