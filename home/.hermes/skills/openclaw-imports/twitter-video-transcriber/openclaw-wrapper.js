#!/usr/bin/env node
/**
 * OpenClaw Integration Wrapper for Twitter Video Transcriber
 * 
 * This script is called by OpenClaw when a user sends a Twitter URL
 * or uses the /transcribe command.
 * 
 * It handles:
 * - URL validation
 * - Progress updates via Telegram
 * - File upload back to chat
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.argv[2];
const TWITTER_URL = process.argv[3] || process.argv[2];

if (!TWITTER_URL || !TWITTER_URL.includes('http')) {
    console.error('Usage: node openclaw-wrapper.js <chat_id> <twitter_url>');
    process.exit(1);
}

async function sendTelegramMessage(text) {
    if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
        console.log(`[Would send to Telegram]: ${text}`);
        return;
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });
        return response.ok;
    } catch (e) {
        console.error('Failed to send Telegram message:', e.message);
    }
}

async function sendTelegramDocument(filePath, caption) {
    if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
        console.log(`[Would send file ${filePath}]: ${caption}`);
        return filePath;
    }
    
    try {
        // Use curl for file upload
        const cmd = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
            -F "chat_id=${CHAT_ID}" \
            -F "document=@${filePath}" \
            -F "caption=${caption}" \
            -F "parse_mode=Markdown"`;
        
        execSync(cmd, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error('Failed to send document:', e.message);
        return false;
    }
}

async function main() {
    console.log('🎬 Twitter Video Transcriber');
    
    // Validate URL
    const validDomains = ['twitter.com', 'x.com'];
    try {
        const urlObj = new URL(TWITTER_URL);
        if (!validDomains.some(d => urlObj.hostname.includes(d))) {
            await sendTelegramMessage('❌ Invalid URL. Please provide a Twitter/X link.');
            process.exit(1);
        }
    } catch (e) {
        await sendTelegramMessage('❌ Invalid URL format.');
        process.exit(1);
    }
    
    // Send initial message
    await sendTelegramMessage('🎬 *Twitter Video Transcriber*\n\n📥 Downloading video...');
    
    try {
        // Run the main transcribe script
        const scriptPath = path.join(__dirname, 'transcribe.js');
        const output = execSync(
            `node "${scriptPath}" "${TWITTER_URL}"`,
            { 
                encoding: 'utf8',
                timeout: 300000, // 5 minute timeout
                env: { ...process.env }
            }
        );
        
        // Parse the JSON result from the output
        const resultMatch = output.match(/---RESULT---\s*\n(.+)/);
        if (!resultMatch) {
            throw new Error('Transcription completed but no result found');
        }
        
        const result = JSON.parse(resultMatch[1]);
        
        if (!result.success) {
            throw new Error(result.error || 'Transcription failed');
        }
        
        // Send the transcript file
        const caption = `✅ *Transcription Complete*\n\n` +
            `🔗 Source: ${TWITTER_URL}\n` +
            `⏱ Duration: ${result.duration} minutes\n` +
            `🤖 Model: Deepgram Nova-3`;
        
        const sent = await sendTelegramDocument(result.transcriptPath, caption);
        
        if (sent === true) {
            console.log('✅ Transcript sent successfully');
        } else if (typeof sent === 'string') {
            // Return the path for OpenClaw to handle
            console.log(`MEDIA: ${sent}`);
        }
        
    } catch (error) {
        console.error('Transcription failed:', error.message);
        await sendTelegramMessage(`❌ *Transcription Failed*\n\n${error.message}`);
        process.exit(1);
    }
}

main();