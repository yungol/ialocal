# Whisper Transcription API — Consumption Contract

**Service:** Speech-to-Text (Whisper large-v3-turbo, multilingual)
**Compatibility:** OpenAI Audio Transcriptions API
**Base URL:** `http://192.168.0.109:4001/v1`
**Auth:** none (send any `api_key`; it is ignored)

---

## Endpoint

```
POST /v1/audio/transcriptions
Content-Type: multipart/form-data
```

## Parameters (form-data)

| Field | Required | Type | Description |
|---|:---:|---|---|
| `file` | yes | binary | Audio to transcribe. Formats: mp3, wav, webm, opus, m4a, flac |
| `model` | yes | string | Use `"whisper"` |
| `language` | no | string | ISO-639 code (`es`, `en`, …). Omit for auto-detection |
| `response_format` | no | string | `json` (default), `text`, `verbose_json`, `srt`, `vtt` |
| `temperature` | no | number | `0.0`–`1.0` (default `0.0`) |

## Response `200` (format `json`)

```json
{ "text": "Full transcription of the audio." }
```

## Errors

| Code | Cause |
|---|---|
| `502` | Whisper engine unavailable (model failed to load / service down) |

---

## Example — curl

```bash
curl http://192.168.0.109:4001/v1/audio/transcriptions \
  -F file=@audio.mp3 \
  -F model=whisper \
  -F language=es
```

## Example — Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(base_url="http://192.168.0.109:4001/v1", api_key="unused")

with open("audio.mp3", "rb") as f:
    result = client.audio.transcriptions.create(
        model="whisper",
        file=f,
        language="es",
    )
print(result.text)
```

## Example — Node (OpenAI SDK)

```js
import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  baseURL: "http://192.168.0.109:4001/v1",
  apiKey: "unused",
});

const result = await client.audio.transcriptions.create({
  model: "whisper",
  file: fs.createReadStream("audio.mp3"),
  language: "es",
});
console.log(result.text);
```

---

## Notes for the consuming agent

- **First-request latency:** may take 3–8s (model loads into GPU on demand). Subsequent requests are immediate. Set the client timeout to >= 30s.
- **Concurrency:** one transcription at a time. Parallel requests are queued.
- **Network requirement:** the agent's machine must be on the same LAN as `192.168.0.109`.
- **No HTTPS:** plain HTTP. If the SDK requires `https`, force `http` in the `base_url`.
