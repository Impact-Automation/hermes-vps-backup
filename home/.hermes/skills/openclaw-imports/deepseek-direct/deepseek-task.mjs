#!/usr/bin/env node

/**
 * DeepSeek Direct API Caller
 * 
 * Bypasses OpenClaw's broken sub-agent model routing.
 * Calls DeepSeek API directly for cheap inference.
 * 
 * Usage: node deepseek-task.mjs "<task description>" [--system "<system prompt>"]
 */

const DEEPSEEK_API_KEY = 'sk-70b3df60ca6546ee834791f349901880';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function callDeepSeek(userPrompt, systemPrompt = null) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: userPrompt });
  
  const requestBody = {
    model: 'deepseek-chat',
    messages: messages,
    max_tokens: 4096,
    temperature: 0.7
  };
  
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      cost: {
        input: (data.usage.prompt_tokens * 0.28 / 1000000).toFixed(6),
        output: (data.usage.completion_tokens * 0.42 / 1000000).toFixed(6),
        total: ((data.usage.prompt_tokens * 0.28 + data.usage.completion_tokens * 0.42) / 1000000).toFixed(6)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI
const args = process.argv.slice(2);
const task = args[0];
const systemIndex = args.indexOf('--system');
const systemPrompt = systemIndex !== -1 ? args[systemIndex + 1] : null;

if (!task) {
  console.log(`
DeepSeek Direct API Caller

Usage:
  node deepseek-task.mjs "<task description>" [--system "<system prompt>"]

Examples:
  node deepseek-task.mjs "Summarize this text: ..."
  node deepseek-task.mjs "Extract data from: ..." --system "You are a data extraction assistant"

Cost: $0.28/M input, $0.42/M output (80% cheaper than Kimi K2.5)
  `);
  process.exit(0);
}

console.log('Calling DeepSeek API...');
const result = await callDeepSeek(task, systemPrompt);

if (result.success) {
  console.log('\n✅ SUCCESS');
  console.log('\n--- RESPONSE ---');
  console.log(result.content);
  console.log('\n--- META ---');
  console.log(`Model: ${result.model}`);
  console.log(`Tokens: ${result.usage.total_tokens} (${result.usage.prompt_tokens} in / ${result.usage.completion_tokens} out)`);
  console.log(`Cost: $${result.cost.total} ($${result.cost.input} in / $${result.cost.output} out)`);
} else {
  console.log('\n❌ FAILED');
  console.log(`Error: ${result.error}`);
  process.exit(1);
}
