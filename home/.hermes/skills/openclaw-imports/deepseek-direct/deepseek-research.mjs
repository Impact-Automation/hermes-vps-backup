#!/usr/bin/env node

/**
 * Web Research with DeepSeek
 * 
 * Search web, summarize results using DeepSeek (cheap).
 * Bypasses broken OpenClaw sub-agent routing.
 * 
 * Usage: node deepseek-research.mjs "<search query>" [--count 5]
 */

const DEEPSEEK_API_KEY = 'sk-70b3df60ca6546ee834791f349901880';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function webSearch(query, count = 5) {
  // Use OpenClaw's web_search tool via exec
  const { execSync } = await import('child_process');
  const result = execSync(
    `cd /home/moltbot/.openclaw/workspace && openclaw web_search "${query}" --count ${count}`,
    { encoding: 'utf8', timeout: 30000 }
  );
  return JSON.parse(result);
}

async function summarizeWithDeepSeek(query, searchResults) {
  const prompt = `Synthesize a comprehensive answer to: "${query}"

Based on these search results:
${JSON.stringify(searchResults, null, 2)}

Provide:
1. Direct answer to the question
2. Key findings from sources
3. Any conflicting information
4. Best sources to reference`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  return {
    summary: data.choices[0].message.content,
    usage: data.usage,
    cost: ((data.usage.prompt_tokens * 0.28 + data.usage.completion_tokens * 0.42) / 1000000).toFixed(6)
  };
}

// CLI
const args = process.argv.slice(2);
const query = args[0];
const countIndex = args.indexOf('--count');
const count = countIndex !== -1 ? parseInt(args[countIndex + 1]) : 5;

if (!query) {
  console.log(`
Web Research with DeepSeek

Usage:
  node deepseek-research.mjs "<search query>" [--count 5]

Examples:
  node deepseek-research.mjs "best VPS hosting 2025"
  node deepseek-research.mjs "OpenClaw model routing" --count 10

Cost: ~$0.001-0.005 per query (80% cheaper than Kimi)
  `);
  process.exit(0);
}

console.log(`Searching: "${query}"...`);
const searchResults = await webSearch(query, count);

console.log(`Found ${searchResults.results?.length || 0} results. Summarizing with DeepSeek...`);
const summary = await summarizeWithDeepSeek(query, searchResults);

console.log('\n=== SUMMARY ===\n');
console.log(summary.summary);
console.log('\n=== META ===');
console.log(`Sources: ${searchResults.results?.length || 0}`);
console.log(`Tokens: ${summary.usage.total_tokens}`);
console.log(`Cost: $${summary.cost}`);
