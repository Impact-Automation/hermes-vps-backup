#!/usr/bin/env node

import { firefox } from "playwright";
import fs from "fs";
import path from "path";

const REDDIT_SESSION = path.join(process.env.HOME, ".openclaw/sessions/reddit.json");

async function getSubredditPosts(subreddit, sort = "hot", limit = 25) {
  if (!fs.existsSync(REDDIT_SESSION)) {
    return { success: false, error: "Not logged in. Import cookies first." };
  }
  
  const session = JSON.parse(fs.readFileSync(REDDIT_SESSION, "utf8"));
  
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ storageState: session.storage });
  const page = await context.newPage();

  try {
    await page.goto(`https://www.reddit.com/r/${subreddit}/${sort}/`, { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    await page.waitForTimeout(5000);
    
    const posts = await page.evaluate((maxPosts) => {
      const results = [];
      const seen = new Set();
      
      const shredditPosts = document.querySelectorAll("shreddit-post");
      for (const post of shredditPosts) {
        if (results.length >= maxPosts) break;
        const title = post.getAttribute("post-title") || "";
        const url = post.getAttribute("content-href") || post.getAttribute("permalink") || "";
        const score = post.getAttribute("score") || "0";
        const comments = post.getAttribute("comment-count") || "0";
        const author = post.getAttribute("author") || "";
        if (title && !seen.has(url)) {
          seen.add(url);
          results.push({ title, url, score, comments, author });
        }
      }
      
      return results;
    }, limit);

    await browser.close();
    return { success: true, posts, count: posts.length };
  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
}

async function searchReddit(query, limit = 25) {
  if (!fs.existsSync(REDDIT_SESSION)) {
    return { success: false, error: "Not logged in. Import cookies first." };
  }
  
  const session = JSON.parse(fs.readFileSync(REDDIT_SESSION, "utf8"));
  
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ storageState: session.storage });
  const page = await context.newPage();

  try {
    const encodedQuery = encodeURIComponent(query);
    await page.goto(`https://www.reddit.com/search/?q=${encodedQuery}&sort=new`, { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    await page.waitForTimeout(6000);
    
    const posts = await page.evaluate((maxPosts) => {
      const results = [];
      const seen = new Set();
      
      const postLinks = document.querySelectorAll("a[href*='/r/'][href*='/comments/']");
      
      for (const link of postLinks) {
        if (results.length >= maxPosts) break;
        
        const url = link.href;
        if (seen.has(url)) continue;
        
        // Skip game/ad entries
        if (url.includes("entry_point=")) continue;
        
        seen.add(url);
        
        const title = link.textContent.trim();
        // Skip if title is too short or contains newlines (likely garbage)
        if (!title || title.length < 10 || title.includes("\n")) continue;
        
        const match = url.match(/\/r\/([^\/]+)\/comments/);
        const subreddit = match ? "r/" + match[1] : "";
        
        results.push({ title, url, subreddit });
      }
      
      return results;
    }, limit);

    await browser.close();
    return { success: true, posts, count: posts.length };
  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "posts":
    getSubredditPosts(args[0], args[1] || "hot", parseInt(args[2]) || 25)
      .then(r => console.log(JSON.stringify(r, null, 2)));
    break;
  case "search":
    searchReddit(args[0], parseInt(args[1]) || 25)
      .then(r => console.log(JSON.stringify(r, null, 2)));
    break;
  default:
    console.log("Usage: reddit.mjs posts <subreddit> [sort] [limit]");
    console.log("       reddit.mjs search <query> [limit]");
}
