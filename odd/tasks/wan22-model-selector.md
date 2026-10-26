# Wan 2.2 model selector

## Objective

Let the user choose between three Wan 2.2 video configurations from the existing "Crear video" modal, while leaving the current default workflow byte-identical.

## Problem

The app hardcodes one Wan 2.2 I2V configuration (`server/templates/video-wan22.json`): dual 14B high/low-noise FP8 with LightX2V v1 four-step LoRAs, 93 frames at 16 fps. Users cannot trade quality for duration, even though the host can run two additional Wan 2.2 variants with no hardware change.

## Why

The host is a single RTX 3070 (8 GB) with 31 GB RAM. Larger or newer families do not fit: LTX-2.3 distilled needs 38.98 GB of weights and was rejected on 2026-10-26. All three chosen variants belong to Wan 2.2, so they share the text encoder and never load concurrently.

## Scope

Three presets, one selector:

| Id | Label | Workflow | Notes |
|---|---|---|---|
| `wan22` | Wan 2.2 14B (actual) | `server/templates/video-wan22.json` | Default. Must not change. |
| `wan22-hq` | Wan 2.2 14B HQ | `server/templates/video-wan22-hq.json` (new) | Same base model, `_1022` rank-64 four-step LoRAs. Quality gain is unverified; the official LoRA repo claims no improvement. |

A third preset, `wan22-5b` (TI2V-5B, 8 s at 544x544), was implemented and validated end to end but removed on 2026-10-26 after the user judged its output clearly worse. Its weights are no longer referenced by the app.


## Constraints

- `server/templates/video-wan22.json` stays byte-identical. `git diff --exit-code` on it is a hard gate.
- One model family resident at a time; the existing `gpu.requireComfy()` serialization already enforces this.
- 5B frame count must satisfy `frames = 4k + 1` (4×32×32 VAE compression). 193 = 4×48 + 1.
- 5B needs `wan2.2_vae.safetensors` (48 channels). Using `wan_2.1_vae` fails silently with a shape error.
- Keep the existing aspect presets (528×528, 640×320, 320×640) so size behaviour is unchanged.
- Frontend is Vue 3 Options API with Tailwind v4. No Composition API.

## Acceptance criteria

- The modal shows a model selector with three options; Wan 14B is preselected.
- Selecting each option produces a job that completes and returns a playable video.
- Wan 14B output is unchanged: same dimensions, same frame count, same workflow file.
- Unknown model id falls back to the default rather than erroring.
- Server tests and client build pass.

## Checks

- `cd server && npm test`
- `cd server && npx eslint src/`
- `cd client && npm run lint && npm run build`
- `node --test client/src/components/images/videoModelDefaults.test.js`
- Runtime: one job per preset via `POST /api/video`.

## Tasks

- [x] T1 Install model files (LoRAs `_1022`, `wan2.2_ti2v_5B_fp16`, `wan2.2_vae`). No app code.
- [x] T2 Server: preset registry, template branching, per-preset dimensions and length writing in `server/src/routes/video.js`; new workflow templates.
- [x] T3 Client: model selector in the modal plus `model` in the request contract.
- [x] T4 Runtime validation of all three presets and confirmation that Wan output is unchanged.

## Route

- T1 inline shell (downloads, already running).
- T2/T3 one delegated writer (2+ non-trivial files, plus new templates).
- T4 inline bounded verification.

## Progress

- 2026-10-26: model files downloading to `/home/juan/comfyui/models`. Verified URLs and sizes: LoRAs 1.28 GiB, 5B 9.31 GiB, VAE 1.31 GiB.
- Host measurements: 31 GB RAM total; ComfyUI held ~20 GB in a stale cache, released to 27 GB available.
- 2026-10-26: all four files downloaded and header-verified (size matches declared tensor offsets).
- 2026-10-26: app selector implemented. `npm test` 41/41, eslint clean apart from one pre-existing warning, `video-wan22.json` byte-identical.
- 2026-10-26 runtime evidence, `wan22` default: ComfyUI history prompt `4d4681a0` used the v1 LoRAs; output 528x528, 16 fps, 93 frames, 5.8125 s.
- 2026-10-26 runtime evidence, `wan22-hq`: history prompt `0b94ba50` used the `_1022` rank-64 LoRAs; output 528x528, 16 fps, 93 frames, 5.8125 s.
- 2026-10-26: `wan22-5b` validated. ComfyUI history prompt `750aa01b` used `wan2.2_ti2v_5B_fp16`, `wan2.2_vae`, `Wan22ImageToVideoLatent` 544x544x193, `ModelSamplingSD3` shift 8, KSampler 20 steps / cfg 5 / uni_pc / simple, `CreateVideo` 24 fps. Output: 544x544, 24 fps, 193 frames, 8.0417 s. Render took roughly 4 minutes of queue time, well under the 20-minute app timeout.

## Outcome

Two presets ship: `wan22` (default, untouched baseline) and `wan22-hq` (same base model, newer `_1022` rank-64 LoRAs). The `wan22-5b` preset was implemented, validated, then removed on 2026-10-26 after user testing found the output clearly worse; its template was deleted and both test suites assert the id now falls back to `wan22`.

Final state: server suite 39/39 passing, client defaults suite 5/5, `video-wan22.json` byte-identical (sha256 `6ca8df85…b8f6b9`).

## Open decision

- `wan22-hq` kept: the user compared both outputs and judged HQ slightly better. This is a subjective A/B verdict, not a measured benchmark. The official `lightx2v/Wan2.2-Distill-Loras` README still documents `1022` only as a version number with no changelog, and both presets share the same base UNET, so the improvement is a modest refinement rather than a model upgrade.



## Known gaps

- Saved video metadata (`server/data/videos/index.json`) does not record which preset produced the file. The job response does. Worth adding if per-preset history matters.
- The app waits 20 minutes for ComfyUI output (`comfyui.js:126`). A slow 5B render could exceed that even when ComfyUI eventually succeeds.

## Next step

T4: confirm the 5B render completes and capture its real dimensions, fps and duration.
