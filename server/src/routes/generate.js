const express = require('express');
const config = require('../../config/default.json');
const gpu = require('../services/gpu');

const router = express.Router();
const BASE_URL = `http://${config.llamaSwap.host}:${config.llamaSwap.port}`;
const PROMPT_MODEL = 'gemma4';

// Turn a user's idea into a polished English text-to-image prompt. Enriches
// vague input with visual detail; only restructures/translates rich input.
router.post('/enhance-image-prompt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Falta el prompt' });
  }

  try {
    await gpu.requireLlama();

    const upstream = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: PROMPT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt engineer for AI text-to-image generation. You rewrite the user idea into a single, well-structured English prompt for an image model. Output ONLY the final prompt — no preamble, no quotes, no explanations, no labels.',
          },
          {
            role: 'user',
            content:
              'Convert the following text into an English image-generation prompt. If it is short or vague, enrich it with vivid, relevant visual detail (subject, style, lighting, composition, quality) so the image looks great — but stay faithful to the original idea and do not invent unrelated concepts. If it is already detailed and rich, do NOT add more details: just translate it to English if needed and structure it cleanly as a prompt.\n\nText:\n"""\n' +
              prompt.trim() +
              '\n"""',
          },
        ],
        // No token cap (see gemma4-vision note): models may "think" into
        // reasoning_content first and only then write the answer into content.
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      return res
        .status(502)
        .json({ error: `Modelo fallo: ${body.slice(0, 200)}` });
    }

    const data = await upstream.json();
    const enhanced = (data.choices?.[0]?.message?.content || '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();

    if (!enhanced) {
      return res.status(502).json({ error: 'El modelo no devolvio un prompt' });
    }
    res.json({ prompt: enhanced });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error mejorando el prompt' });
  }
});

router.post('/generate-title', async (req, res) => {
  const { message, response, model } = req.body;

  const titleModel = model || 'qwen3-8b';

  try {
    // Reuses the chat's loaded model, but ensure ComfyUI isn't holding VRAM.
    await gpu.requireLlama();

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
