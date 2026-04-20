#!/usr/bin/env node

/**
 * Perplexity Search
 * 
 * Direct API access to Perplexity Sonar for web search with citations.
 * 
 * Usage: node search.mjs "<query>" [--model sonar-pro|sonar-deep-research] [--max-results N]
 */

const PERPLEXITY_API_KEY=process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function perplexitySearch(query, options = {}) {
  const model = options.model || 'sonar-pro';
  const maxResults = options.maxResults || 10;
  
  // Timeout: 10 minutes for deep research, 2 minutes for pro
  const timeoutMs = model === 'sonar-deep-research' ? 600000 : 120000;
  
  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful search assistant. Provide concise, factual answers with citations. Include source URLs where relevant.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    max_tokens: model === 'sonar-deep-research' ? 4000 : 2000,
    temperature: 0.2
  };
  
  // Setup timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      query: query,
      model: model,
      content: data.choices[0].message.content,
      citations: data.citations || [],
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
        citation_tokens: data.usage?.citation_tokens || 0,
        search_queries: data.usage?.num_search_queries || 0
      }
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Request timed out after ${timeoutMs / 1000} seconds. Deep research can take several minutes.`,
        query: query,
        model: model
      };
    }
    return {
      success: false,
      error: error.message,
      query: query
    };
  }
}

function formatOutput(result) {
  if (!result.success) {
    return `❌ Search failed: ${result.error}`;
  }
  
  let output = '';
  
  // Content
  output += `## ${result.query}\n\n`;
  output += `${result.content}\n\n`;
  
  // Citations
  if (result.citations && result.citations.length > 0) {
    output += `### Sources\n`;
    result.citations.forEach((cite, i) => {
      output += `${i + 1}. ${cite}\n`;
    });
    output += '\n';
  }
  
  // Usage stats
  output += `---\n`;
  output += `Model: ${result.model}\n`;
  output += `Tokens: ${result.usage.total_tokens} (${result.usage.prompt_tokens} in / ${result.usage.completion_tokens} out)\n`;
  output += `Search queries: ${result.usage.search_queries}\n`;
  
  return output;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Perplexity Search

Usage: node search.mjs "<query>" [options]

Options:
  --model <model>       sonar-pro (default, 2 min timeout) or sonar-deep-research (10 min timeout)
  --max-results <n>     Max search results (default: 10)
  --json                Output raw JSON

Examples:
  node search.mjs "AI recruitment trends 2025"
  node search.mjs "AI recruitment trends 2025" --model sonar-deep-research
  node search.mjs "AI recruitment trends 2025" --json

Note: sonar-deep-research performs 20-30 searches and can take several minutes.
`);
    process.exit(0);
  }
  
  const query = args[0];
  const options = {
    model: 'sonar-pro',
    maxResults: 10
  };
  let outputJson = false;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      options.model = args[i + 1];
      i++;
    } else if (args[i] === '--max-results' && args[i + 1]) {
      options.maxResults = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--json') {
      outputJson = true;
    }
  }
  
  const result = await perplexitySearch(query, options);
  
  if (outputJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatOutput(result));
  }
}

main();
