# Add FLUX3 Klein without changing existing models

## Objective and boundary

Add the distilled FLUX3 Klein image model as a new selector entry using the existing llama-swap lifecycle. This provides another image-generation option without replacing models, changing their defaults, or assuming concurrent model residency. Target hardware: RTX 3070, 8 GB VRAM, 32 GB system RAM.

F3-1 is committed. The parent now authorizes F3-2 isolated provisioning and staged configuration only, including public unauthenticated HTTPS downloads and the pinned CUDA build. Only this task document may change in the application repository during this batch. No activation, active-config writes, shared-service changes, inference, SSH, credential use, staging, commits, push, or children are authorized; the parent owns Git and native review.

| Context | Recorded baseline |
| --- | --- |
| Repository / branch | `/home/juan/codigo/servidorIA` / `feat/bonsai-model-path` |
| Source baseline | `89e594b` — user-requested baseline commit already complete |
| Preserved work | Parent reports all pre-existing source changes saved, excluding dirty `.atl` registry files and untracked `m.json` / `p.json` runtime captures; leave these untouched |
| Delivery | `ask-on-risk` default; no chain selected; 400 lines is a planning heuristic, not a hard cap |
| Forecast | 120–240 authored lines plus 8–12 YAML lines; record actual running count after implementation |

## Tasks and delegation routes

F3-1 is complete as an application work unit. F3-2 is delegated for isolated preparation; F3-3 crosses a shared-service runtime boundary and remains consent-gated. The parent alone routes tasks; this writer does not spawn children.

**F3-1 status:** completed in parent-owned commit `bc7616930c8b9e77f0292e33ed8826188db77a3f` (observed HEAD). Parent reports independent verification passed focused tests 3+3, server tests 30, and diff checking; parent spot-check passed client tests 3/3. Native review was unavailable (`immutable_review_transport_unsupported`, `mutation_not_started`), not approved; mode remains ON. Committed-only assessment was also unassessable due to unvalidated runtime. Do not retry native commands or toggle review. Runtime readiness remains unclaimed.

**F3-2 status:** provisioned and writer static verification passed; parent independent verification and work-unit commit remain pending. Staging only; F3-3 remains unchecked and unauthorized.

- [x] **F3-1 — Add application catalog, defaults, tests, and contract documentation.** Completed files: `server/src/routes/models.js`, new `server/src/routes/models.test.js`, `client/src/components/images/ImageGenView.vue`, new `client/src/components/images/imageModelDefaults.js`, new `client/src/components/images/imageModelDefaults.test.js`, and `docs/images-api-contract.md`. Added only the new model, with no edit capabilities. Defaults: 16 steps, CFG 1, existing 576×1024 dimensions; Euler belongs to later backend configuration. Existing defaults and capability gates were preserved. Deterministic default test-first RED → GREEN → refactor evidence appears below; no strict TDD configuration was found in parent context. Tests and docs accompany the behavior in the parent-owned commit.
- [ ] **F3-2 — Prepare an isolated pinned CUDA backend, verified assets, and staged configuration.** Route to a provisioning writer only after parent authorization of the exact external surfaces below. Verify prerequisites and destination absence before writes; do not overwrite existing artifacts. Build the isolated backend and verify both GGUF downloads and the reusable VAE against the pins below. Stage only a new `flux3-klein` stanza with TTL 120; preserve every other entry and group, including actual FLUX2/Juggernaut TTL 120, LLM TTL 3600, and TTS TTL 1800. Acceptance: independent backend/assets verified and staged config inspected, with no active-config change and no inference. Downloads approximately 6 GB; build forecast 15–60 minutes was already communicated.
- [ ] **F3-3 — Activate and verify generation plus unload, only after explicit consent.** Route to a runtime operator after F3-1/F3-2 evidence and explicit shared-service reload consent. That later authorization must cover active configuration changes, reload/restart, inference, and the concrete runtime checks. Acceptance: observe generation through the existing lifecycle and subsequent unload; report exact commands/results and effects on existing models. Until consent, active config writes, SIGHUP/restart, and inference remain prohibited. No runtime pass or native-review consent is implied by this checklist.

## F3-2 preparation pins and external boundaries

The following isolated surfaces are now authorized for F3-2, only after confirming absence. The active configuration remains read-only:

| Surface | Constraint |
| --- | --- |
| `/home/juan/codigo/stable-diffusion-flux3/` | Isolated new checkout; preserve the old checkout unchanged |
| `/home/juan/bin/sd-server-flux3` | Isolated new binary; `/home/juan/bin/sd-server` must remain unchanged |
| `/home/juan/models/flux3-klein/` | New model asset directory |
| `/home/juan/.config/llama-swap/config.flux3-next.yaml` | Staged config only; confirm absent and never overwrite |
| `/home/juan/.config/llama-swap/config.pre-flux3.yaml` | Backup destination; confirm absent and never overwrite |
| `/home/juan/.config/llama-swap/config.yaml` | Active config: not authorized to write or activate yet |

Backend source commit: `e41fbcf455e0fbb45e08bd535b00d6cba865e921`, tag `master-1015-e41fbcf`; ggml gitlink `a5915eb0e47adef21c3f25b889a008925ea838c2`. Build for SM86 with CUDA 12 and GCC 12, parallelism 2, static libraries; disable frontend, WebP, and WebM to avoid implicit pnpm execution. The parent supplied exact configure/build commands and pinned public HTTPS source/model URLs; no environment or dependency mutation is authorized if these fail.

| Asset | Expected bytes | SHA-256 |
| --- | ---: | --- |
| `flux3-image-klein-Q4_0.gguf` | 3514023104 | `22d0b1fa05f5ef63fa68eebe801a680e0456cb786af28be5952e10fb5c9004b2` |
| `Qwen3VL-4B-Instruct-Q4_K_M.gguf` | 2497281664 | `66358cb18bb6b3b1b6675aa412c7a88ef01d228f481184d13668e5201c730a0a` |
| Existing reusable FLUX2 VAE | Verify existing file; no replacement | `868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3` |

Both asset pins and the existing VAE hash were verified during F3-2 (evidence below). Keep only one model resident within the 8 GB VRAM budget; no inference has established actual FLUX3 fit or speed.

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

`client/dist` generated output is authorized for this build. Parent reports baseline server/client lint and client build passed, with dynamic-import/chunk warnings; these are prior evidence, not new results. Parent performs one spot-check. Runtime generation/unload verification belongs to gated F3-3, with no invented command or pass.

## Review, commits, and rollback

Native review remains on by default. After implementation, the parent follows provider transitions and owns independent assessment plus checks; never fabricate a pass. The review candidate is a commit or coherent slice against the prior reviewed boundary, not a task checkbox. Parent owns candidate disposition, task commits after fresh review and actual verification, and terminal Git actions; no push. Record future commit identities and authored running counts only when observed. No chain has been selected; raise delivery risk rather than compressing necessary tests or documentation to fit a line budget.

Rollback is additive-only: remove the new selector/catalog/defaults behavior and its dedicated tests/docs additions, the `flux3-klein` stanza, and new isolated assets/binary/checkout as appropriate under separate authorization. If activated later, remove only the additive active stanza through the approved service procedure. Preserve all old models, groups, defaults, binaries, and checkouts; no rollback operation is authorized now.

For the implemented F3-1 boundary alone, remove the appended catalog row and FLUX3 docs/tests, and reverse the pure-defaults extraction by restoring the original in-component constants and fallback expression. Preserve every baseline value and capability gate. No stanza, asset, or external binary was changed in F3-1.

## Progress, evidence, and next step

- Planning evidence: branch `feat/bonsai-model-path` and HEAD `89e594b` observed; target document was absent. Dirty `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md`, and untracked `m.json` / `p.json` were observed and preserved.
- F3-1 is checked and committed, with independent checks reported above but no native approval. F3-2 is provisioned/staged and remains unchecked pending parent independent verification and commit. F3-3 is unchecked; no activation or inference occurred.
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

All six final commands ran individually in the foreground after touched-file formatting. No runtime harness was run: generation/unload requires gated F3-3 shared-service consent. These deterministic checks do not establish FLUX3 runtime readiness.
- Engram mirror pending: project detection is ambiguous between `ialocal` and `servidoria`, and no authoritative session ID was supplied. Do not guess an identity or claim a mirror was saved; retain this local feature document for the parent.
- Next step: parent independently verifies the F3-2 artifacts and owns its work-unit commit. Native review remains ON but unavailable, not approved; no retry or toggle is authorized. F3-3 still requires explicit active-config-write, shared-service reload, and inference consent.

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

TDD exception: pinned binary/model provisioning has no meaningful behavior-level RED; supply-chain pins, compiler configuration, ELF dependencies, safe version/help exits, integrity checks, and additive YAML assertions are the verification boundary. All static checks passed; actual generation, unload timing, 8 GB fit, and speed remain unvalidated until separately authorized F3-3. Native review remains unavailable and no approval is claimed. Engram mirror remains pending; no identity was guessed.

`git diff --check -- odd/tasks/add-flux3-klein.md` passed with no output after recording the provisioning evidence. F3-2 remains provisioned/parent-independent-verification-and-commit pending; F3-3 remains unchecked. The next action is parent artifact inspection, not service activation.
