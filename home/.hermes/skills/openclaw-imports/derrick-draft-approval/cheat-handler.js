#!/usr/bin/env node
/**
 * Cheat Sheet Command Handler
 * 
 * Responds to /cheat command in Telegram with the full Colin style guide
 * 
 * Usage: node cheat-handler.js <chatId>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gnbdjizwcuhwishiusvt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHEAT_SHEET = `# Colin Style Cheat Sheet

*Quick reference for reviewing Ghost Mode drafts*

## CTA Rules by Category

| Category | Primary CTA | Secondary | Notes |
|----------|-------------|-----------|-------|
| **A** (call ready) | Phone request | CV request first | "I'll call you Thursday at 8am" |
| **B** (questions) | Availability ask | Location pivot | "Would you be open to...?" |
| **C** (CV received) | Rate question | Phone request | Ask salary before call |
| **D** (availability) | Availability ask | Role pivot | "What's your availability?" |
| **E** (soft decline) | Keep in touch | Referral ask | No hard sell |

## Tone & Phrasing

**DO:**
- Direct: "I'll call you Thursday"
- Confident: "Let me pencil you in"
- Specific: "8am Thursday" not "soon"

**DON'T:**
- Weak: "Would you mind if I..."
- Vague: "Let's connect soon"
- Passive: "Perhaps we could..."

## Forbidden Patterns

- ❌ Rate/salary with numbers: "£60-70k"
- ❌ Hedging: "If you're interested..."  
- ❌ Generic: "Hope this finds you well"
- ❌ Over-formal: "Please do not hesitate"

## Word Count Targets

| Category | Target | Range |
|----------|--------|-------|
| A | 40-60 | 30-80 |
| B | 50-70 | 40-90 |
| C | 45-65 | 35-85 |
| D | 45-60 | 35-75 |
| E | 50-70 | 40-90 |

## Sign-Off

**Always:** KR (no full "Kind regards")

## Common Successful Edits

1. Add specific time: "Thursday 8am" → "Thursday at 8am your time"
2. Add location pivot: "London roles" → "Milan + Frankfurt roles"
3. Remove rate questions from Category A
4. Add authority handoff: "I've looped in Paul"
`;

async function sendCheatSheet(chatId) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return { success: false, error: 'no_token' };
  }

  // Split into chunks if too long (Telegram max is 4096 chars)
  const chunks = [];
  let currentChunk = '';
  
  for (const line of CHEAT_SHEET.split('\n')) {
    if (currentChunk.length + line.length + 1 > 4000) {
      chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  for (const chunk of chunks) {
    const response = await fetch(\`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
      }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error('Telegram error:', err);
      return { success: false, error: err };
    }
  }

  return { success: true, chunks: chunks.length };
}

// Main
const chatId = process.argv[2];
if (!chatId) {
  console.error('Usage: node cheat-handler.js <chatId>');
  process.exit(1);
}

sendCheatSheet(chatId)
  .then(result => {
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
