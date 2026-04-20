# Cookie Import Guide

How to add authenticated browser access to any website.

## Why Cookies?

Many sites (Twitter, Reddit, LinkedIn, etc.) block automated logins from VPS IPs.
The solution: Harry logs in from his trusted browser, exports cookies, and we import them.

## Step-by-Step Process

### 1. Harry: Export Cookies

**Option A: Using "EditThisCookie" Extension (Easiest)**
1. Install "EditThisCookie" browser extension
2. Go to the target site and log in
3. Click the extension icon → Export → Copy to clipboard
4. Send the JSON to Derrick

**Option B: Using DevTools**
1. Go to the target site and log in
2. Press F12 → Application tab → Cookies → [site domain]
3. For each important cookie, note: name, value, domain
4. Key cookies to look for:
   - Session tokens (often named session, auth, token, etc.)
   - CSRF tokens
   - User ID cookies

### 2. Derrick: Import Cookies

Save cookies to ~/.openclaw/sessions/SITENAME.json in this format:

```json
{
  "storage": {
    "cookies": [
      {
        "name": "session_token",
        "value": "abc123...",
        "domain": ".example.com",
        "path": "/",
        "secure": true,
        "httpOnly": true
      }
    ],
    "origins": []
  }
}
```

### 3. Create Site Script

Copy twitter.mjs as a template and modify for the new site.

## Currently Configured Sites

| Site | Session File | Status |
|------|--------------|--------|
| Twitter/X | ~/.openclaw/sessions/twitter.json | ✅ Active |
| Reddit | ~/.openclaw/sessions/reddit.json | ✅ Active |

## Common Cookie Names by Site

**Twitter/X:**
- auth_token (required)
- ct0 (CSRF token, required)
- twid (user ID)

**Reddit:**
- reddit_session (required)
- token_v2 (required)
- csrf_token
- loid (user ID)

**LinkedIn:**
- li_at (main session)
- JSESSIONID

## Troubleshooting

**Cookies don't work:**
- Make sure domain includes leading dot (e.g., .twitter.com not twitter.com)
- Check if httpOnly and secure flags match the original

**Session expires quickly:**
- Some sites tie sessions to IP; VPS IP differs from Harry's
- May need to re-export cookies periodically

**Site blocks anyway:**
- Try Firefox instead of Chromium
- Add delays between requests
- Some sites simply can't be automated this way
