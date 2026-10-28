const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * POST /api/tts/speak
 * Synthesizes speech using Sarvam AI Text-to-Speech API with fallback support.
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, speaker = 'meera', language_code = 'en-IN' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for speech synthesis.'
      });
    }

    // Clean text (strip markdown symbols, limit to 2000 chars)
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);

    // Check for Sarvam API key from client header or environment variable
    const apiKey =
      req.headers['x-sarvam-key'] ||
      process.env.SARVAM_API_KEY ||
      '';

    if (!apiKey) {
      // Graceful fallback to client browser Web Speech API
      return res.status(200).json({
        success: true,
        fallback: true,
        provider: 'browser_tts',
        message: 'No Sarvam API key provided. Client will speak using high-quality browser voice or you can configure SARVAM_API_KEY.'
      });
    }

    // Call Sarvam AI TTS REST API
    try {
      const sarvamResponse = await axios.post(
        'https://api.sarvam.ai/text-to-speech',
        {
          inputs: [cleanText],
          text: cleanText,
          target_language_code: language_code,
          speaker: speaker,
          model: 'bulbul:v1',
          pace: 1.0,
          speech_sample_rate: 22050,
          enable_preprocessing: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey
          },
          timeout: 12000
        }
      );

      const audios = sarvamResponse.data?.audios || [];
      if (audios.length > 0 && audios[0]) {
        return res.status(200).json({
          success: true,
          audioBase64: audios[0],
          format: 'wav',
          provider: 'sarvam',
          speaker
        });
      }

      throw new Error('Sarvam API returned empty audio response.');
    } catch (sarvamErr) {
      console.warn('[Sarvam TTS] API request failed, falling back to browser speech:', sarvamErr.response?.data || sarvamErr.message);
      return res.status(200).json({
        success: true,
        fallback: true,
        provider: 'browser_tts',
        error: sarvamErr.response?.data?.message || sarvamErr.message,
        message: 'Sarvam API error. Falling back to browser speech synthesis.'
      });
    }
  } catch (err) {
    console.error('[TTS Controller] Internal error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process speech synthesis request.'
    });
  }
});

module.exports = router;
