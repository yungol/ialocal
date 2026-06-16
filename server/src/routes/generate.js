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
        // enable_thinking:false makes models that honor it (e.g. qwen3-8b) skip
        // reasoning and answer instantly. Models that ignore it (e.g.
        // qwen-claude-opus) still think, so the budget must be large enough for
        // them to FINISH reasoning and emit the title in `content` — otherwise
        // content stays empty and no title is produced. We must reuse the chat's
        // already-loaded model, so we give it room instead of switching models.
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 512,
      }),
    });

    const data = await upstream.json();
    const msg = data.choices?.[0]?.message;
    // Never fall back to reasoning_content: that is the raw thinking, not a title.
    const raw = msg?.content || '';
    // Strip any stray <think> block in case the template still inlines it,
    // including an unterminated one (when the budget cut off mid-thought).
    const title = raw
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*$/i, '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();

    res.json({ title: title.slice(0, 80) || null });
  } catch (err) {
    console.error('generate-title error:', err.message);
    res.json({ title: null });
  }
});

module.exports = router;
