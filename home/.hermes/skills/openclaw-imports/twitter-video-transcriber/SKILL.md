# Twitter Video Transcriber Skill

Transcribes Twitter/X videos by downloading them and sending the audio to Deepgram's transcription API.

## Use Cases

- Long Twitter videos (30+ min) with useful information you don't have time to watch
- Podcast clips shared on Twitter
- Educational threads with video content
- Conference talks and interviews

## Installation

```bash
cd skills/twitter-video-transcriber
pip install -r requirements.txt
```

## Configuration

Add to your `.env` file:
```
DEEPGRAM_API_KEY=03ded65d31eee46e4654b11f737c82eb53508d85
```

## Usage

### From Telegram
Send a Twitter/X video URL:
```
https://x.com/username/status/1234567890
```

Or use the command:
```
/transcribe https://x.com/username/status/1234567890
```

### From Command Line
```bash
node skills/twitter-video-transcriber/transcribe.js "https://x.com/username/status/1234567890"
```

## How It Works

1. **Download**: Uses yt-dlp to download the Twitter/X video
2. **Extract**: Extracts audio from the video file
3. **Transcribe**: Sends audio to Deepgram Nova-3 API
4. **Save**: Transcript saved permanently to `memory/transcripts/`
5. **Deliver**: Returns transcript as .txt file in chat

## Permanent Storage

All transcripts are automatically saved to:
```
memory/transcripts/YYYY-MM-DD-HHMMSS-{tweet_id}.txt
```

This ensures transcripts are preserved even after temporary cleanup. Files include:
- Original tweet URL
- Video duration
- Transcription confidence score
- Timestamp
- Full transcript text

To retrieve a past transcript:
```bash
ls -la memory/transcripts/
cat memory/transcripts/2026-02-18-120000-1234567890.txt
```

## Cost Estimate

- Deepgram Nova-3: $0.0077/min (~$0.46/hour)
- 30-minute video: ~$0.23
- yt-dlp: Free

## Dependencies

- yt-dlp (Twitter/X video download)
- Deepgram SDK (transcription)
- FFmpeg (audio extraction, auto-installed with yt-dlp)

## Error Handling

- Invalid URLs: Returns error message
- Private videos: Prompts for cookie/auth if needed
- Large files: Handles up to Deepgram's limits
- Network errors: Retries with exponential backoff

## Security

- API key stored in `.env` only
- Temporary video/audio files cleaned up after processing
- Transcripts saved permanently to `memory/transcripts/` for future reference
- No video/audio files retained after transcription