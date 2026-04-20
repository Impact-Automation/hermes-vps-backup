#!/usr/bin/env node
/**
 * Standalone HTTP server for /generate-draft endpoint
 * Runs alongside OpenClaw Gateway
 */

const http = require('http');
const { generateDraft } = require('./lib/generator');

const PORT = process.env.DRAFT_GENERATOR_PORT || 18790;
const AUTH_TOKEN = process.env.OPENCLAW_API_KEY || process.env.GATEWAY_AUTH_TOKEN || 'test-token';

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Only handle POST /generate-draft
  if (req.method !== 'POST' || req.url !== '/generate-draft') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  
  // Check auth (skip if no AUTH_TOKEN configured)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (AUTH_TOKEN && AUTH_TOKEN !== 'test-token' && token !== AUTH_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  
  // Parse body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      
      // Validate required fields
      if (!data.candidateContext || !data.email || !data.scenarioType) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: candidateContext, email, scenarioType' }));
        return;
      }
      
      console.log(`[DraftServer] Generating ${data.scenarioType} draft for ${data.candidateContext.candidateName || 'unknown'}`);
      
      // Generate draft
      const result = await generateDraft({
        candidateContext: data.candidateContext,
        email: data.email,
        scenarioType: data.scenarioType,
        colinExemplars: data.colinExemplars || null
      });
      
      // Return response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        draft: result.draft,
        reasoning: result.reasoning,
        confidence: result.confidence,
        tokensUsed: result.tokensUsed
      }));
      
    } catch (error) {
      console.error('[DraftServer] Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[DraftServer] Running on http://127.0.0.1:${PORT}/generate-draft`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[DraftServer] Shutting down...');
  server.close(() => process.exit(0));
});
