# Add FLUX3 Klein without changing existing models

## Objective and boundary

Add the distilled FLUX3 Klein image model as a new selector entry using the existing llama-swap lifecycle. This provides another image-generation option without replacing models, changing their defaults, or assuming concurrent model residency. Target hardware: RTX 3070, 8 GB VRAM, 32 GB system RAM.

F3-1/F3-2 are committed. The user explicitly consented while the build ran to activation, idle reload, generation, and memory-unload testing; activation, the sole authorized HUP, and both generation/automatic-unload checks are now done. The current authorization is documentation-only reconciliation of this file and `docs/images-api-contract.md`. No further inference, service/config/source/asset/binary change, external evidence write, Git staging/commit/push, or children are authorized. The parent owns final independent verification, delivery disposition, and Git actions; the size decision below is required before the next commit.

| Context | Recorded baseline |
| --- | --- |
| Repository / branch | `/home/juan/codigo/servidorIA` / `feat/bonsai-model-path` |
| Source baseline | `89e594b` — user-requested baseline commit already complete |
| Preserved work | Parent reports all pre-existing source changes saved, excluding dirty `.atl` registry files and untracked `m.json` / `p.json` runtime captures; leave these untouched |
| Delivery | `ask-on-risk` guard triggered above approximately 400 authored feature lines; user decision required before the next commit; no chain or size exception approved |
| Forecast | 120–240 authored lines plus 8–12 YAML lines; record actual running count after implementation |

## Tasks and delegation routes

F3-1 and F3-2 are complete work units. F3-3 is delegated to this single writer/operator with explicit shared-service consent. The parent alone routes tasks; this writer does not spawn children.

**F3-1 status:** completed in parent-owned commit `bc7616930c8b9e77f0292e33ed8826188db77a3f` (observed HEAD at that handoff). Parent reports independent verification passed focused tests 3+3, server tests 30, and diff checking; parent spot-check passed client tests 3/3. Native review was unavailable (`immutable_review_transport_unsupported`, `mutation_not_started`), not approved; mode remains ON. Committed-only assessment was also unassessable due to then-unvalidated runtime. Do not retry native commands or toggle review. Subsequent bounded runtime proof is recorded below.

**F3-2 status:** complete in parent-owned commit `bda5b0ea74f770687c3433fffbde2e24d3b64483` (observed HEAD). Parent reports fresh independent verification passed hashes, preserved bytes, source/binary/assets, and semantic YAML; parent spot-check confirmed active/backup/staged hashes. Document diff was +62/-10. Native review remains unavailable, not approved, mode ON; no retry or toggle is authorized.

**F3-3 status:** implemented and writer runtime checks passed at 512×512 and 576×1024, including automatic TTL unload and memory return. The initial catalog incident was cleared by fresh independent audit and the revised checks passed before/after inference. Parent visual/API spot-checks passed as recorded below. No additional activation, HUP, config/source/binary/asset change, or manual unload occurred. Leave unchecked pending final independent verification, delivery-size decision, and parent-owned work-unit commit; no native approval is claimed. Results are limited to the two tested sizes, not a general quality, speed, or capacity guarantee.

- [x] **F3-1 — Add application catalog, defaults, tests, and contract documentation.** Completed files: `server/src/routes/models.js`, new `server/src/routes/models.test.js`, `client/src/components/images/ImageGenView.vue`, new `client/src/components/images/imageModelDefaults.js`, new `client/src/components/images/imageModelDefaults.test.js`, and `docs/images-api-contract.md`. Added only the new model, with no edit capabilities. Defaults: 16 steps, CFG 1, existing 576×1024 dimensions; Euler belongs to later backend configuration. Existing defaults and capability gates were preserved. Deterministic default test-first RED → GREEN → refactor evidence appears below; no strict TDD configuration was found in parent context. Tests and docs accompany the behavior in the parent-owned commit.
- [x] **F3-2 — Prepare an isolated pinned CUDA backend, verified assets, and staged configuration.** Completed the isolated pinned build, both integrity-verified GGUF assets, reusable VAE verification, and staged additive `flux3-klein` stanza with TTL 120. All other entries/groups and LLM 3600/TTS 1800 policies were preserved. Independent verification and parent-owned commit are recorded above; no activation or inference occurred during F3-2.
- [ ] **F3-3 — Activate and verify generation plus unload.** Explicit user consent is received; activation and one idle HUP are already done. After the fresh audit, recheck idleness and three catalogs using the revised upstream invariant (exclude only request-time `created`), generate through the application at 512×512 and conditionally 576×1024, then observe automatic TTL unload. Preserve old models; no extra old-model inference, service/config action, or blind recovery. Parent verification and commit remain necessary; native approval is not implied.

## F3-2 preparation pins and external boundaries

Historical F3-2 surfaces below are now read-only. The completed F3-3 activation used the separately authorized active YAML replacement; runtime evidence was subsequently written under separate authorization. This final docs-only batch authorizes no external writes:

| Surface | Constraint |
| --- | --- |
| `/home/juan/codigo/stable-diffusion-flux3/` | Isolated new checkout; preserve the old checkout unchanged |
| `/home/juan/bin/sd-server-flux3` | Isolated new binary; `/home/juan/bin/sd-server` must remain unchanged |
| `/home/juan/models/flux3-klein/` | New model asset directory |
| `/home/juan/.config/llama-swap/config.flux3-next.yaml` | Staged config only; confirm absent and never overwrite |
| `/home/juan/.config/llama-swap/config.pre-flux3.yaml` | Backup destination; confirm absent and never overwrite |
| `/home/juan/.config/llama-swap/config.yaml` | Already activated; read-only during resumed F3-3 checks |

Backend source commit: `e41fbcf455e0fbb45e08bd535b00d6cba865e921`, tag `master-1015-e41fbcf`; ggml gitlink `a5915eb0e47adef21c3f25b889a008925ea838c2`. Build for SM86 with CUDA 12 and GCC 12, parallelism 2, static libraries; disable frontend, WebP, and WebM to avoid implicit pnpm execution. The parent supplied exact configure/build commands and pinned public HTTPS source/model URLs; no environment or dependency mutation is authorized if these fail.

| Asset | Expected bytes | SHA-256 |
| --- | ---: | --- |
| `flux3-image-klein-Q4_0.gguf` | 3514023104 | `22d0b1fa05f5ef63fa68eebe801a680e0456cb786af28be5952e10fb5c9004b2` |
| `Qwen3VL-4B-Instruct-Q4_K_M.gguf` | 2497281664 | `66358cb18bb6b3b1b6675aa412c7a88ef01d228f481184d13668e5201c730a0a` |
| Existing reusable FLUX2 VAE | Verify existing file; no replacement | `868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3` |

Both asset pins and the existing VAE hash were verified during F3-2 (evidence below). Keep only one model resident within the 8 GB VRAM budget. Resumed F3-3 established successful generation at the two tested sizes with sampled memory below 8 GB; larger workloads and general performance remain unvalidated.

## Verification for authorized F3-1

Format only touched JavaScript/Vue files using installed Prettier and explicit paths. Run focused deterministic tests first, capturing the intended RED before implementation and GREEN afterward. Then run each exact check in the foreground and record its observed result:

```sh
node --test server/src/routes/models.test.js
node --test client/src/components/images/imageModelDefaults.test.js
npm --prefix server test
npm --prefix server run lint
npm --prefix client run lint
npm --prefix client run build
```

Historical F3-1 build authorization included generated `client/dist`. Parent reports baseline server/client lint and client build passed, with dynamic-import/chunk warnings; these are prior evidence, not new results. The parent spot-check and subsequent F3-3 runtime proof are recorded separately. No build or runtime command is authorized for this docs-only reconciliation.

## Review, commits, and rollback

Native review remains on by default. After implementation, the parent follows provider transitions and owns independent assessment plus checks; never fabricate a pass. The review candidate is a commit or coherent slice against the prior reviewed boundary, not a task checkbox. Parent owns candidate disposition, task commits after fresh review and actual verification, and terminal Git actions; no push. Record future commit identities and authored running counts only when observed. No chain has been selected; raise delivery risk rather than compressing necessary tests or documentation to fit a line budget.

Rollback is additive-only: remove the new selector/catalog/defaults behavior and its dedicated tests/docs additions, the `flux3-klein` stanza, and new isolated assets/binary/checkout as appropriate under separate authorization. The stanza is now active; removing it would require an independently authorized service procedure. Preserve all old models, groups, defaults, binaries, and checkouts; no rollback operation is authorized now.

For the implemented F3-1 boundary alone, remove the appended catalog row and FLUX3 docs/tests, and reverse the pure-defaults extraction by restoring the original in-component constants and fallback expression. Preserve every baseline value and capability gate. No stanza, asset, or external binary was changed in F3-1.

## Progress, evidence, and next step

- Planning evidence: branch `feat/bonsai-model-path` and HEAD `89e594b` observed; target document was absent. Dirty `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md`, and untracked `m.json` / `p.json` were observed and preserved.
- F3-1/F3-2 are checked and committed, with independent checks reported above but no native approval. F3-3 is authorized and unchecked; its current runtime evidence is recorded separately below.
- RED observed before production edits: server focused tests passed 1/3, failing on FLUX3 size `null` versus 3514023104 and the missing fallback row; client tests passed 2/3, failing on undefined FLUX3 defaults. These were assertion failures, not loader failures. Client RED exercised actual in-component constants through a temporary isolated test adapter.
- GREEN observed after the minimal additive implementation: both focused commands passed 3/3. Refactor then extracted the constants and existing fallback expression into the pure module; tests now import it directly. Both final focused checks remained green. Alternate cases cover unchanged fallback ordering/paths/classification/capabilities, upstream authority, absent assets, existing defaults, and unknown/empty model selection.
- Normalization: installed Prettier ran successfully against only the two touched server JavaScript files and three touched client JavaScript/Vue files. Its touched-component formatting also normalized two existing expressions without behavior changes. A first task-document patch failed to match a partial long line and made no changes; a corrected patch succeeded.
- F3-1 observed committed diff against `89e594b`: 185 additions and 18 deletions for application/tests/API docs, plus 93 feature-document additions, totaling 278 additions and 18 deletions (296 changed lines). Generated `client/dist` is ignored by Git. F3-2 adds eight external staged YAML lines plus this evidence update; the parent records its eventual committed count/identity. The 400-line heuristic remains advisory; no chain was selected.

| Exact final command | Observed result |
| --- | --- |
| `node --test server/src/routes/models.test.js` | PASS, 3/3 |
| `node --test client/src/components/images/imageModelDefaults.test.js` | PASS, 3/3 |
| `npm --prefix server test` | PASS, 30/30 |
| `npm --prefix server run lint` | PASS, zero errors; one untouched `searchContext.js:69` unused `web_search` warning |
| `npm --prefix client run lint` | PASS, no warnings |
| `npm --prefix client run build` | PASS; dynamic/static import and chunk-size warnings; generated `client/dist` |

All six final F3-1 commands ran individually in the foreground after touched-file formatting. At that handoff no runtime harness had run; separate F3-3 shared-service consent was subsequently granted and its observed runtime proof appears below. The deterministic F3-1 checks alone did not establish runtime readiness.
- Engram mirror pending: project detection is ambiguous between `ialocal` and `servidoria`, and no authoritative session ID was supplied. Do not guess an identity or claim a mirror was saved; retain this local feature document for the parent.
- Next step: parent obtains the user delivery-size decision before the next commit and performs final independent verification, then owns any F3-3 work-unit commit. Parent visual/API spot-checks are already complete, and this batch reconciles the API readiness wording. No retry, restore, restart, or additional HUP occurred during continuation. Native review remains ON but unavailable, not approved; no retry or toggle is authorized. F3-3 remains unchecked and no commit identity is invented.

## F3-2 observed provisioning evidence

All eight named destinations were absent before writes (including both `.part` paths). The parent-reported local host is `192.168.0.109`; no remote access was used. The isolated checkout is clean after building. No old checkout, binary, model, active configuration, service, or application source was modified. Both downloads used public unauthenticated HTTPS only, with curl configuration disabled, HTTPS-only redirects, exclusive `.part` creation, no automatic retries, and verified size/hash before same-directory atomic rename. No `.part` artifact remains.

### Source and build

```sh
env GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c core.hooksPath=/dev/null clone --branch master-1015-e41fbcf --single-branch --depth 1 https://github.com/leejet/stable-diffusion.cpp.git /home/juan/codigo/stable-diffusion-flux3
env GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c core.hooksPath=/dev/null -C /home/juan/codigo/stable-diffusion-flux3 submodule update --init --depth 1 ggml
cmake -S /home/juan/codigo/stable-diffusion-flux3 -B /home/juan/codigo/stable-diffusion-flux3/build -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=/usr/bin/gcc-12 -DCMAKE_CXX_COMPILER=/usr/bin/g++-12 -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/g++-12 -DCMAKE_CUDA_ARCHITECTURES=86 -DSD_CUDA=ON -DSD_USE_UPSTREAM_GGML=OFF -DSD_BUILD_SHARED_LIBS=OFF -DSD_BUILD_SHARED_GGML_LIB=OFF -DSD_SERVER_BUILD_FRONTEND=OFF -DSD_WEBP=OFF -DSD_WEBM=OFF
cmake --build /home/juan/codigo/stable-diffusion-flux3/build --target sd-server --parallel 2
```

All four commands passed in the foreground. `git -C /home/juan/codigo/stable-diffusion-flux3 rev-parse HEAD` matched `e41fbcf455e0fbb45e08bd535b00d6cba865e921`; `git -C /home/juan/codigo/stable-diffusion-flux3/ggml rev-parse HEAD` matched `a5915eb0e47adef21c3f25b889a008925ea838c2` (also checked against the parent gitlink). Configure reported 3.1 seconds; build wall interval was 2026-10-26 14:29:20–14:46:45 UTC, approximately 17m25s. Actual compiler versions: GCC/G++ 12.4.0 and CUDA 12.0.140; cache confirms SM86. No toolchain workaround or installation occurred. Configure warnings: missing optional ccache/NCCL. Build succeeded with upstream CPU enum, SageAttention unused/expression, and SenseNova overread warnings; no upstream patch was applied.

`ldd` and `readelf -h/-d` inspected `build/bin/sd-server` before copying to the exclusively new `/home/juan/bin/sd-server-flux3`; all dependencies resolve to system libraries, with no private checkout libraries, missing libraries, or RPATH requirement. Installed binary inspection also confirmed ELF64 x86-64. The static application/ggml build still depends on system CUDA, OpenMP, C++, and libc shared libraries. Source-output and installed hashes match: `1357133aae0e3861498432ccfaaaf9633674b913158e12dacdaebc883abcf347`. Copy emitted a non-portability warning for `cp --no-clobber`, but succeeded without replacing a destination.

`/home/juan/bin/sd-server-flux3 --version` passed: `stable-diffusion.cpp version master-1015-e41fbcf, commit e41fbcf`. `/home/juan/bin/sd-server-flux3 --help` passed and confirmed all staged flags, including Euler, `--llm`, and `--offload-to-cpu`. `--diffusion-fa` is supported but deprecated in this pinned release. Both commands exit without starting a listener or loading weights; source control flow was inspected before invocation.

### Assets and unchanged identities

| Download source (immutable HTTPS revision) | Verified size and SHA-256 | Measured download time |
| --- | --- | --- |
| `https://huggingface.co/leejet/flux-3-image-klein-GGUF/resolve/1c2ad2f9b9247ccca6506a23bdb033fdb0873321/flux3-image-klein-Q4_0.gguf` | 3514023104 bytes; `22d0b1fa05f5ef63fa68eebe801a680e0456cb786af28be5952e10fb5c9004b2` | 396.58 seconds |
| `https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/1cd86afb9a95c410a6038ab3b40d8b578c892266/Qwen3VL-4B-Instruct-Q4_K_M.gguf` | 2497281664 bytes; `66358cb18bb6b3b1b6675aa412c7a88ef01d228f481184d13668e5201c730a0a` | 285.40 seconds |

Both final assets live under `/home/juan/models/flux3-klein/`; combined size is 6011304768 bytes. `stat --format='%s %n'` and `sha256sum` passed for each `.part` before rename and for both final files afterward. Public downloads required no account, credentials, or license-consent action. Durations exclude hashing; clone/install duration was not separately measured.

| Protected or staged path | Observed SHA-256 |
| --- | --- |
| `/home/juan/.config/llama-swap/config.yaml` (unchanged before/after) | `24b018254054afcbe5f6f2d62b1898ca1eba433bfc0456c508dda4549684bdef` |
| `/home/juan/bin/sd-server` (unchanged before/after) | `c1cc3dc654d8006f8a6891bb147bfeeda94a43a3d35ba501a477ac4b9e885161` |
| `/home/juan/models/flux2-vae.safetensors` (unchanged before/after) | `868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3` |
| `/home/juan/.config/llama-swap/config.pre-flux3.yaml` (exclusive byte-for-byte backup) | `24b018254054afcbe5f6f2d62b1898ca1eba433bfc0456c508dda4549684bdef` |
| `/home/juan/.config/llama-swap/config.flux3-next.yaml` (staged only) | `3af015f1c5e952f2417689dfff00e2ee56ad3d9e2cdd2d76768683923ee2232e` |

### Staged configuration verification

Existing PyYAML 6.0.1 parsed the snapshot and staged result without any dependency installation. A foreground Python assertion checked semantic equality after removing only `models.flux3-klein`, exact preservation of all other bytes after removing the eight-line insertion, unchanged active-snapshot identity during preparation, and exclusive backup/staged creation. A separate final foreground assertion rechecked semantic/byte preservation, active-versus-backup identity, exact new command, endpoint `/`, TTL 120, and `capabilities.out: [image]`. No preload or group was added. Existing FLUX2/Juggernaut TTL 120, all LLM TTLs 3600, all TTS TTLs 1800, and every other global/model/group value remain unchanged. No native llama-swap parser validation was attempted because no documented check-only invocation was established; PyYAML plus exact byte/semantic checks are the disclosed substitute, not proof of service acceptance.

The staged command is:

```text
/home/juan/bin/sd-server-flux3 --listen-ip 127.0.0.1 --listen-port ${PORT} --diffusion-model /home/juan/models/flux3-klein/flux3-image-klein-Q4_0.gguf --vae /home/juan/models/flux2-vae.safetensors --llm /home/juan/models/flux3-klein/Qwen3VL-4B-Instruct-Q4_K_M.gguf --steps 16 --cfg-scale 1.0 --sampling-method euler --diffusion-fa --offload-to-cpu
```

Historical F3-2 TDD exception: pinned binary/model provisioning had no meaningful behavior-level RED; supply-chain pins, compiler configuration, ELF dependencies, safe version/help exits, integrity checks, and additive YAML assertions were its verification boundary. All static checks passed; generation/unload and memory observations were then unvalidated and were subsequently exercised in separately authorized F3-3 below. Native review remains unavailable and no approval is claimed. Engram mirror remains pending; no identity was guessed.

Historical F3-2 handoff: `git diff --check -- odd/tasks/add-flux3-klein.md` passed with no output; parent verification and commit were then pending and are now complete as recorded above. F3-3 is now explicitly authorized, not blocked on consent.

## Historical F3-3 activation and initial incident

The explicit user consent described above was received while F3-2 built. Preflight observed HEAD `bda5b0ea74f770687c3433fffbde2e24d3b64483`; unrelated `.atl` changes and `m.json` / `p.json` remained untouched. The activation temporary path and evidence directory were absent. Fresh hashes matched the required old active/backup and staged pins before any external write.

### Idle gate and one activation

Reproducible foreground script shape: Python `urllib.request` GETs with 10-second timeouts captured the three catalog snapshots in memory; a bounded `/api/events` SSE reader decoded its nested JSON `modelStatus` and `inflight` snapshots, discarded log events, and closed immediately after both snapshots. Initial exploratory SSE windows ended with expected two-second timeouts, not service failures. No historical log content was printed or retained.

Immediately before replacement, `/running` was `{"running":[]}`, all 13 model states were `stopped`, and inflight `total` was 0. `systemctl --user is-active llama-swap.service` returned `active`; the ComfyUI unit was `inactive`. `nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader,nounits` returned no compute processes. `nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits` reported 395 MiB used / 8192 MiB total, 0% utilization. These checks establish sampled idleness, not a global concurrency lease; a client can race after the snapshot.

The script asserted semantic preservation against the old config, exclusive-created `config.flux3-activate.yaml`, copied exact verified stage bytes, preserved mode `0664` with `fchmod`, flushed/fsynced, rechecked old/staged/backup bytes, and atomically replaced the active YAML. It then issued exactly one permitted service action (exit 0):

```sh
systemctl --user kill --kill-whom=main --signal=HUP llama-swap.service
```

`systemctl --user is-active llama-swap.service` afterward returned `active`. No restart, extra HUP, unload, restore, watcher change, or other forced service action was attempted.

### Catalog results and incident boundary

Before activation, these exact URLs each returned HTTP 200 and the same 13 catalog IDs: `agents-a1-4b`, `bonsai`, `chatterbox`, `flux2-klein`, `gemma4`, `gemma4-vision`, `juggernaut-z`, `kokoro`, `orpheus`, `qwen-claude-opus`, `qwen3-8b`, `qwen36-35b-a3b-vision`, `whisper`.

| Exact GET URL | After HUP |
| --- | --- |
| `http://127.0.0.1:8080/v1/models` | HTTP 200, then full existing-row equality assertion failed |
| `http://127.0.0.1:4001/api/models` | Not reached after incident |
| `http://127.0.0.1:5173/api/models` | Not reached after incident |

The verification script compared the complete post-reload upstream rows (excluding `flux3-klein`) against the saved pre-reload rows and raised `AssertionError: Existing catalog rows changed: stop`. Changed fields were not audited; this does **not** establish a semantic regression or reload failure. FLUX3 visibility/type/size/edit assertions came after that assertion and were therefore not reached. Per the stop-on-incident contract, no retry, diagnostic HTTP fetch, rollback, runtime flag change, or generation followed. Parent fresh audit must distinguish identity/capability changes from other row metadata before authorizing continuation.

### Functional checks not executed

No POST was sent to `http://127.0.0.1:4001/v1/images/generations`. The authorized but skipped first payload was:

```json
{"model":"flux3-klein","prompt":"A small red ceramic teapot on a wooden table, soft daylight, clean studio photograph. <sd_cpp_extra_args>{\"seed\":42,\"negative_prompt\":\"\",\"sample_params\":{\"sample_steps\":16,\"guidance\":{\"txt_cfg\":1.0}}}</sd_cpp_extra_args>","size":"512x512"}
```

The same payload with `size: "576x1024"` was conditional on first-request success and sampled peak below 7 GB; it was also skipped. Planned script shape was a 360-second foreground application request, in-memory response parsing/base64 decode, PNG signature/IHDR dimension checks, exclusive proof-file writes, and a joined one-second `nvidia-smi` sampling thread. No such request or monitor started. Consequently no PNG files, dimensions, generation wall times, sampled inference peak, or quality/fit claims exist. The bounded 15-second `/running` checks up to 180 seconds, FLUX3 process-absence check, and post-inference GPU measurement were skipped because no successful generation occurred; TTL unload remains unvalidated.

### Preserved state and handoff

Final `sha256sum` checks confirmed active YAML equals the staged pin `3af015f1c5e952f2417689dfff00e2ee56ad3d9e2cdd2d76768683923ee2232e`; the backup remains `24b018254054afcbe5f6f2d62b1898ca1eba433bfc0456c508dda4549684bdef`, and the staged file remains unchanged. Old `/home/juan/bin/sd-server` remains `c1cc3dc654d8006f8a6891bb147bfeeda94a43a3d35ba501a477ac4b9e885161`. `stat --format='%a %n' /home/juan/.config/llama-swap/config.yaml` confirmed mode 664; the activation temporary file is absent after replacement. Semantic preservation was asserted before activation, and final active/staged byte identity preserves every previously verified old model command, TTL, group, and global value.

Sanitized evidence is under `/home/juan/codigo/stable-diffusion-flux3/build/flux3-validation/`: `activation.json` contains pre-catalog rows, idle metrics, mode/hash, HUP result, and timestamp; `incident.json` records the failed assertion and skipped checks. No post-catalog success artifact or smoke PNG was created. `git diff --check -- odd/tasks/add-flux3-klein.md` passed with no output after recording this incident. One task-document patch failed to match a stale line and made no changes; the corrected patch succeeded. Runtime integration has no meaningful RED; earlier deterministic unit RED/GREEN remains historical evidence only. F3-3 is partial and unchecked pending parent fresh audit, independent runtime verification, and commit. Native approval and an Engram mirror remain unclaimed.

## Resumed F3-3: audited catalogs, generation, and automatic unload

### Incident reconciliation and unchanged state

Fresh independent parent audit cleared the incident: the current upstream mismatch was only dynamic integer request-time `created` metadata. All 13 old IDs/other upstream fields were preserved, both application catalogs retained old rows exactly, and FLUX3 was visible as image/3514023104 bytes/edit null. The original failing response was not retained; this conclusion independently demonstrates current timestamp-only behavior, not reconstruction of that response. Historical `activation.json` and `incident.json` remain unchanged. The parent explicitly authorized continuation without configuration repair, reload, or another HUP.

This writer rechecked the pinned source and ggml commits, active/staged/backup hashes, and old/new binary hashes before and after runtime checks; all matched the earlier inventory. Active and staged YAML remain `3af015f1c5e952f2417689dfff00e2ee56ad3d9e2cdd2d76768683923ee2232e`, backup remains `24b018254054afcbe5f6f2d62b1898ca1eba433bfc0456c508dda4549684bdef`, old binary remains `c1cc3dc654d8006f8a6891bb147bfeeda94a43a3d35ba501a477ac4b9e885161`, and new binary remains `1357133aae0e3861498432ccfaaaf9633674b913158e12dacdaebc883abcf347`. No production source changed, so unchanged unit suites were not rerun.

### Reproducible foreground command and catalog invariant

```sh
python3 /home/juan/codigo/stable-diffusion-flux3/build/flux3-validation/runtime-smoke.py
```

Observed exit 0; `runtime.json` status `passed`. The script exclusively creates the two proof PNGs and condensed metrics, issues one application POST per tested size with a 360-second HTTP timeout, joins its one-second GPU sampler after each response, and bounds lifecycle observations to 13 snapshots spaced 15 seconds apart. It never starts/stops/reloads services, mutates configuration, calls model-upstream statistics, or manually unloads. No raw response/base64 or historical logs are stored. Proof paths and metrics destination were absent before execution.

The script GETs all three catalog URLs before and after inference. Every request returned HTTP 200 with exactly the original 13 IDs plus `flux3-klein`. Upstream comparisons exclude **only** `created`, additionally asserting that every `created` value is an integer within the request-time window; all other upstream fields/order remain equal. Application old rows match the saved baseline exactly, with no excluded fields.

| Exact catalog URL | Before and after runtime checks |
| --- | --- |
| `http://127.0.0.1:8080/v1/models` | PASS, 14 IDs, stable upstream fields preserved; dynamic `created` validated |
| `http://127.0.0.1:4001/api/models` | PASS, 14 IDs; FLUX3 type image, size 3514023104, edit null; old rows exact |
| `http://127.0.0.1:5173/api/models` | PASS, same application invariant through Vite |

Immediately before generation, all 14 SSE model states were stopped, inflight was 0, `/running` was empty, the service was active, ComfyUI was inactive, and no GPU compute process was present. GPU baseline was 395/8192 MiB, 0% utilization. This is a sampled idle gate, not a global concurrency lock.

### Two application generation results

Both POSTs used `http://127.0.0.1:4001/v1/images/generations`, the exact teapot prompt/extra-args JSON recorded above (seed 42, negative prompt empty, 16 steps, CFG 1), and only differed in `size`. Neither used a direct sd-server bypass or gallery API. The first sampled peak was below 7 GiB, authorizing the conditional portrait request.

| Size / actual PNG dimensions | HTTP | Wall time | Baseline / sampled total GPU peak | Proof file / bytes |
| --- | --- | --- | --- | --- |
| 512×512 | 200 | 8.204 s including cold start | 395 / 3747 MiB; 9 samples | `smoke-512.png`, 472774 bytes |
| 576×1024 | 200 | 10.329 s, already-running model | 735 / 4107 MiB; 11 samples | `smoke-576x1024.png`, 1064340 bytes |

Files are under `/home/juan/codigo/stable-diffusion-flux3/build/flux3-validation/`. In-memory decoding verified nonempty PNG signature/IHDR dimensions; a subsequent read-only Python check validated every chunk CRC, IDAT presence, terminal IEND, and exact file lengths. PNG SHA-256 values: `smoke-512.png` is `aef98752d6f0982261d30f266ef5d6573b6462857eecc198ca807d91c3d53a62`; `smoke-576x1024.png` is `9690530084720bbb84011df9b8bc6af874b9ef6ead4ff95329ee8826988cedf1`. Reported peaks are one-second samples of total GPU memory, not true instantaneous maxima or model-only usage. No sampling errors occurred.

### Automatic TTL unload and final checks

After the last response, `/running` contained only FLUX3 and its SSE state was ready. Read-only `/running` plus initial SSE snapshots every 15 seconds showed no inflight requests or other-model activity throughout. FLUX3 remained ready at 120.019 seconds and was absent/stopped at 135.020 seconds, locating automatic unload in `(120.019, 135.020]` seconds after the response, consistent with the existing 120-second policy plus observation/check scheduling. No manual unload or intervening generation was used. `pgrep -x sd-server-flux3` returned no process. GPU returned to 396/8192 MiB and 0% utilization, versus 395 MiB baseline. No old model was inferred; preservation checks are not an old-model functional benchmark.

All resumed checks passed with no new incident or skipped conditional request. `runtime-smoke.py` and `runtime.json` preserve reproducible logic, payloads, catalog results, one-second sample counts/peaks, PNG hashes, TTL snapshots, and final identities. `git diff --check -- odd/tasks/add-flux3-klein.md` passed at that handoff. The then-pending task-document diff against `bda5b0e` was +102/-11 (113 changed lines); the isolated, untracked runtime harness has 239 lines. The historical 368 committed changed lines plus that pending document totaled 481 across work-unit diffs, not the net feature diff against baseline used for the delivery guard below. Existing unit RED/GREEN remains historical evidence; runtime integration has no meaningful RED requirement. Parent visual/API spot-checks are now complete; final independent verification, delivery decision, and commit remain pending, so F3-3 stays unchecked. Native review remains ON/unavailable/not approved, and Engram mirroring remains pending without a guessed identity. Larger sizes, batching, general quality/speed, and workloads beyond these two successful requests are not established.

## Final documentation reconciliation and delivery guard

Parent reports visual inspection of `smoke-576x1024.png` confirmed a correct red teapot and 576×1024 dimensions. Its API spot-check confirmed `http://127.0.0.1:5173/api/models` exposes `flux3-klein` as type image, size 3514023104, edit null, status unloaded, and `http://127.0.0.1:8080/running` is empty. These are parent-reported checks, not new inference or HTTP requests by this docs-only writer. The API contract now records actual activation, both verified generations, the existing 120-second image lifecycle, observed sampled-memory/timing limits, and no 4K or maximum-resolution proof. Other models and all default values remain unchanged.

Before this reconciliation, the parent measured the authored feature paths against `89e594b` at +421/-18 = 439 changed lines, including 236 task-document additions; source/tests/API docs accounted for 203 changed lines. After reconciliation, the seven scoped feature paths are +443/-18 = 461 changed lines, including 244 task-document additions; source/tests/API docs account for 217 changed lines. Pending documentation diff against HEAD is +141/-28 across the two docs. The approximately 400-line `ask-on-risk` delivery guard is triggered: **a user delivery decision is required before the next commit**. No chain has been selected and the user has not approved a size exception. The parent will ask for disposition; do not commit, force a split, or remove whitespace/docs/evidence merely to hit the planning target. This documentation update is allowed while that decision remains pending; no PR, push, or native approval is implied.

Final passive-doc validation: `git diff --check -- docs/images-api-contract.md odd/tasks/add-flux3-klein.md` passed with no output, and targeted readback confirmed the actual readiness/defaults/limits, preserved historical incident, parent spot-checks, and delivery guard. No runtime, build, or unit check was repeated; passive documentation has no meaningful test-first RED/GREEN. F3-3 functional evidence is complete within the two tested sizes, but final independent verification and the parent-owned commit are still pending. Engram mirroring remains pending due to ambiguous project/session identity; no guessed memory write occurred.
