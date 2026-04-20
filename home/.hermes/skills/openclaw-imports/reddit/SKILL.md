---
name: reddit
description: |
  Browse, search, post, and moderate Reddit. Requires OAuth for API access.

  Use when:
  - User specifically asks for Reddit content
  - Need to search subreddits for niche discussions
  - Checking r/ for product reviews or user opinions

  Don't use when:
  - General web search would suffice (use web_search)
  - Real-time news needed (Reddit has delay, use web_search)
  - OAuth credentials not configured (use web_search fallback)
  - Posting or commenting without explicit confirmation

  Outputs: Reddit posts, comments, subreddit listings
metadata: {"clawdbot":{"emoji":"📣","requires":{"bins":["node"]}}}
---

# Reddit

Browse, search, post to, and moderate subreddits. **API access requires OAuth** (Reddit now blocks unauthenticated requests). Use web search as a fallback for read-only access.

## Authentication (Required for API Access)

Reddit now requires OAuth authentication for all API access, including read-only operations.

### Option 1: OAuth Setup (Full API Access)

1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app..."
3. Select "script" type
4. Set redirect URI to `http://localhost:8080`
5. Note your client ID (under app name) and client secret
6. Set environment variables:
   ```bash
   export REDDIT_CLIENT_ID="your_client_id"
   export REDDIT_CLIENT_SECRET="your_client_secret"
   export REDDIT_USERNAME="your_username"
   export REDDIT_PASSWORD="your_password"
   ```
7. Run `node {baseDir}/scripts/reddit.mjs login` to authorize

### Option 2: Web Search Fallback (Read-Only)

If you don't have OAuth credentials, use web search to find Reddit content:

```bash
# Search for posts in a subreddit
web_search "site:reddit.com/r/technology cloud cost optimization"

# Search within a specific subreddit
web_search "site:reddit.com/r/wallstreetbets GME" --count 5
```

Or use the fallback script:
```bash
node {baseDir}/scripts/reddit-web-fallback.mjs technology --limit 5
```

## Read Posts (OAuth Required)

**Note:** Reddit now blocks unauthenticated API requests. You must complete OAuth setup above first.

```bash
# Hot posts from a subreddit
node {baseDir}/scripts/reddit.mjs posts wallstreetbets

# New posts
node {baseDir}/scripts/reddit.mjs posts wallstreetbets --sort new

# Top posts (day/week/month/year/all)
node {baseDir}/scripts/reddit.mjs posts wallstreetbets --sort top --time week

# Limit results
node {baseDir}/scripts/reddit.mjs posts wallstreetbets --limit 5
```

**Without OAuth:** Use web search instead - see Option 2 in Authentication section above.

## Search Posts

```bash
# Search within a subreddit
node {baseDir}/scripts/reddit.mjs search wallstreetbets "YOLO"

# Search all of Reddit
node {baseDir}/scripts/reddit.mjs search all "stock picks"
```

## Get Comments on a Post

```bash
# By post ID or full URL
node {baseDir}/scripts/reddit.mjs comments POST_ID
node {baseDir}/scripts/reddit.mjs comments "https://reddit.com/r/subreddit/comments/abc123/..."
```

## Submit a Post (requires auth)

```bash
# Text post
node {baseDir}/scripts/reddit.mjs submit yoursubreddit --title "Weekly Discussion" --text "What's on your mind?"

# Link post
node {baseDir}/scripts/reddit.mjs submit yoursubreddit --title "Great article" --url "https://example.com/article"
```

## Reply to a Post/Comment (requires auth)

```bash
node {baseDir}/scripts/reddit.mjs reply THING_ID "Your reply text here"
```

## Moderation (requires auth + mod permissions)

```bash
# Remove a post/comment
node {baseDir}/scripts/reddit.mjs mod remove THING_ID

# Approve a post/comment
node {baseDir}/scripts/reddit.mjs mod approve THING_ID

# Sticky a post
node {baseDir}/scripts/reddit.mjs mod sticky POST_ID

# Unsticky
node {baseDir}/scripts/reddit.mjs mod unsticky POST_ID

# Lock comments
node {baseDir}/scripts/reddit.mjs mod lock POST_ID

# View modqueue
node {baseDir}/scripts/reddit.mjs mod queue yoursubreddit
```

## Notes

- **OAuth now required for all API access** - Reddit blocks unauthenticated requests with 403 errors
- Use web search fallback for read-only access without OAuth credentials
- Post/mod actions require OAuth - run `login` command once to authorize
- Token stored at `~/.reddit-token.json` (auto-refreshes)
- Rate limits: ~60 requests/minute for OAuth
- Web search has no rate limits but less structured data
