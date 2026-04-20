#!/usr/bin/env node

/**
 * DeepSeek Batch Processor
 * 
 * Process multiple tasks in parallel using DeepSeek API.
 * Cheaper than spawning sub-agents (which fall back to Kimi).
 * 
 * Usage: node deepseek-batch.mjs <tasks-file.json>
 */

const DEEPSEEK_API_KEY = 'sk-70b3df60ca6546ee834791f349901880';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function callDeepSeek(prompt, systemPrompt = null) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 4096,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    cost: ((data.usage.prompt_tokens * 0.28 + data.usage.completion_tokens * 0.42) / 1000000).toFixed(6)
  };
}

async function processBatch(tasks) {
  console.log(`Processing ${tasks.length} tasks with DeepSeek...\n`);
  
  const results = await Promise.all(
    tasks.map(async (task, index) => {
      const startTime = Date.now();
      try {
        const result = await callDeepSeek(task.prompt, task.system);
        return {
          index,
          status: 'success',
          result: result.content,
          tokens: result.usage.total_tokens,
          cost: result.cost,
          time: Date.now() - startTime
        };
      } catch (error) {
        return {
          index,
          status: 'error',
          error: error.message,
          time: Date.now() - startTime
        };
      }
    })
  );
  
  const totalCost = results.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens || 0), 0);
  const successCount = results.filter(r => r.status === 'success').length;
  
  return {
    results,
    summary: {
      total: tasks.length,
      success: successCount,
      failed: tasks.length - successCount,
      totalTokens,
      totalCost: totalCost.toFixed(6)
    }
  };
}

// CLI
const [command, filePath] = process.argv.slice(2);

if (!filePath) {
  console.log(`
DeepSeek Batch Processor

Usage:
  node deepseek-batch.mjs <tasks-file.json>

Tasks file format (JSON):
  [
    {"prompt": "Task 1 description", "system": "Optional system prompt"},
    {"prompt": "Task 2 description"},
    ...
  ]

Example:
  node deepseek-batch.mjs tasks.json > results.json

Cost: $0.28/M input, $0.42/M output (80% cheaper than Kimi K2.5)
  `);
  process.exit(0);
}

import { readFileSync } from 'fs';
const tasks = JSON.parse(readFileSync(filePath, 'utf8'));
const output = await processBatch(tasks);

console.log(JSON.stringify(output, null, 2));
