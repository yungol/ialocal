const express = require('express');
const config = require('../../config/default.json');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;

router.post('/generate-title', async (req, res) => {
  const { message, response, model } = req.body;

  const titleModel = model || 'qwen3-8b';

  try {
    const upstream = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: titleModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a title generator. Create a short title (maximum 4 words) for this conversation. Output ONLY the title, no quotes, no punctuation, no explanation.',
          },
          {
            role: 'user',
            content: `User: ${(message || '').slice(0, 300)}\nAssistant: ${(response || '').slice(0, 500)}`,
          },
        ],
        max_tokens: 15,
      }),
    });

    const data = await upstream.json();
    const msg = data.choices?.[0]?.message;
    const title = (msg?.content || msg?.reasoning_content || '').trim();

    res.json({ title: title.slice(0, 80) || null });
  } catch (err) {
    console.error('generate-title error:', err.message);
    res.json({ title: null });
  }
});

module.exports = router;
