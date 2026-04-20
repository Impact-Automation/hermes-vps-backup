#!/usr/bin/env node

/**
 * Nano Banana Pro - Image Generator Script
 * Usage: node generate.js "<prompt>" "<output_path>"
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";
const PROMPT = process.argv[2];
const OUTPUT_PATH = process.argv[3] || path.join(process.cwd(), `generation_${Date.now()}.png`);

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY not found.");
  process.exit(1);
}

if (!PROMPT) {
  console.error("Error: Prompt is required.");
  process.exit(1);
}

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [{ text: `Generate a high-quality 16:9 image: ${PROMPT}` }]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (part) {
      fs.writeFileSync(OUTPUT_PATH, Buffer.from(part.inlineData.data, 'base64'));
      console.log(`MEDIA:${OUTPUT_PATH}`);
    } else {
      console.error("Generation failed. Check API logs or prompt safety filters.");
      if (data.error) console.error(JSON.stringify(data.error));
    }
  } catch (err) {
    console.error("Request error:", err.message);
  }
}

run();
