---
name: browser-automation
description: |
  Browser automation for Twitter, Reddit, and web scraping using Playwright.

  Use when:
  - Website requires JavaScript/interaction to access content
  - Need to scrape dynamic content not in static HTML
  - Accessing Twitter/X when bird skill is unavailable
  - Automating form submissions or clicks

  Don't use when:
  - Simple static page fetch (use web_fetch instead - faster)
  - API is available (use API directly)
  - Content is behind login and credentials not available
  - Rate limits or bot detection likely (use API or search instead)

  Outputs: Scraped content, screenshots, downloaded files
version: 1.0.0
author: Claude + Harry
requires:
  bins: ["node"]
  packages: ["playwright"]
---

# Browser Automation Skill

Automated browser access to Twitter/X, Reddit, and general web scraping using Playwright with Firefox.

## Quick Start

```bash
cd /home/moltbot/.openclaw/workspace/skills/browser-automation/scripts

# Twitter
node twitter.mjs tweets elonmusk 10
node twitter.mjs search "AI agents" 20

# Reddit
node reddit.mjs posts technology hot 10
node reddit.mjs search "machine learning" 15

# General browser
node browser.mjs screenshot https://example.com /tmp/shot.png
node browser.mjs extract https://news.ycombinator.com ".titleline>a"
```

## Commands

### Twitter/X

| Command | Description |
|---------|-------------|
| `node twitter.mjs tweets <username> [count]` | Get recent tweets from a user |
| `node twitter.mjs search "<query>" [count]` | Search tweets |

### Reddit

| Command | Description |
|---------|-------------|
| `node reddit.mjs posts <subreddit> [hot|new|top] [limit]` | Get posts from subreddit |
| `node reddit.mjs search "<query>" [limit]` | Search all of Reddit |

### General Browser

| Command | Description |
|---------|-------------|
| `node browser.mjs screenshot <url> <output.png>` | Take full-page screenshot |
| `node browser.mjs extract <url> "<selector>"` | Extract data by CSS selector |
| `node browser.mjs navigate <url>` | Get page content |

## Session Management

Sessions are stored in ~/.openclaw/sessions/:
- twitter.json - Twitter/X auth cookies
- reddit.json - Reddit auth cookies

### Session Expiry
- **Twitter**: Sessions last ~1 year but may expire sooner if account security changes
- **Reddit**: Sessions last ~6 months

### Refreshing Sessions
If authentication fails, Harry needs to export fresh cookies from his browser and reimport them.
See COOKIE_IMPORT.md for instructions.

## Adding New Sites

To add browser automation for a new site:

1. **Harry exports cookies** from his browser while logged into the site
2. **Create session file** at ~/.openclaw/sessions/SITENAME.json
3. **Create script** at scripts/SITENAME.mjs following the pattern of twitter.mjs/reddit.mjs
4. **Test** with Firefox (more reliable than Chromium for avoiding bot detection)

See COOKIE_IMPORT.md for detailed instructions.

## Technical Notes

- Uses **Firefox** via Playwright (bypasses more anti-bot measures than Chromium)
- Sessions use Playwright's storageState format
- All scripts are ES modules (.mjs)
- Headless mode by default

## Troubleshooting

**"Not logged in" error:**
- Session cookies may have expired
- Ask Harry to export fresh cookies

**Empty results:**
- Site may have changed HTML structure
- Check with screenshot: node browser.mjs screenshot <url> /tmp/debug.png

**Timeout errors:**
- Site may be blocking the VPS IP
- Try again later or use cookie import method

## File Structure

```
skills/browser-automation/
├── SKILL.md              # This file
├── COOKIE_IMPORT.md      # How to import cookies
└── scripts/
    ├── browser.mjs       # General browser automation
    ├── twitter.mjs       # Twitter/X specific
    └── reddit.mjs        # Reddit specific
```
