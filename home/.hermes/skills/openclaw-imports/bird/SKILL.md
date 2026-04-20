---
name: bird
description: |
  X/Twitter CLI for reading, searching, and posting via cookies or Sweetistics API.

  Use when:
  - Searching Twitter/X for real-time information
  - Reading specific tweets or threads
  - Checking user's recent posts
  - Monitoring trends or hashtags

  Don't use when:
  - Posting tweets without explicit user confirmation (ask first)
  - Replying to tweets without confirmation
  - Accessing Twitter without authentication (use web_search fallback instead)
  - General web search not specific to Twitter (use web_search)

  Outputs: Tweet content, search results, thread summaries
homepage: https://bird.fast
metadata: {"clawdbot":{"emoji":"🐦","requires":{"bins":["bird"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/bird","bins":["bird"],"label":"Install bird (brew)"}]}}
---

# bird

Use `bird` to read/search X (Twitter) and post tweets/replies.

## Authentication (Required)

Twitter/X requires authentication for all API access. Choose one option:

### Option 1: Sweetistics API (Recommended)

Set environment variable:
```bash
export SWEETISTICS_API_KEY="your_api_key"
```

Then use with `--engine sweetistics`:
```bash
bird search "AI news" -n 5 --engine sweetistics
bird whoami --engine sweetistics
```

### Option 2: Pre-configured Cookie Wrapper (Recommended for Derrick)

A pre-configured wrapper script is available with embedded authentication:

```bash
# Use the wrapper instead of bird directly
bird-x.sh check
bird-x.sh whoami
bird-x.sh search "AI news" -n 5
```

The wrapper is at: `/home/moltbot/.openclaw/workspace/skills/bird/bird-x.sh`

**CRITICAL: Cookie Storage**
The wrapper script contains embedded Twitter cookies (AUTH_TOKEN, CT0). These are stored in:
- Primary: `skills/bird/bird-x.sh` (DO NOT commit to public repos)
- Backup: `~/.config/bird/config.json` (if exists)

The skill WILL NOT WORK without these cookies. If authentication fails, check the wrapper script first.

### Option 3: Manual Browser Cookies

Extract cookies from your local browser (Firefox/Chrome):
- `auth_token` - Twitter authentication token
- `ct0` - CSRF token

Set environment variables:
```bash
export AUTH_TOKEN="your_auth_token"
export CT0="your_ct0_token"
```

Or let bird auto-detect from Firefox/Chrome profiles.

### Option 3: Web Search Fallback (Read-Only)

If you don't have API credentials, use web search:
```bash
web_search "site:twitter.com/x AI announcements" --count 5
web_search "from:elonmusk Tesla" --count 3
```

## Installation

### Install bird CLI

**macOS (Homebrew):**
```bash
brew tap steipete/tap
brew install bird
```

**Linux (Manual):**
```bash
# Download latest release from https://github.com/steipete/bird/releases
curl -L -o bird.tar.gz https://github.com/steipete/bird/releases/latest/download/bird-linux-amd64.tar.gz
tar -xzf bird.tar.gz
sudo mv bird /usr/local/bin/
```

**Verify installation:**
```bash
bird --version
```

## Quick Start

Check authentication:
```bash
# Using pre-configured wrapper (recommended)
bird-x.sh check
bird-x.sh whoami

# Or using bird directly (requires manual auth setup)
bird check
bird whoami
```

Read tweets:
```bash
bird read <url-or-id>
bird thread <url-or-id>
```

Search tweets:
```bash
bird search "query" -n 5
bird search "cost optimization" -n 10 --engine sweetistics
```

## Posting (confirm with user first)

```bash
bird tweet "Your tweet text here"
bird reply <id-or-url> "Your reply"
```

## Auth Sources Priority

1. Sweetistics API (if `SWEETISTICS_API_KEY` set and `--engine sweetistics` used)
2. Environment variables (`AUTH_TOKEN`, `CT0`)
3. Browser cookies (Firefox/Chrome auto-detect)

Check available sources:
```bash
bird check
```

## Notes

- **Authentication required** - Twitter/X blocks unauthenticated requests
- Sweetistics API provides reliable access without managing cookies
- Browser cookies may expire and need periodic refresh
- Web search fallback works for public tweets without authentication
- Rate limits vary by authentication method
