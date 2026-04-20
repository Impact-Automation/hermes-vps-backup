#!/usr/bin/env node

/**
 * Auto-Compaction Hook
 * Triggers context compaction when thresholds are met
 * 
 * Usage: Add to HEARTBEAT.md or run manually
 * 
 * Thresholds:
 * - Context size > 80K tokens
 * - Heartbeat count > 5 since last compaction
 * - Time since last compaction > 30 minutes
 */

const { compactContext } = require('./compact.js');

const THRESHOLDS = {
  maxContextTokens: 80000,      // Compact when context exceeds this
  maxHeartbeatsSinceCompaction: 5,  // Compact every N heartbeats
  maxTimeSinceCompaction: 30 * 60 * 1000  // 30 minutes
};

async function shouldCompact() {
  const { loadState } = require('./compact.js');
  const state = loadState();
  
  // Check time since last compaction
  if (state.lastCompacted) {
    const timeSince = Date.now() - state.lastCompacted;
    if (timeSince > THRESHOLDS.maxTimeSinceCompaction) {
      console.log('Auto-compact: Time threshold exceeded');
      return true;
    }
  }
  
  // Check heartbeat count
  const heartbeatsSince = (state.heartbeats || []).length - (state.lastHeartbeatCount || 0);
  if (heartbeatsSince >= THRESHOLDS.maxHeartbeatsSinceCompaction) {
    console.log(`Auto-compact: Heartbeat threshold exceeded (${heartbeatsSince} since last)`);
    return true;
  }
  
  // Check context size (rough estimate)
  const contextSize = JSON.stringify(state).length / 4; // ~4 chars per token
  if (contextSize > THRESHOLDS.maxContextTokens) {
    console.log(`Auto-compact: Context size threshold exceeded (${Math.round(contextSize)} tokens)`);
    return true;
  }
  
  return false;
}

async function autoCompact() {
  if (!(await shouldCompact())) {
    console.log('Auto-compact: No compaction needed');
    return { compacted: false };
  }
  
  console.log('Auto-compact: Running compaction...');
  
  const result = await compactContext({
    keepLastN: 3,
    summaryDepth: 'standard'
  });
  
  // Update heartbeat count tracking
  const { loadState, saveState } = require('./compact.js');
  const state = loadState();
  state.lastHeartbeatCount = (state.heartbeats || []).length;
  saveState(state);
  
  return {
    compacted: true,
    ...result
  };
}

// CLI entry point
if (require.main === module) {
  autoCompact().then(result => {
    console.log('\nResult:', result);
    process.exit(result.compacted ? 0 : 0);
  }).catch(err => {
    console.error('Auto-compact failed:', err);
    process.exit(1);
  });
}

module.exports = { autoCompact, shouldCompact, THRESHOLDS };
