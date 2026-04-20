#!/usr/bin/env node
/**
 * Draft Generator CLI
 * Command-line interface for generating candidate outreach emails
 */

const { generateDraft } = require('./lib/generator');

function parseArgs(args) {
  const result = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key.replace(/-/g, '')] = value || true;
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    console.log(`
Draft Generator - Generate candidate outreach emails in Colin's style

Usage:
  node index.js --candidate-id=<uuid> --scenario=<type> [options]

Required:
  --candidate-id=<uuid>    Candidate ID
  --scenario=<type>        Scenario type (warm-handoff, follow-up, rate-discussion, cv-received, soft-close, phone-request, info-request)

Optional:
  --email-id=<uuid>        Email ID for context
  --exemplars=<json>       JSON array of Colin exemplars
  --verbose                Show detailed output
  --help                   Show this help

Examples:
  node index.js --candidate-id=123 --scenario=follow-up
  node index.js --candidate-id=123 --scenario=warm-handoff --exemplars='[{"subject":"...","body_plain":"..."}]'
`);
    return;
  }
  
  if (!args.candidateid || !args.scenario) {
    console.error('Error: --candidate-id and --scenario are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    // Parse exemplars if provided
    let colinExemplars = null;
    if (args.exemplars) {
      try {
        colinExemplars = JSON.parse(args.exemplars);
      } catch (e) {
        console.error('Error: Invalid JSON in --exemplars');
        process.exit(1);
      }
    }
    
    // Build candidate context from CLI args
    const candidateContext = {
      candidateId: args.candidateid,
      candidateName: args.candidateName || 'Candidate',
      targetRole: args.role || undefined,
      sector: args.sector || undefined
    };
    
    const email = args.emailid ? { id: args.emailid } : undefined;
    
    console.log(`Generating ${args.scenario} draft...`);
    
    const result = await generateDraft({
      candidateContext,
      email,
      scenarioType: args.scenario,
      colinExemplars
    });
    
    if (args.verbose) {
      console.log('\n=== FULL RESULT ===');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n=== DRAFT ===');
      console.log(result.draft);
      console.log('\n=== METADATA ===');
      console.log(`Confidence: ${result.confidence}%`);
      console.log(`Tokens: ${result.tokensUsed}`);
      console.log(`Passed 5 tests: ${result.passed5Tests}`);
      console.log(`Validation ID: ${result.validationId}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
