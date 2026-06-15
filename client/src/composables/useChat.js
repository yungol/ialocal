import { apiFetch } from './useApi';

async function streamChat({ model, messages, onReasoning, onToken, onDone, onError }) {
  let response;

  try {
    response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
    });
  } catch {
    onError('No se pudo conectar al servidor. Verifica que el backend este corriendo.');
    return;
  }

  if (!response.ok) {
    const text = await response.text();
    let msg = `Error ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.error?.message || msg;
    } catch {
      msg = text || msg;
    }
    onError(msg);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch {
      break;
    }

    const { done, value } = chunk;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.reasoning_content) {
          onReasoning(delta.reasoning_content);
        } else if (delta?.content) {
          onToken(delta.content);
        }
      } catch {
        // malformed JSON, ignore
      }
    }
  }

  onDone();
}

async function getChatModels() {
  const data = await apiFetch('/api/models');
  return (data.models || []).filter((m) => m.type === 'llm');
}

export { streamChat, getChatModels };
