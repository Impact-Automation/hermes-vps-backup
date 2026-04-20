import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({ 
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  viewport: { width: 1920, height: 1080 }
});
const page = await context.newPage();

console.log("1. Navigating to Twitter login...");
await page.goto("https://twitter.com/i/flow/login", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: "/tmp/tw-step1.png" });
console.log("   Screenshot: /tmp/tw-step1.png");

console.log("2. Looking for username field...");
try {
  await page.waitForSelector("input[autocomplete=\"username\"], input[name=\"text\"]", { timeout: 10000 });
  await page.fill("input[autocomplete=\"username\"], input[name=\"text\"]", "1111TKO");
  await page.screenshot({ path: "/tmp/tw-step2.png" });
  console.log("   Filled username. Screenshot: /tmp/tw-step2.png");
} catch (e) {
  console.log("   ERROR:", e.message);
  await page.screenshot({ path: "/tmp/tw-step2-error.png" });
}

console.log("3. Clicking Next...");
try {
  await page.click("button:has-text(\"Next\"), div[role=\"button\"]:has-text(\"Next\")");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "/tmp/tw-step3.png" });
  console.log("   Clicked Next. Screenshot: /tmp/tw-step3.png");
} catch (e) {
  console.log("   ERROR:", e.message);
}

console.log("4. Checking what appears next...");
await page.waitForTimeout(2000);

// Check for various elements
const hasPassword = await page.$("input[name=\"password\"], input[type=\"password\"]");
const hasEmailVerify = await page.$("input[data-testid=\"ocfEnterTextTextInput\"]");
const hasChallenge = await page.$("iframe[title*=\"challenge\"], iframe[src*=\"captcha\"]");

console.log("   Password field:", !!hasPassword);
console.log("   Email verify field:", !!hasEmailVerify);
console.log("   Challenge/CAPTCHA:", !!hasChallenge);

// Get page text
const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
console.log("   Page text preview:", bodyText.replace(/\n/g, " ").substring(0, 200));

await page.screenshot({ path: "/tmp/tw-step4.png" });
console.log("   Screenshot: /tmp/tw-step4.png");

if (hasEmailVerify) {
  console.log("5. Filling email verification...");
  await page.fill("input[data-testid=\"ocfEnterTextTextInput\"]", "asctom@outlook.com");
  await page.click("button:has-text(\"Next\"), div[role=\"button\"]:has-text(\"Next\")");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "/tmp/tw-step5.png" });
  console.log("   Screenshot: /tmp/tw-step5.png");
}

await browser.close();
console.log("Done.");
