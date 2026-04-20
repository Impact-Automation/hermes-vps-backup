/**
 * Prompt Builder for Draft Generator
 * Constructs training-aware system prompts with Colin exemplars
 */

const fs = require('fs').promises;
const path = require('path');

const PATTERNS_DIR = path.join(__dirname, '../../../memory/bank/urecruit/patterns');
const ANTI_PATTERNS_PATH = path.join(__dirname, '../../../memory/bank/urecruit/colin/anti-patterns.md');

/**
 * Load pattern file for scenario
 */
async function loadPattern(scenarioType) {
  try {
    const patternPath = path.join(PATTERNS_DIR, `${scenarioType}.md`);
    const content = await fs.readFile(patternPath, 'utf8');
    return parsePattern(content);
  } catch (error) {
    console.error(`Failed to load pattern for ${scenarioType}:`, error.message);
    return getDefaultPattern(scenarioType);
  }
}

/**
 * Parse pattern markdown file
 */
function parsePattern(content) {
  const pattern = {
    elements: [],
    structure: '',
    antiPatterns: [],
    wordCount: { min: 40, max: 120 },
    scenario: ''
  };
  
  // Extract scenario name
  const scenarioMatch = content.match(/\*\*Scenario:\*\*\s*(.+)/);
  if (scenarioMatch) pattern.scenario = scenarioMatch[1].trim();
  
  // Extract word count from validation rules section
  const wordCountMatch = content.match(/Word count:\s*(\d+)-(\d+)/i);
  if (wordCountMatch) {
    pattern.wordCount.min = parseInt(wordCountMatch[1]);
    pattern.wordCount.max = parseInt(wordCountMatch[2]);
  }
  
  // Extract key elements
  const elementsMatch = content.match(/## Key Elements[\s\S]*?(?=##|$)/);
  if (elementsMatch) {
    pattern.elements = elementsMatch[0]
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }
  
  // Extract structure
  const structureMatch = content.match(/## Structure[\s\S]*?(?=##|$)/);
  if (structureMatch) {
    pattern.structure = structureMatch[0].replace(/## Structure/, '').trim();
  }
  
  // Extract anti-patterns
  const antiMatch = content.match(/## Anti-Patterns[\s\S]*?(?=##|$)/);
  if (antiMatch) {
    pattern.antiPatterns = antiMatch[0]
      .split('\n')
      .filter(line => line.match(/^- DO NOT/))
      .map(line => line.replace(/^- DO NOT\s*/, '').trim());
  }
  
  return pattern;
}

/**
 * Get default pattern when file not found
 */
function getDefaultPattern(scenarioType) {
  const defaults = {
    'warm-handoff': { wordCount: { min: 80, max: 120 }, elements: ['Authority positioning', 'Company list', 'Soft CV request'] },
    'follow-up': { wordCount: { min: 40, max: 60 }, elements: ['Brief reminder', 'Value add', 'Low commitment CTA'] },
    'rate-discussion': { wordCount: { min: 50, max: 70 }, elements: ['Ask their rate first', 'Never disclose budget'] },
    'cv-received': { wordCount: { min: 50, max: 80 }, elements: ['Acknowledge CV', 'Next steps', 'Schedule call'] },
    'soft-close': { wordCount: { min: 40, max: 60 }, elements: ['Keep door open', 'Future hook'] },
    'phone-request': { wordCount: { min: 30, max: 50 }, elements: ['Direct ask', 'Suggest times'] },
    'info-request': { wordCount: { min: 40, max: 70 }, elements: ['Specific question', 'Why it matters'] }
  };
  
  return defaults[scenarioType] || { wordCount: { min: 50, max: 100 }, elements: [] };
}

/**
 * Load anti-patterns from memory
 */
async function loadAntiPatterns() {
  try {
    const content = await fs.readFile(ANTI_PATTERNS_PATH, 'utf8');
    const universal = [];
    const scenarios = {};
    
    // Extract universal anti-patterns
    const universalMatch = content.match(/## Universal Anti-Patterns[\s\S]*?(?=##|$)/);
    if (universalMatch) {
      const matches = universalMatch[0].match(/^\d+\.\s+(.+)$/gm);
      if (matches) {
        universal.push(...matches.map(m => m.replace(/^\d+\.\s+/, '')));
      }
    }
    
    // Extract scenario-specific anti-patterns
    const scenarioMatch = content.match(/## Scenario-Specific Anti-Patterns[\s\S]*?(?=## Rejection|$)/);
    if (scenarioMatch) {
      const lines = scenarioMatch[0].split('\n');
      let currentScenario = null;
      
      for (const line of lines) {
        const scenarioHeader = line.match(/^###\s+(.+)/);
        if (scenarioHeader) {
          currentScenario = scenarioHeader[1].toLowerCase().replace(/\s+/g, '-');
          scenarios[currentScenario] = [];
        } else if (currentScenario && line.match(/^- DO NOT/)) {
          scenarios[currentScenario].push(line.replace(/^- DO NOT\s*/, ''));
        }
      }
    }
    
    return { universal, scenarios };
  } catch (error) {
    console.error('Failed to load anti-patterns:', error.message);
    return { 
      universal: ['Never use calendar links', 'Never ask rate first', 'Never use Dear Sir/Madam'],
      scenarios: {}
    };
  }
}

/**
 * Format Colin exemplars for few-shot context
 */
function formatExemplars(exemplars) {
  if (!exemplars || exemplars.length === 0) {
    return '(No recent Colin emails available for reference)';
  }
  
  return exemplars.map((ex, i) => `---
EMAIL ${i + 1}:
Subject: ${ex.subject || 'N/A'}
Sent: ${ex.sent_at || 'N/A'}
Body:
${ex.body_plain || ex.body || '(no body)'}
---`).join('\n\n');
}

/**
 * Build the complete system prompt
 */
async function buildSystemPrompt({ scenarioType, exemplars, pattern }) {
  const antiPatterns = await loadAntiPatterns();
  
  const scenarioAntiPatterns = antiPatterns.scenarios[scenarioType] || [];
  const allAntiPatterns = [...antiPatterns.universal, ...scenarioAntiPatterns];
  
  return `You are Colin, Managing Director of URecruit Global's European division.
Your task: Write a candidate outreach email for the "${scenarioType}" scenario.

## YOUR IDENTITY
- You head up recruitment for data center, M&E, and construction roles across Europe
- You work closely with Harry (who may have made initial contact)
- Your tone is warm but authoritative - you're an expert, not a salesperson
- You prefer phone calls over long email threads
- You NEVER use calendar links, never disclose rates first, never say "Dear Sir/Madam"

## SCENARIO: ${scenarioType.toUpperCase()}
${pattern.scenario || 'Write an appropriate email for this scenario.'}

### Key Elements
${pattern.elements.map(e => `- ${e}`).join('\n') || '- Use Colin\'s natural voice'}

### Structure to Follow
${pattern.structure || 'Hi [Name],\n\n[Context]\n\n[Value proposition]\n\n[CTA]\n\nBest,\nColin'}

### Word Count Target
${pattern.wordCount.min}-${pattern.wordCount.max} words (body only, before signature)

## COLIN'S REAL EMAILS (match this style exactly)
${formatExemplars(exemplars)}

## ANTI-PATTERNS (NEVER DO THESE)
${allAntiPatterns.map(a => `- ${a}`).join('\n')}

## OUTPUT FORMAT
Respond with ONLY a JSON object:
{
  "draft": "The email body text...",
  "reasoning": "Brief explanation of why this fits the scenario and Colin's style",
  "confidence": 85
}

Rules:
- Start with "Hi [Name]" - never "Dear"
- End with "Best, Colin" or similar
- No exclamation marks
- No rate/salary disclosure
- No calendar links
- Natural, conversational tone`;
}

/**
 * Build user prompt with candidate context
 */
function buildUserPrompt({ candidateContext, email, scenarioType }) {
  const parts = [];
  
  parts.push(`SCENARIO: ${scenarioType}`);
  
  if (candidateContext) {
    parts.push(`\nCANDIDATE:`);
    parts.push(`- Name: ${candidateContext.candidateName || 'Unknown'}`);
    if (candidateContext.targetRole) parts.push(`- Target Role: ${candidateContext.targetRole}`);
    if (candidateContext.sector) parts.push(`- Sector: ${candidateContext.sector}`);
    if (candidateContext.interestLevel) parts.push(`- Interest Level: ${candidateContext.interestLevel}`);
    if (candidateContext.mlScore) parts.push(`- ML Score: ${candidateContext.mlScore}`);
    
    if (candidateContext.threadHistory && candidateContext.threadHistory.length > 0) {
      parts.push(`\nTHREAD HISTORY:`);
      candidateContext.threadHistory.forEach(msg => {
        parts.push(`${msg.direction?.toUpperCase()}: ${msg.body_snippet?.substring(0, 200) || ''}...`);
      });
    }
  }
  
  if (email) {
    parts.push(`\nINBOUND EMAIL:`);
    parts.push(`Subject: ${email.subject || 'N/A'}`);
    parts.push(`From: ${email.from_email || 'N/A'}`);
    parts.push(`Body:\n${email.body_plain?.substring(0, 500) || '(no body)'}`);
  }
  
  parts.push(`\nNow write the email as Colin. Return only the JSON.`);
  
  return parts.join('\n');
}

module.exports = {
  loadPattern,
  loadAntiPatterns,
  buildSystemPrompt,
  buildUserPrompt,
  formatExemplars
};
