---
name: perplexity-search
description: |
  Perplexity web search with Deep Research capabilities.
  
  Use when:
  - Need real-time web search with citations
  - Want Deep Research for comprehensive answers
  - Standard web_search is insufficient
  
  Don't use when:
  - Just need Twitter/X search (use bird skill)
  - Looking for cached/memory results (use memory_search)
  
  Outputs: Search results with citations and sources
homepage: https://perplexity.ai
metadata: {"clawdbot":{"emoji":"🔍"}}
---

# Perplexity Search Skill

Direct access to Perplexity Sonar API for web search with real-time citations.

## Models Available

| Model | Use Case | Cost |
|-------|----------|------|
| `sonar-pro` | Fast search with citations | $3/M in, $15/M out |
| `sonar-deep-research` | Multi-step research | $2/M in, $8/M out |

## Usage

### From OpenClaw

```javascript
// Standard search with citations
const result = await exec({
  command: 'node skills/perplexity-search/search.mjs "your query"'
});

// Deep research
const result = await exec({
  command: 'node skills/perplexity-search/search.mjs "your query" --model sonar-deep-research'
});

// With max results
const result = await exec({
  command: 'node skills/perplexity-search/search.mjs "your query" --max-results 20'
});
```

### From Command Line

```bash
# Quick search
cd skills/perplexity-search
node search.mjs "AI trends in recruitment 2025"

# Deep research
node search.mjs "AI trends in recruitment 2025" --model sonar-deep-research

# More results
node search.mjs "AI trends" --max-results 20
```

## Files

| File | Purpose |
|------|---------|
| `search.mjs` | Main search script |
| `SKILL.md` | Documentation |

## API Key

Uses `PERPLEXITY_API_KEY` from OpenClaw env (already configured).
