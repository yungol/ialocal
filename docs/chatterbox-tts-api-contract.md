# Chatterbox TTS API — Consumption Contract

**Service:** Text-to-Speech (Chatterbox Multilingual, voice cloning)
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
| `model` | yes | string | Must be `"chatterbox"` — omitting it routes to Kokoro |
| `voice` | yes | string | Name of a reference clip. See Voices |
| `response_format` | no | string | `mp3` (default), `wav`, `flac`, `opus`, `ogg` |
| `speed` | no | number | `0.5`–`2.0` (default `1.0`), pitch-preserving |
| `exaggeration` | no | number | `0.0`–`1.0` (default `0.5`). Expressiveness |
| `cfg_weight` | no | number | `0.0`–`1.0` (default `0.5`). Lower speaks faster |
| `temperature` | no | number | `0.05`–`2.0` (default `0.8`) |
| `seed` | no | integer | Fix it to make a take reproducible |

Blank lines in `input` become a 300ms pause, same convention as Kokoro and
Orpheus. Long input is split into sentence-bounded chunks of up to 200
characters and generated sequentially.

## Response `200`

Raw audio bytes at 24kHz mono. `Content-Type` matches the requested format.

## Errors

| Code | Cause |
|---|---|
| `400` | Empty input, over 20000 chars, unknown voice, or unsupported format |
| `503` | No reference clips installed |
| `502` | Engine unavailable |

---

## Voices

There is **no fixed voice catalogue**. Every audio file in
`/home/juan/models/chatterbox-voices/` is a voice, named after the file:
`juan.wav` → `{"voice": "juan"}`. Adding a voice means dropping a file in that
directory — no restart, no code change.

Installed:

| Voice | Source |
|---|---|
| `juan` | 25.8s extracted from the owner's own YouTube video |
| `demo` | 11s of Kokoro's `alex`, kept as a pipeline smoke test |

`GET /v1/voices` on the Express server lists these alongside the Kokoro and
Orpheus voices, each tagged with `engine`. It reads the directory from disk, so
it never starts the model just to list names.

### Recording a good reference

Quality of the clone is dominated by the reference clip, not by any parameter:

- **20–30 seconds.** Longer does not help.
- **Voice only.** No music, no second speaker. The model does not separate
  sources; a music bed gets baked into the timbre.
- **Speak the way you want it to narrate.** It copies pace and energy, not just
  timbre.
- **Low reverb**, consistent level, no cuts.
- Any format `soundfile` reads; it resamples internally.

---

## Example — curl

```bash
curl http://192.168.0.109:4001/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"chatterbox","voice":"juan","input":"Bienvenidos a este video.","response_format":"mp3"}' \
  --output narracion.mp3
```

## Example — Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(base_url="http://192.168.0.109:4001/v1", api_key="unused")

response = client.audio.speech.create(
    model="chatterbox",
    voice="juan",
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
  model: "chatterbox",
  voice: "juan",
  input: "Bienvenidos a este video.",
  response_format: "mp3",
});

fs.writeFileSync("narracion.mp3", Buffer.from(await response.arrayBuffer()));
```

---

## Notes for the consuming agent

- **The voice does not drift across a script.** This is the reason to prefer it
  over Orpheus. Orpheus names its speaker in the prompt and therefore
  re-invents it on every generation, so a multi-sentence script comes back in
  several voices. Chatterbox extracts one speaker embedding from the reference
  clip, caches it, and conditions every chunk on that same tensor. Measured on
  a 4-chunk script: chunk-to-chunk speaker similarity mean 0.9365, min 0.9185,
  std 0.0149; chunk-to-reference mean 0.9215.
- **Faster than realtime: measured 0.39x** — 32.16s of audio generated in
  12.5s, warm. Kokoro is still faster (CPU, ~5x realtime) but Chatterbox beats
  Orpheus by roughly 2.6x.
- **Cold start ~7s** on top of that (measured: 15.6s wall for 8.8s of audio on
  a cold request). Unloads after 30 minutes idle.
- **Runs on GPU** (~3.2GB VRAM). The Express route calls `gpu.requireLlama()`
  before forwarding, so a speech request can evict a loaded image/video
  session — same as Orpheus, opposite of Kokoro.
- **Content fidelity was checked, not assumed:** a generated 4-chunk take was
  transcribed with the local Whisper and matched the input text word for word.
  The `token_repetition` warnings in the log are the model's own repetition
  detector closing a generation cleanly, not a defect in the output.
- **Every output is watermarked.** Resemble's Perth neural watermark is applied
  to all generated audio. It is inaudible and survives MP3 compression. Nothing
  to configure, but be aware it is there.
- **Licensing:** MIT, commercial use permitted. Cloning a voice you do not have
  permission to use is a separate legal question the license does not address.
- **Language:** the 23-language multilingual checkpoint with `language_id="es"`.
  A dedicated Latin American Spanish checkpoint exists
  (`ResembleAI/Chatterbox-Multilingual-es-mx-latam`, MIT, ungated) and is not
  wired up yet — a likely quality upgrade for es-419 narration.
- **Network requirement:** same LAN as `192.168.0.109`. Plain HTTP, no TLS.

---

## Deployment

| Piece | Path |
|---|---|
| Server | `/home/juan/bin/chatterbox-tts/server.py` |
| venv | `/home/juan/bin/chatterbox-tts/venv` |
| Launcher | `/home/juan/bin/chatterbox-server` |
| Weights | `ResembleAI/chatterbox`, HF cache |
| Reference clips | `/home/juan/models/chatterbox-voices/` |
| llama-swap entry | `chatterbox` (GPU, default pool) |
| Express route | `server/src/routes/speech.js` |

`chatterbox` sits in the default exclusive pool, so it swaps like every other
GPU model. It must **not** be added to the `cpu-tts` group — that group exists
so Kokoro can run without touching the GPU.
