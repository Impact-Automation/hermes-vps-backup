#!/usr/bin/env node

import { chromium, firefox, webkit } from "playwright";
import fs from "fs";
import path from "path";

const SESSION_DIR = path.join(process.env.HOME, ".openclaw/sessions");

async function launchBrowser(options = {}) {
  const { 
    headless = true,
    site = "default",
    proxy = null,
    userAgent = null
  } = options;

  // Ensure session directory exists
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const sessionFile = path.join(SESSION_DIR, `${site}.json`);
  
  const launchOptions = {
    headless
  };

  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    userAgent: userAgent || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    ...(proxy && { proxy: { server: proxy } })
  };

  // Load existing session if available
  if (fs.existsSync(sessionFile)) {
    try {
      const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
      if (session.cookies) {
        contextOptions.storageState = { cookies: session.cookies, origins: [] };
      }
    } catch (e) {
      // Ignore corrupt session files
    }
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page, sessionFile };
}

async function navigate(url, options = {}) {
  const { browser, context, page, sessionFile } = await launchBrowser(options);
  
  try {
    await page.goto(url, { 
      waitUntil: "networkidle",
      timeout: 60000 
    });

    // Save session on exit
    const cookies = await context.cookies();
    fs.writeFileSync(sessionFile, JSON.stringify({ cookies }, null, 2));

    return {
      success: true,
      url: page.url(),
      title: await page.title(),
      content: await page.content()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

async function screenshot(url, outputPath, options = {}) {
  const { browser, page } = await launchBrowser(options);
  
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.screenshot({ 
      path: outputPath,
      fullPage: true 
    });
    
    return {
      success: true,
      path: outputPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

async function extractData(url, selector, options = {}) {
  const { browser, page } = await launchBrowser(options);
  
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    
    const data = await page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map(el => ({
        text: el.textContent.trim(),
        href: el.href || null,
        src: el.src || null
      }));
    }, selector);

    return {
      success: true,
      data,
      count: data.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// CLI Interface
const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "navigate":
    navigate(args[0], JSON.parse(args[1] || "{}"))
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(err => console.error(JSON.stringify({ error: err.message })));
    break;
    
  case "screenshot":
    screenshot(args[0], args[1], JSON.parse(args[2] || "{}"))
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(err => console.error(JSON.stringify({ error: err.message })));
    break;
    
  case "extract":
    extractData(args[0], args[1], JSON.parse(args[2] || "{}"))
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(err => console.error(JSON.stringify({ error: err.message })));
    break;
    
  default:
    console.log(`
Browser Automation Tool

Usage:
  node browser.mjs navigate <url> [options]
  node browser.mjs screenshot <url> <output> [options]
  node browser.mjs extract <url> <selector> [options]

Options (JSON string):
  { "headless": true, "site": "twitter", "proxy": "http://proxy:8080" }
    `);
}
