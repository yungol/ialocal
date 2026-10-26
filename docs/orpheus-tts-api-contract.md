# Orpheus TTS API — Consumption Contract

**Service:** Text-to-Speech (Orpheus-3B Italian/Spanish, Q8_0 GGUF)
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
| `model` | yes | string | Must be `"orpheus"` — omitting it or sending `"kokoro"` routes to Kokoro instead |
| `voice` | no | string | `javi` (male, warm, default), `sergio` (male, professional), `maria` (female, friendly) |
| `response_format` | no | string | `mp3` (default), `wav`, `flac`, `opus`, `ogg` |
| `speed` | no | number | `0.5`–`2.0` (default `1.0`). See Notes — this is an approximation, not native speed control |

Blank lines in `input` become a 300ms pause, same convention as Kokoro, so a
multi-paragraph script keeps its pacing in a single request. Internally, long
input is also split into sentence-bounded chunks (~300 chars each) and
generated sequentially — see Notes.

## Response `200`

Raw audio bytes. `Content-Type` matches the requested format
(`audio/mpeg`, `audio/wav`, `audio/flac`, `audio/ogg`).

## Errors

| Code | Cause |
|---|---|
| `400` | Empty input, input over 20000 chars, unknown voice, or unsupported format |
| `502` | Orpheus engine unavailable, its `llama-server` failed, or generation produced no valid audio tokens |

---

## Supporting endpoint

```
GET /v1/voices
```

Calling this on the Express server (`:4001`) returns voices from **both**
engines, each tagged with `engine`:

```json
{
  "voices": [
    { "engine": "kokoro", "id": "alex", "kokoro_id": "em_alex", "language": "es-419" },
    { "engine": "kokoro", "id": "dora", "kokoro_id": "ef_dora", "language": "es-419" },
    { "engine": "orpheus", "id": "javi", "language": "es", "description": "male, warm" },
    { "engine": "orpheus", "id": "maria", "language": "es", "description": "female, friendly" },
    { "engine": "orpheus", "id": "sergio", "language": "es", "description": "male, professional" }
  ]
}
```

Calling the Orpheus engine directly (`/upstream/orpheus/v1/voices`) returns
just its three voices, without the `engine` tag.

---

## Example — curl

```bash
curl http://192.168.0.109:4001/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"orpheus","voice":"javi","input":"Bienvenidos a este video.","response_format":"mp3"}' \
  --output narracion.mp3
```

## Example — Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(base_url="http://192.168.0.109:4001/v1", api_key="unused")

response = client.audio.speech.create(
    model="orpheus",
    voice="javi",
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
  model: "orpheus",
  voice: "javi",
  input: "Bienvenidos a este video.",
  response_format: "mp3",
});

fs.writeFileSync("narracion.mp3", Buffer.from(await response.arrayBuffer()));
```

---

## Notes for the consuming agent

- **Runs on GPU, unlike Kokoro.** Orpheus is a 3B-parameter model. The
  Express route explicitly calls `gpu.requireLlama()` before forwarding an
  `orpheus` request, which stops ComfyUI if it is holding VRAM. **This means
  an Orpheus request can evict a loaded image/video generation session** —
  the opposite of Kokoro, which never touches the GPU. Do not assume the two
  engines behave the same way under load.
- **How it works internally:** Orpheus is an LLM fine-tuned to emit SNAC
  audio-codec tokens as text. The `orpheus` server launches its own private
  `llama-server` for the GGUF, prompts it for those tokens, and decodes them
  into a waveform with the SNAC codec on CPU. Callers never see the two
  stages; llama-swap sees one ordinary model.
- **Why the GGUF is not a second llama-swap entry.** It was, in the first
  version, and it deadlocked. llama-swap will not serve a nested request to
  one of its models while an outer request to another is still open, so the
  decoder entry waited on a generator entry that llama-swap would not reach
  until the decoder returned. Every request died at a flat 5-minute client
  timeout, warm and cold alike. Owning the child process removes the nesting.
- **Chunking:** input is split on blank lines into paragraphs (300ms pause
  between them), and each paragraph is further split into sentence-bounded
  chunks of up to ~300 characters. Orpheus is a 3B autoregressive model with
  finite context; generating an entire long paragraph in one completion risks
  the model losing coherence or truncating before the end. Splitting on
  sentence boundaries (never mid-sentence) keeps every generation short while
  avoiding audible cuts. Chunks are generated sequentially and concatenated —
  there is no cross-chunk crossfade, so a faint seam between chunks is
  possible. Not assessed by listening; judge it on your own material.
- **Cold start:** ~8.5s for the first request after a llama-swap restart, and
  ~6.6s when it has to evict another GPU model first (measured with `gemma4`
  loaded). That covers SNAC load, the GGUF onto the GPU, and generation.
  Unloads after 30 minutes idle (llama-swap `ttl`).
- **Throughput: roughly 1x realtime — about one second of compute per second
  of audio.** Measured: 3.16s of audio in 3.35s warm; 19.24s of audio in
  19.74s across a multi-paragraph script. This is the main cost of Orpheus.
  Kokoro runs at roughly 5x realtime on CPU, so a 3-minute narration takes
  Kokoro about 35s and Orpheus about 3 minutes. Scale client timeouts with
  script length; for Orpheus, budget at least the spoken duration plus the
  cold start.
- **Spanish quality is a known weak point.** The `lex-au/Orpheus-3b-Italian_Spanish-FT`
  checkpoint is a community multilingual fine-tune, explicitly a research
  preview, not a polished commercial release. English Orpheus checkpoints are
  more mature. Expect occasional mispronunciations, inconsistent prosody
  across chunk boundaries, and voice character that drifts slightly from the
  nominal `javi`/`sergio`/`maria` description. Compare against Kokoro (which
  is a dedicated, well-tuned Spanish voice model) before choosing Orpheus for
  anything quality-sensitive.
- **Licensing:** Apache 2.0 (per repo). Verify the upstream repo card before
  any commercial use — community fine-tunes sometimes carry additional
  restrictions not reflected in the top-level license file.
- **Network requirement:** the agent's machine must be on the same LAN as
  `192.168.0.109`.
- **No HTTPS:** plain HTTP. If the SDK requires `https`, force `http` in the
  `base_url`.

---

## Deployment

| Piece | Path |
|---|---|
| Server (spawns its own `llama-server`) | `/home/juan/bin/orpheus-tts/server.py` |
| venv | `/home/juan/bin/orpheus-tts/venv` |
| Launcher | `/home/juan/bin/orpheus-server` |
| GGUF | `/home/juan/models/orpheus-es/Orpheus-3b-Italian_Spanish-FT-Q8_0.gguf` |
| SNAC decoder weights | `hubertsiuzdak/snac_24khz`, pre-downloaded to the HF cache |
| llama-swap entry | `orpheus` (GPU, default pool) in `~/.config/llama-swap/config.yaml` |
| Express route | `server/src/routes/speech.js` |

`orpheus` is a single entry in the default exclusive pool, so it swaps like
every other GPU model: requesting speech evicts whatever was loaded, and
Orpheus is evicted in turn by the next chat or image request. It must **not**
be added to the `cpu-tts` group — that group exists so Kokoro can run without
touching the GPU, which is the opposite of what Orpheus does.

The child `llama-server` is killed when llama-swap stops the entry (SIGTERM
handler plus an `atexit` hook). Without that the child would outlive its
parent and keep holding VRAM that llama-swap believes it has reclaimed.
