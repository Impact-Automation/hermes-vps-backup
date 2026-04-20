#!/usr/bin/env node

import { firefox } from "playwright";
import fs from "fs";
import path from "path";

const TWITTER_SESSION = path.join(process.env.HOME, ".openclaw/sessions/twitter.json");

async function loginTwitter(username, password, email) {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US"
  });
  const page = await context.newPage();

  try {
    console.log("Navigating to Twitter login...");
    await page.goto("https://twitter.com/i/flow/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log("Filling username...");
    await page.waitForSelector("input[autocomplete=\"username\"], input[name=\"text\"]", { timeout: 15000 });
    await page.fill("input[autocomplete=\"username\"], input[name=\"text\"]", username);
    
    console.log("Clicking Next...");
    await page.click("button:has-text(\"Next\"), div[role=\"button\"]:has-text(\"Next\")");
    await page.waitForTimeout(3000);
    
    // Handle email/phone verification if prompted
    const hasEmailVerify = await page.$("input[data-testid=\"ocfEnterTextTextInput\"]");
    if (hasEmailVerify && email) {
      console.log("Email verification required...");
      await page.fill("input[data-testid=\"ocfEnterTextTextInput\"]", email);
      await page.click("button:has-text(\"Next\"), div[role=\"button\"]:has-text(\"Next\")");
      await page.waitForTimeout(3000);
    }
    
    console.log("Filling password...");
    await page.waitForSelector("input[name=\"password\"], input[type=\"password\"]", { timeout: 15000 });
    await page.fill("input[name=\"password\"], input[type=\"password\"]", password);
    
    console.log("Clicking Login...");
    await page.click("button[data-testid=\"LoginForm_Login_Button\"], div[data-testid=\"LoginForm_Login_Button\"]");
    
    console.log("Waiting for redirect...");
    await page.waitForTimeout(8000);
    
    const url = page.url();
    console.log("Current URL:", url);
    
    await page.screenshot({ path: "/tmp/twitter-login-result.png" });
    
    const cookies = await context.cookies();
    const storage = await context.storageState();
    
    fs.mkdirSync(path.dirname(TWITTER_SESSION), { recursive: true });
    fs.writeFileSync(TWITTER_SESSION, JSON.stringify({ cookies, storage }, null, 2));
    
    await browser.close();
    
    const isLoggedIn = url.includes("/home") || url === "https://twitter.com/" || url === "https://x.com/" || !url.includes("login");
    return { 
      success: isLoggedIn, 
      message: isLoggedIn ? "Twitter login successful" : "Login may require additional verification",
      url
    };
  } catch (error) {
    await page.screenshot({ path: "/tmp/twitter-login-error.png" }).catch(() => {});
    await browser.close();
    return { success: false, error: error.message };
  }
}

async function getTweets(username, count = 10) {
  if (!fs.existsSync(TWITTER_SESSION)) {
    return { success: false, error: "Not logged in. Run login first." };
  }

  const session = JSON.parse(fs.readFileSync(TWITTER_SESSION, "utf8"));
  
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    storageState: session.storage
  });
  const page = await context.newPage();

  try {
    await page.goto(`https://twitter.com/${username}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.waitForSelector("article[data-testid=\"tweet\"]", { timeout: 20000 });
    
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
    
    const tweets = await page.evaluate((maxCount) => {
      const articles = document.querySelectorAll("article[data-testid=\"tweet\"]");
      return Array.from(articles).slice(0, maxCount).map(article => {
        const textEl = article.querySelector("div[data-testid=\"tweetText\"]");
        const timeEl = article.querySelector("time");
        const linkEl = article.querySelector("a[href*=\"/status/\"]");
        
        return {
          text: textEl ? textEl.textContent : "",
          time: timeEl ? timeEl.getAttribute("datetime") : "",
          url: linkEl ? `https://twitter.com${linkEl.getAttribute("href")}` : ""
        };
      });
    }, count);

    await browser.close();
    return { success: true, tweets, count: tweets.length };
  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
}

async function searchTwitter(query, count = 20) {
  if (!fs.existsSync(TWITTER_SESSION)) {
    return { success: false, error: "Not logged in" };
  }

  const session = JSON.parse(fs.readFileSync(TWITTER_SESSION, "utf8"));
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ 
    storageState: session.storage
  });
  const page = await context.newPage();

  try {
    const encodedQuery = encodeURIComponent(query);
    await page.goto(`https://twitter.com/search?q=${encodedQuery}&f=live`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.waitForSelector("article[data-testid=\"tweet\"]", { timeout: 20000 });
    
    const tweets = await page.evaluate((maxCount) => {
      const articles = document.querySelectorAll("article[data-testid=\"tweet\"]");
      return Array.from(articles).slice(0, maxCount).map(article => {
        const textEl = article.querySelector("div[data-testid=\"tweetText\"]");
        const authorEl = article.querySelector("a[role=\"link\"][href^=\"/\"]");
        
        return {
          author: authorEl ? "@" + authorEl.getAttribute("href").split("/")[1] : "",
          text: textEl ? textEl.textContent : ""
        };
      });
    }, count);

    await browser.close();
    return { success: true, tweets };
  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "login":
    loginTwitter(args[0], args[1], args[2])
      .then(r => console.log(JSON.stringify(r, null, 2)));
    break;
  case "tweets":
    getTweets(args[0], parseInt(args[1]) || 10)
      .then(r => console.log(JSON.stringify(r, null, 2)));
    break;
  case "search":
    searchTwitter(args[0], parseInt(args[1]) || 20)
      .then(r => console.log(JSON.stringify(r, null, 2)));
    break;
  default:
    console.log("Usage: twitter.mjs login <user> <pass> <email>");
    console.log("       twitter.mjs tweets <username> [count]");
    console.log("       twitter.mjs search <query> [count]");
}
