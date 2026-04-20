import { firefox } from "playwright";

const browser = await firefox.launch({ 
  headless: true
});
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  viewport: { width: 1920, height: 1080 },
  locale: "en-US",
  timezoneId: "America/New_York"
});
const page = await context.newPage();

console.log("Navigating with Firefox...");
await page.goto("https://twitter.com/i/flow/login", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);

const bodyText = await page.evaluate(() => document.body.innerText);
console.log("Page text length:", bodyText.length);
console.log("Preview:", bodyText.substring(0, 300));

await page.screenshot({ path: "/tmp/tw-firefox.png" });
console.log("Screenshot: /tmp/tw-firefox.png");

await browser.close();
