const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function transcribeAudio(filePath, options = {}) {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error('TOGETHER_API_KEY not set in environment');
  }

  const form = new FormData();
  // Using OpenAI Whisper via Together AI (Kimi audio transcription is currently unstable)
  form.append('model', options.model || 'openai/whisper-large-v3');
  form.append('language', options.language || 'en');
  form.append('response_format', options.responseFormat || 'json');
  
  if (options.timestampGranularities) {
    form.append('timestamp_granularities', options.timestampGranularities);
  }
  
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post(
      'https://api.together.xyz/v1/audio/transcriptions',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${apiKey}`
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    return {
      success: true,
      text: response.data.text,
      segments: response.data.segments || [],
      language: response.data.language
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

module.exports = { transcribeAudio };
