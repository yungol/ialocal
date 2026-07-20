# Kokoro TTS API — Consumption Contract

**Service:** Text-to-Speech (Kokoro-82M, Latin American Spanish)
**Compatibility:** OpenAI Audio Speech API
**Base URL:** `http://192.168.0.109:4001/v1`
**Auth:** none (send any `api_key`; it is ignored)

---

## Endpoint

```
POST /v1/audio/speech
Content-Type: application/json
```

## Parameters (JSON body)

| Field | Required | Type | Description |
|---|:---:|---|---|
| `input` | yes | string | Text to speak. Max 20000 characters |
| `model` | no | string | Use `"kokoro"` |
| `voice` | no | string | `dora` (female) or `alex` (male). Default `dora` |
| `response_format` | no | string | `mp3` (default), `wav`, `flac`, `opus`, `ogg` |
| `speed` | no | number | `0.5`–`2.0` (default `1.0`) |

Blank lines in `input` become a 300 ms pause, so a multi-paragraph script keeps
its pacing in a single request.

## Response `200`

Raw audio bytes. `Content-Type` matches the requested format
(`audio/mpeg`, `audio/wav`, `audio/flac`, `audio/ogg`).

## Errors

| Code | Cause |
|---|---|
| `400` | Empty input, input over 20000 chars, unknown voice, or unsupported format |
| `502` | Kokoro engine unavailable (model failed to load / service down) |

---

## Supporting endpoint

```
GET /v1/voices
```

```json
{
  "voices": [
    { "id": "alex", "kokoro_id": "em_alex", "language": "es-419" },
    { "id": "dora", "kokoro_id": "ef_dora", "language": "es-419" }
  ]
}
```

---

## Example — curl

```bash
curl http://192.168.0.109:4001/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"kokoro","voice":"dora","input":"Bienvenidos a este video.","response_format":"mp3"}' \
  --output narracion.mp3
```

## Example — Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(base_url="http://192.168.0.109:4001/v1", api_key="unused")

response = client.audio.speech.create(
    model="kokoro",
    voice="dora",
    input="Bienvenidos a este video.",
    response_format="mp3",
)
response.write_to_file("narracion.mp3")
```

## Example — Node (OpenAI SDK)

```js
import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  baseURL: "http://192.168.0.109:4001/v1",
  apiKey: "unused",
});

const response = await client.audio.speech.create({
  model: "kokoro",
  voice: "dora",
  input: "Bienvenidos a este video.",
  response_format: "mp3",
});

fs.writeFileSync("narracion.mp3", Buffer.from(await response.arrayBuffer()));
```

---

## Notes for the consuming agent

- **Runs on CPU.** Kokoro is 82M parameters and is pinned to CPU, so speech
  synthesis uses RAM instead of VRAM. It never stops ComfyUI and never evicts a
  loaded GPU model — narration and image/video generation can run concurrently.
- **Cold start:** ~4s when the model is not loaded (measured with the process
  confirmed stopped), then ~0.3s per short request while it stays warm. The
  model unloads after 30 minutes idle (llama-swap `ttl`).
- **Throughput:** roughly 5x realtime on CPU — about 3s of compute per 17s of
  audio. A 3-minute script takes ~35s, so scale the client timeout with the
  script length; 120s is a safe ceiling for a single request.
- **Language:** Latin American Spanish (`es-419`, seseo). The upstream default
  is Castilian (`es`), which pronounces "voz" as /boθ/; this deployment
  overrides it. Change with `--lang` in the llama-swap `cmd`.
- **Licensing:** Kokoro-82M is Apache 2.0 and was trained on public-domain and
  permissively licensed audio. Generated audio is safe for monetized use.
- **Network requirement:** the agent's machine must be on the same LAN as
  `192.168.0.109`.
- **No HTTPS:** plain HTTP. If the SDK requires `https`, force `http` in the
  `base_url`.

---

## Deployment

| Piece | Path |
|---|---|
| Server | `/home/juan/bin/kokoro-tts/server.py` |
| venv | `/home/juan/bin/kokoro-tts/venv` |
| Launcher | `/home/juan/bin/kokoro-server` |
| llama-swap entry | `kokoro` in `~/.config/llama-swap/config.yaml` |
| Express route | `server/src/routes/speech.js` |

The `cpu-tts` group in the llama-swap config is what keeps Kokoro from evicting
GPU models. It is declared `swap: false, exclusive: false`; removing it would
make every narration request unload the active chat or image model.
