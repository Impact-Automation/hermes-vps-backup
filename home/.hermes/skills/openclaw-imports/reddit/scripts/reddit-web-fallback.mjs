#!/usr/bin/env node

/**
 * Reddit Web Search Fallback
 * 
 * When Reddit's API blocks unauthenticated requests (403 errors),
 * use web search to find Reddit content instead.
 * 
 * Usage: node reddit-web-fallback.mjs <subreddit> [--sort hot|new|top] [--limit N]
 */

async function searchReddit(subreddit, options = {}) {
  const { sort = 'hot', limit = 10, query = '' } = options;
  
  // Build search query
  const searchQuery = query 
    ? `site:reddit.com/r/${subreddit} ${query}`
    : `site:reddit.com/r/${subreddit}`;
  
  try {
    // Call web_search tool via exec (since we're in a Node script)
    const { execSync } = await import('child_process');
    
    const cmd = `openclaw web_search "${searchQuery}" --count ${limit}`;
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
    
    return result;
  } catch (err) {
    return JSON.stringify({
      error: 'Web search failed',
      message: err.message,
      fallback: 'Use web_search tool directly: web_search "site:reddit.com/r/SUBREDDIT topic"'
    }, null, 2);
  }
}

// Simple formatter for web search results
function formatResults(results) {
  if (typeof results === 'string') {
    try {
      results = JSON.parse(results);
    } catch {
      return results;
    }
  }
  
  if (results.error) {
    return `Error: ${results.error}\n${results.message || ''}`;
  }
  
  return results;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const [subreddit, ...rest] = args;
  
  if (!subreddit) {
    console.log(`
Reddit Web Search Fallback

Usage: node reddit-web-fallback.mjs <subreddit> [options]

Options:
  --sort hot|new|top    Sort order (default: hot)
  --limit N             Number of results (default: 10)
  --query "search"      Search within subreddit

Examples:
  node reddit-web-fallback.mjs technology --limit 5
  node reddit-web-fallback.mjs wallstreetbets --query "GME" --limit 3

Note: This uses web search since Reddit API requires OAuth authentication.
To use direct API, set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET env vars.
    `);
    process.exit(0);
  }
  
  // Parse args
  const options = { sort: 'hot', limit: 10, query: '' };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--sort' && rest[i + 1]) options.sort = rest[i++ + 1];
    if (rest[i] === '--limit' && rest[i + 1]) options.limit = parseInt(rest[i++ + 1]);
    if (rest[i] === '--query' && rest[i + 1]) options.query = rest[i++ + 1];
  }
  
  const results = await searchReddit(subreddit, options);
  console.log(formatResults(results));
}

main().catch(console.error);
