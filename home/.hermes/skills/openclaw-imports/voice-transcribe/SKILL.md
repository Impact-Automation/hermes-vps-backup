# Together AI Voice Transcription Skill

Transcribes audio files (voice notes, recordings) using Kimi K2.5 via Together AI's API.

## Requirements

- `TOGETHER_API_KEY` in environment
- Audio file in supported format (ogg, mp3, wav, m4a)

## Usage

```json
{
  "tool": "voice-transcribe",
  "filePath": "/path/to/audio.ogg"
}
```

## Model

- **Primary:** `moonshotai/Kimi-K2.5` (via Together AI)
- **Endpoint:** `https://api.together.xyz/v1/audio/transcriptions`
- **Language:** Auto-detect or specify
- **Response format:** JSON with segments

## Features

- Transcribes voice notes to text
- Supports multiple languages
- Returns timestamped segments
- Works with Telegram voice messages (OGG format)

## Environment

```bash
export TOGETHER_API_KEY="sk-..."
```
