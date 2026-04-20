#!/bin/bash
# Manual Twitter Login with VNC

# Kill any existing Xvfb/x11vnc
pkill -f "Xvfb :99" 2>/dev/null
pkill -f x11vnc 2>/dev/null
sleep 1

# Start virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &
sleep 2

# Start fluxbox window manager
fluxbox &
sleep 1

# Start VNC server (no password for simplicity, or set one)
x11vnc -display :99 -forever -shared -rfbport 5900 -bg -o /tmp/x11vnc.log

echo ""
echo "========================================"
echo "VNC Server running on port 5900"
echo "Connect with VNC client to: 46.225.48.192:5900"
echo "========================================"
echo ""

# Launch browser for Twitter login
cd /home/moltbot/.openclaw/workspace
node -e "
import { firefox } from playwright;
import fs from fs;
import path from path;

const TWITTER_SESSION = path.join(process.env.HOME, .openclaw/sessions/twitter.json);

const browser = await firefox.launch({ 
  headless: false,
  args: [--display=:99]
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 }
});
const page = await context.newPage();

console.log(Opening Twitter login page...);
console.log(Please complete the login manually via VNC);
console.log();

await page.goto(https://twitter.com/i/flow/login);

// Wait for user to complete login (check for home page)
console.log(Waiting for you to complete login...);
console.log(Press Ctrl+C when done, or wait for auto-detection);

let loggedIn = false;
for (let i = 0; i < 120; i++) {  // 10 minute timeout
  await new Promise(r => setTimeout(r, 5000));
  const url = page.url();
  console.log(Current URL:, url);
  
  if (url.includes(/home) || (url === https://twitter.com/ || url === https://x.com/)) {
    loggedIn = true;
    break;
  }
}

if (loggedIn) {
  console.log(Login detected! Saving session...);
  const cookies = await context.cookies();
  const storage = await context.storageState();
  
  fs.mkdirSync(path.dirname(TWITTER_SESSION), { recursive: true });
  fs.writeFileSync(TWITTER_SESSION, JSON.stringify({ cookies, storage }, null, 2));
  console.log(Session saved to:, TWITTER_SESSION);
}

await browser.close();
console.log(Done. You can disconnect VNC now.);
"
