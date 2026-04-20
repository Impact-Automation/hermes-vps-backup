#!/usr/bin/env node
/**
 * Twitter Video Transcriber
 * 
 * Downloads Twitter/X videos and transcribes them using Deepgram API.
 * 
 * Usage:
 *   node transcribe.js <twitter_url>
 *   node transcribe.js --chat-id <id> <twitter_url>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Permanent storage location for transcripts
const PERMANENT_TRANSCRIPT_DIR = path.join(__dirname, '..', '..', 'memory', 'transcripts');

// Load API key from environment
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM_API_KEY) {
    console.error('❌ DEEPGRAM_API_KEY not found in environment');
    console.error('Add it to your .env file: DEEPGRAM_API_KEY=your_key_here');
    process.exit(1);
}

// Parse arguments
const args = process.argv.slice(2);
let chatId = null;
let twitterUrl = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chat-id' && args[i + 1]) {
        chatId = args[i + 1];
        i++;
    } else if (!twitterUrl && args[i].startsWith('http')) {
        twitterUrl = args[i];
    }
}

if (!twitterUrl) {
    console.error('Usage: node transcribe.js [--chat-id <id>] <twitter_url>');
    console.error('Example: node transcribe.js "https://x.com/elonmusk/status/1234567890"');
    process.exit(1);
}

// Validate Twitter/X URL
const validDomains = ['twitter.com', 'x.com', 'mobile.twitter.com'];
const urlObj = new URL(twitterUrl);
if (!validDomains.some(d => urlObj.hostname.includes(d))) {
    console.error('❌ Invalid URL. Must be a Twitter/X link (twitter.com or x.com)');
    process.exit(1);
}

// Create temp directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'twitter-transcribe-'));
const videoPath = path.join(tempDir, 'video.mp4');
const audioPath = path.join(tempDir, 'audio.wav');
const transcriptPath = path.join(tempDir, 'transcript.txt');

async function cleanup() {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
        // Ignore cleanup errors
    }
}

function getTweetIdFromUrl(url) {
    try {
        const match = url.match(/status\/(\d+)/);
        return match ? match[1] : 'unknown';
    } catch (e) {
        return 'unknown';
    }
}

async function saveTranscriptPermanently(tempTranscriptPath) {
    try {
        // Ensure permanent directory exists
        if (!fs.existsSync(PERMANENT_TRANSCRIPT_DIR)) {
            fs.mkdirSync(PERMANENT_TRANSCRIPT_DIR, { recursive: true });
        }
        
        // Generate filename: YYYY-MM-DD-HHMMSS-{tweet_id}.txt
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const tweetId = getTweetIdFromUrl(twitterUrl);
        const filename = `${timestamp}-${tweetId}.txt`;
        const permanentPath = path.join(PERMANENT_TRANSCRIPT_DIR, filename);
        
        // Copy transcript to permanent location
        fs.copyFileSync(tempTranscriptPath, permanentPath);
        
        console.log(`💾 Transcript saved permanently: ${permanentPath}`);
        return permanentPath;
    } catch (error) {
        console.error(`⚠️  Warning: Failed to save permanent transcript: ${error.message}`);
        return null;
    }
}

// Find yt-dlp binary
const YT_DLP_PATH = process.env.YT_DLP_PATH || '/tmp/yt-dlp';
const COOKIES_PATH = path.join(__dirname, 'twitter_cookies.txt');

async function ensureYtDlp() {
    if (!fs.existsSync(YT_DLP_PATH)) {
        console.log('📦 yt-dlp not found, downloading...');
        try {
            execSync(
                'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod a+rx /tmp/yt-dlp',
                { stdio: 'pipe', timeout: 60000 }
            );
        } catch (e) {
            throw new Error('Failed to download yt-dlp. Please install it manually.');
        }
    }
}

async function downloadVideo() {
    console.log('📥 Downloading video from Twitter/X...');
    
    await ensureYtDlp();
    
    // Check for cookies file
    const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : '';
    
    try {
        // Use yt-dlp to download the video (with cookies if available)
        execSync(
            `"${YT_DLP_PATH}" ${cookiesArg} -f "best[ext=mp4]/best" -o "${videoPath}" "${twitterUrl}"`,
            { stdio: 'pipe', timeout: 120000 }
        );
        
        if (!fs.existsSync(videoPath)) {
            throw new Error('Video download failed - file not created');
        }
        
        const stats = fs.statSync(videoPath);
        console.log(`✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        return videoPath;
    } catch (error) {
        if (error.message.includes('Private')) {
            throw new Error('This video is private. Cannot download without authentication.');
        }
        if (error.message.includes('not available')) {
            throw new Error('Video not found or has been deleted.');
        }
        throw new Error(`Download failed: ${error.message}`);
    }
}

async function extractAudio() {
    console.log('🎵 Extracting audio from video...');
    
    // Try yt-dlp audio extraction first (no ffmpeg needed)
    try {
        const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : '';
        console.log('Using yt-dlp to extract audio directly...');
        
        execSync(
            `"${YT_DLP_PATH}" ${cookiesArg} -f "bestaudio" -o "${audioPath}" "${twitterUrl}"`,
            { stdio: 'pipe', timeout: 120000 }
        );
        
        if (fs.existsSync(audioPath)) {
            const stats = fs.statSync(audioPath);
            console.log(`✅ Audio extracted: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            return audioPath;
        }
    } catch (e) {
        console.log('yt-dlp audio extraction failed, trying ffmpeg...');
    }
    
    // Fallback to ffmpeg if available - use Opus compression for smaller size
    try {
        // Use Opus codec for compression (much smaller than WAV)
        // Deepgram accepts Opus, MP3, WAV
        const compressedAudioPath = audioPath.replace('.wav', '.opus');
        execSync(
            `ffmpeg -i "${videoPath}" -vn -acodec libopus -b:a 48k -ar 16000 -ac 1 "${compressedAudioPath}" -y`,
            { stdio: 'pipe', timeout: 60000 }
        );
        
        if (!fs.existsSync(compressedAudioPath)) {
            throw new Error('Audio extraction failed');
        }
        
        const stats = fs.statSync(compressedAudioPath);
        console.log(`✅ Audio extracted (compressed): ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        return compressedAudioPath;
    } catch (error) {
        // If Opus fails, try uncompressed as fallback
        console.log('⚠️ Compression failed, trying uncompressed...');
        try {
            execSync(
                `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`,
                { stdio: 'pipe', timeout: 60000 }
            );
            
            if (!fs.existsSync(audioPath)) {
                throw new Error('Audio extraction failed');
            }
            
            const stats = fs.statSync(audioPath);
            console.log(`✅ Audio extracted: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            return audioPath;
        } catch (fallbackError) {
            throw new Error(`Audio extraction failed: ${fallbackError.message}`);
        }
    }
}

async function transcribeAudio() {
    console.log('📝 Sending to Deepgram for transcription...');
    
    try {
        const audioBuffer = fs.readFileSync(audioPath);
        
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': 'audio/wav'
            },
            body: audioBuffer
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.results || !result.results.channels || !result.results.channels[0]) {
            throw new Error('Unexpected response format from Deepgram');
        }
        
        const transcript = result.results.channels[0].alternatives[0].transcript;
        const confidence = result.results.channels[0].alternatives[0].confidence;
        const duration = result.metadata?.duration || 0;
        
        // Write to file
        const header = `Twitter/X Video Transcription\n==============================\n\nSource: ${twitterUrl}\nDuration: ${Math.round(duration / 60)} minutes\nConfidence: ${(confidence * 100).toFixed(1)}%\nModel: Deepgram Nova-3\nTranscribed: ${new Date().toISOString()}\n\n---\n\n`;
        
        fs.writeFileSync(transcriptPath, header + transcript);
        
        console.log(`✅ Transcription complete!`);
        console.log(`   Duration: ${Math.round(duration / 60)} minutes`);
        console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   Word count: ${transcript.split(/\s+/).length}`);
        
        return { transcriptPath, transcript, duration, confidence };
    } catch (error) {
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

async function sendToTelegram(transcriptPath) {
    if (!chatId) {
        // Read the file and output to stdout for manual sending
        const content = fs.readFileSync(transcriptPath, 'utf8');
        console.log('\n' + '='.repeat(60));
        console.log('TRANSCRIPT');
        console.log('='.repeat(60));
        console.log(content);
        console.log('='.repeat(60));
        return;
    }
    
    // Use OpenClaw's message tool to send the file
    console.log(`📤 Sending transcript to chat ${chatId}...`);
    
    // For now, output the path - the calling system can handle file sending
    console.log(`📄 Transcript saved to: ${transcriptPath}`);
    console.log('Use this path to send the file via Telegram.');
}

async function main() {
    console.log('🚀 Twitter Video Transcriber');
    console.log(`🔗 URL: ${twitterUrl}`);
    console.log('');
    
    let permanentTranscriptPath = null;
    
    try {
        // Step 1: Download video
        await downloadVideo();
        
        // Step 2: Extract audio
        await extractAudio();
        
        // Step 3: Transcribe
        const { transcriptPath, transcript, duration, confidence } = await transcribeAudio();
        
        // Step 4: Save permanently BEFORE cleanup
        permanentTranscriptPath = await saveTranscriptPermanently(transcriptPath);
        
        // Step 5: Send or output
        await sendToTelegram(transcriptPath);
        
        // Cleanup
        console.log('\n🧹 Cleaning up temporary files...');
        await cleanup();
        
        console.log('\n✨ Done!');
        
        // Return JSON result for programmatic use
        console.log('\n---RESULT---');
        console.log(JSON.stringify({
            success: true,
            url: twitterUrl,
            duration: Math.round(duration / 60),
            confidence: confidence,
            transcriptPath: transcriptPath,
            permanentPath: permanentTranscriptPath,
            wordCount: transcript.split(/\s+/).length
        }));
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        await cleanup();
        
        console.log('\n---RESULT---');
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }));
        
        process.exit(1);
    }
}

main();