---
name: draft-generator
description: |
  Generate candidate outreach emails in Colin's style with validation tracking.

  Use when:
  - Gateway requests a draft generation via HTTP API
  - Learning loop needs to generate drafts from exemplars
  - Testing draft quality with validation tracking

  Don't use when:
  - Ghost Mode pipeline is active (use ghost-drafter edge function instead)
  - Direct email drafting needed (use urecruit-drafter skill)
  - Production candidate emails (use Supabase edge functions)

  Outputs: Draft JSON with metadata and validation tracking
---

# Draft Generator Skill

Generate candidate outreach emails in Colin's style with validation tracking.

## Quick Start

```bash
# Generate draft (used by Gateway)
node skills/draft-generator/index.js \
  --candidate-id=uuid \
  --scenario=follow-up \
  --email-id=uuid \
  --exemplars='[{"subject":"...","body_plain":"..."}]'
```

## API (for Gateway integration)

```javascript
const { generateDraft } = require('./skills/draft-generator/lib/generator');

const result = await generateDraft({
  candidateContext: { ... },
  email: { ... },
  scenarioType: 'follow-up',
  colinExemplars: [{ subject, body_plain, sent_at }] // optional - will query if missing
});
// Returns: { draft, reasoning, confidence, tokensUsed, validationId, passed5Tests, testResults }
```

## Architecture

1. **Gateway Handler** (`gateway-handler.js`) - HTTP route handler
2. **Generator** (`lib/generator.js`) - Core generation logic
3. **Supabase Client** (`lib/supabase.js`) - Database queries
4. **Validator** (`lib/validator.js`) - 5-test validation
5. **Prompt Builder** (`lib/prompt-builder.js`) - Training-aware prompts

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `MOONSHOT_API_KEY` - For Kimi K2.5 generation

## Files

- `index.js` - CLI entry point
- `gateway-handler.js` - HTTP handler for Gateway
- `lib/generator.js` - Main generation orchestrator
- `lib/supabase.js` - Database queries
- `lib/validator.js` - 5-test validation
- `lib/prompt-builder.js` - System prompt construction
- `lib/pattern-loader.js` - Pattern file reader
