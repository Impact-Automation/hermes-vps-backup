---
name: context-compactor
description: |
  Reduces token usage and maximizes Moonshot cache hits by maintaining rolling summaries.

  Use when:
  - Context exceeds 50K tokens and cache hit rate drops
  - Before heartbeats to optimize token costs
  - Session history has accumulated redundant information

  Don't use when:
  - Context is under 20K tokens (overhead not worth it)
  - Debugging requires full history (use raw logs instead)
  - First run of session (nothing to compact yet)

  Outputs: Compacted context summary, archived full history
---

# Context Compactor

Reduces token usage and maximizes Moonshot cache hits by maintaining rolling summaries instead of full raw history.

## Problem
- Long contexts (200K+) reduce cache hit rates
- Raw history accumulates redundant information
- Each heartbeat includes full file contents that rarely change

## Solution
Maintain a three-tier memory system:
1. **Current State** (50-80K tokens): Working context for immediate operations
2. **Rolling Summary** (10-20K tokens): Condensed history of recent actions
3. **Archive** (full history): Stored in dated memory files, not loaded into context

## Tools

### `compact_context`
Summarizes recent session history and prunes redundant data.

**Parameters:**
- `session_key`: (string) Target session to compact
- `keep_last_n`: (number) Heartbeats to keep in full detail (default: 3)
- `summary_depth`: (string) Detail level - "brief" | "standard" | "detailed"

## Usage
"Compact the context for session agent:main:main"
"Summarize last 5 heartbeats and prune old files"

## Cache Optimization Strategy

### Static Components (High Cache Hit)
- System prompts (SOUL.md, AGENTS.md)
- Tool schemas and signatures
- Task templates and rubrics
- File structure patterns

### Dynamic Components (Cache Miss)
- Current CV being processed
- Candidate-specific details
- Timestamped status updates
- New email content

### Implementation

**Before Each Heartbeat:**
1. Load compact state summary
2. Append current task context
3. Execute agent turn
4. Update rolling summary with results
5. Archive full details to dated file

**Expected Cache Rates:**
- No optimization: ~20-40% cache hits
- With compaction: ~60-80% cache hits
- Cost reduction: 40-60% on input tokens

## Files
- `compact.js`: Core compaction logic
- `TEMPLATE.md`: Rolling summary format
