---
name: deepseek-direct
description: |
  Bypass OpenClaw's sub-agent routing to call DeepSeek API directly.

  Use when:
  - Cost-sensitive batch processing (80% cheaper than Kimi)
  - Data gathering, web scraping, research tasks
  - Simple text summarization or formatting
  - Workaround for OpenClaw sub-agent model bug (#6295)

  Don't use when:
  - Complex reasoning or architecture decisions (use Kimi K2.5)
  - Quality-critical content writing (use Kimi K2.5)
  - Coding logic requiring high accuracy (use Kimi or Opus)
  - Image analysis (use Gemini 3 Flash)

  Outputs: DeepSeek API response with token count and cost breakdown
---

# DeepSeek Direct Access

**Purpose:** Bypass OpenClaw's broken sub-agent model routing
**Cost:** $0.28/M input, $0.42/M output (80% cheaper than Kimi K2.5)
**Status:** Working  

---

## Why This Exists

OpenClaw has a bug (GitHub Issue #6295) where:
- `sessions_spawn(model="deepseek/deepseek-chat")` → Ignored
- `agents.defaults.subagents.model` config → Ignored  
- Sub-agents always use main agent's model (Kimi K2.5)

**Workaround:** Call DeepSeek API directly via Node.js scripts.

---

## Available Scripts

### 1. Single Task: `deepseek-task.mjs`

**Usage:**
```bash
cd skills/deepseek-direct
node deepseek-task.mjs "<your task>" [--system "<system prompt>"]
```

**Example:**
```bash
node deepseek-task.mjs "Summarize: OpenAI released GPT-5 today..."
```

**Output:**
- Response text
- Token count
- Cost breakdown

---

### 2. Batch Processing: `deepseek-batch.mjs`

**Usage:**
```bash
node deepseek-batch.mjs <tasks-file.json>
```

**Tasks file format:**
```json
[
  {"prompt": "Task 1 description", "system": "Optional system prompt"},
  {"prompt": "Task 2 description"},
  {"prompt": "Task 3 description"}
]
```

**Example:**
```bash
node deepseek-batch.mjs research-tasks.json > results.json
```

**Benefits:**
- Process multiple tasks in parallel
- 80% cheaper than sub-agents
- Works around OpenClaw bug

---

### 3. Web Research: `deepseek-research.mjs`

**Usage:**
```bash
node deepseek-research.mjs "<search query>" [--count 5]
```

**Example:**
```bash
node deepseek-research.mjs "best VPS hosting 2025" --count 10
```

**How it works:**
1. Uses OpenClaw `web_search` tool
2. Summarizes results with DeepSeek
3. Returns synthesis + sources

---

## Cost Comparison

| Approach | Cost per 1M tokens | Savings |
|----------|-------------------|---------|
| Kimi K2.5 (sub-agents) | $2.00 | Baseline |
| **DeepSeek direct** | **$0.39** | **80%** |

**Real example:**
- Task: "Summarize this text"
- Tokens: 87 (25 in / 62 out)
- Cost: **$0.000033** (effectively free)

---

## When to Use

### Use DeepSeek Direct For:
- ✅ Data gathering
- ✅ Web scraping
- ✅ Text summarization
- ✅ Simple formatting
- ✅ Batch processing
- ✅ Research tasks

### Use Kimi K2.5 (Main Agent) For:
- Complex reasoning
- Architecture decisions
- Content writing
- Coding logic
- Quality checks

### Use Gemini 3 Flash (Free) For:
- Heartbeats
- Image analysis
- Quick checks

---

## Integration with OpenClaw

From OpenClaw, call DeepSeek scripts via `exec`:

```javascript
// From OpenClaw agent
const result = await exec({
  command: 'node skills/deepseek-direct/deepseek-task.mjs "Your task here"'
});
```

Or use the `web_search` + DeepSeek pattern for research:

```javascript
// Search with OpenClaw tool
const search = await web_search({ query: "topic", count: 5 });

// Summarize with DeepSeek
const summary = await exec({
  command: `node skills/deepseek-direct/deepseek-task.mjs "Summarize: ${JSON.stringify(search)}"`
});
```

---

## Testing

**Verify DeepSeek is working:**
```bash
cd skills/deepseek-direct
node deepseek-task.mjs "Say 'DeepSeek is working'"
```

Expected output:
```
✅ SUCCESS

--- RESPONSE ---
DeepSeek is working! I am indeed DeepSeek...

--- META ---
Model: deepseek-chat
Tokens: 87 (25 in / 62 out)
Cost: $0.000033
```

---

## API Key

**Key:** `sk-70b3df60ca6546ee834791f349901880`  
**Status:** Active, tested, working  
**Provider:** DeepSeek (deepseek.com)

---

## Files

| File | Purpose |
|------|---------|
| `deepseek-task.mjs` | Single task execution |
| `deepseek-batch.mjs` | Parallel batch processing |
| `deepseek-research.mjs` | Web search + summarization |
| `SKILL.md` | This documentation |

---

## Notes

- Scripts are standalone - don't rely on OpenClaw model routing
- Direct API calls bypass the bug entirely
- Costs shown in real-time
- Ready for production use

---

**Created:** 2026-02-05  
**Purpose:** Workaround for OpenClaw Issue #6295  
**Status:** Active and working
