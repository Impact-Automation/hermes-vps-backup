# Voice Transcribe Tool

Transcribe audio files to text using Together AI's Kimi K2.5 model.

## Schema

```yaml
name: voice-transcribe
description: Transcribe audio files (voice notes, recordings) to text
args:
  filePath:
    type: string
    required: true
    description: Path to the audio file
  language:
    type: string
    required: false
    description: Language code (e.g., 'en', 'zh', 'es'). Auto-detected if not specified.
  responseFormat:
    type: string
    required: false
    default: json
    description: Response format ('json', 'text', 'srt', 'vtt')
  timestampGranularities:
    type: string
    required: false
    description: Timestamp level ('segment', 'word', or null)
returns:
  success: boolean
  text: string (full transcription)
  segments: array (timestamped segments)
  language: string (detected language)
  error: string (if failed)
```

## Example

```json
{
  "tool": "voice-transcribe",
  "filePath": "/home/moltbot/.openclaw/media/inbound/voice_note.ogg"
}
```

## Response

```json
{
  "success": true,
  "text": "This is the full transcription of the voice note.",
  "segments": [
    {"start": 0.0, "end": 3.5, "text": "This is the"},
    {"start": 3.5, "end": 7.2, "text": "full transcription"}
  ],
  "language": "en"
}
```

## Requirements

- `TOGETHER_API_KEY` environment variable
- Audio file accessible at filePath
- Supported formats: mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
