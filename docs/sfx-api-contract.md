# Sound Effects API — Consumption Contract

**Service:** Text-to-Audio sound effects (Stable Audio Open 1.0, via ComfyUI)
**Base URL:** `http://192.168.0.109:4001/api`
**Auth:** none

Generation is asynchronous: `POST /sfx` returns a job id, then poll
`GET /sfx/job/:id` until the status is `done`.

---

## Start a job

```
POST /api/sfx
Content-Type: application/json
```

| Field | Required | Type | Description |
|---|:---:|---|---|
| `prompt` | yes | string | English description of the sound. Prompt in English — the model was trained on English tags |
| `negative` | no | string | What to avoid (e.g. `"music, voices"`) |
| `seconds` | no | number | `1`–`47` (default `10`) |
| `seed` | no | number | Fixed seed for reproducibility. Random when omitted |
| `steps` | no | number | `1`–`200` (default `50`) |
| `cfg` | no | number | Prompt adherence (default `5.0`) |

### Response `200`

```json
{ "jobId": "727f8a5f7ef353c1", "status": "queued" }
```

### Errors

| Code | Cause |
|---|---|
| `400` | Missing prompt |

---

## Poll the job

```
GET /api/sfx/job/:id
```

```json
{
  "jobId": "727f8a5f7ef353c1",
  "status": "done",
  "prompt": "heavy wooden door creaking open slowly",
  "error": null,
  "sfx": {
    "id": "d29a643e4d2bdb60",
    "file": "d29a643e4d2bdb60.mp3",
    "seconds": 8,
    "seed": 12345,
    "createdAt": 1784567065675
  }
}
```

`status` is one of `queued`, `preparing`, `rendering`, `done`, `error`.
When `error`, the reason is in `error`.

## Download the result

```
GET /sfx/<file>
```

Example: `http://192.168.0.109:4001/sfx/d29a643e4d2bdb60.mp3` — MP3, 320 kbps, 44.1 kHz.

---

## Library endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sfx?limit=20&offset=0` | List saved effects, newest first |
| `DELETE` | `/api/sfx/:id` | Delete a saved effect |

---

## Example — bash

```bash
JOB=$(curl -s http://192.168.0.109:4001/api/sfx \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"cinematic whoosh transition with deep sub bass tail","seconds":5}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["jobId"])')

while :; do
  R=$(curl -s "http://192.168.0.109:4001/api/sfx/job/$JOB")
  S=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])' <<<"$R")
  [ "$S" = "done" ] && break
  [ "$S" = "error" ] && { echo "$R"; exit 1; }
  sleep 5
done

FILE=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["sfx"]["file"])' <<<"$R")
curl -s -o efecto.mp3 "http://192.168.0.109:4001/sfx/$FILE"
```

---

## Notes for the consuming agent

- **Prompt in English.** Stable Audio Open was trained on English-tagged audio
  from Freesound and the Free Music Archive. Spanish prompts degrade badly.
- **Timing:** measured 35–46s per effect on an RTX 3070 at the default 50 steps,
  roughly independent of clip length. The first request after ComfyUI has been
  stopped adds its startup time. Poll every 5s and allow at least 300s.
- **This one uses the GPU**, unlike the Kokoro TTS service. Generating an effect
  calls `gpu.requireComfy()`, which stops the llama.cpp backends and starts
  ComfyUI. Chat and image models are evicted for the duration; text-to-speech is
  unaffected because Kokoro runs on CPU.
- **One at a time.** Requests queue inside ComfyUI; concurrent jobs serialize.
- **Licensing:** Stable Audio Open 1.0 is under the Stability AI Community
  License — free for commercial use below USD 1M annual revenue — and was
  trained on Creative Commons audio. Generated effects are safe for monetized
  video. The T5 text encoder is `google-t5/t5-base`, Apache 2.0.

---

## Deployment

| Piece | Path |
|---|---|
| Checkpoint | `/home/juan/comfyui/models/checkpoints/stable-audio-open-1.0.safetensors` (4.5 GB) |
| Text encoder | `/home/juan/comfyui/models/text_encoders/t5_base.safetensors` (850 MB) |
| Workflow | `server/templates/sfx-stable-audio.json` |
| Express route | `server/src/routes/sfx.js` |
| Output dir | `server/data/sfx/` served at `/sfx` |

The checkpoint does **not** contain a text encoder — it only holds the DiT
(`model.model.*`), the VAE (`pretransform.model.*`) and the duration embedders
(`conditioner.conditioners.*`). The workflow therefore loads T5 separately with
a `CLIPLoader` node set to type `stable_audio`. Wiring `CLIPTextEncode` to the
checkpoint's CLIP output instead fails with `clip input is invalid: None`.
