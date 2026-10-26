# Add FLUX3 Klein without changing existing models

## Objective and boundary

Add the distilled FLUX3 Klein image model as a new selector entry using the existing llama-swap lifecycle. This provides another image-generation option without replacing models, changing their defaults, or assuming concurrent model residency. Target hardware: RTX 3070, 8 GB VRAM, 32 GB system RAM.

The parent read this document and authorized F3-1 application changes, touched-file formatting, deterministic tests, lint, and the client build (including generated `client/dist`). F3-2 provisioning and F3-3 activation remain unauthorized. No downloads, external configuration access, services, inference, staging, commits, or push are authorized for this writer; the parent owns Git and native review.

| Context | Recorded baseline |
| --- | --- |
| Repository / branch | `/home/juan/codigo/servidorIA` / `feat/bonsai-model-path` |
| Source baseline | `89e594b` — user-requested baseline commit already complete |
| Preserved work | Parent reports all pre-existing source changes saved, excluding dirty `.atl` registry files and untracked `m.json` / `p.json` runtime captures; leave these untouched |
| Delivery | `ask-on-risk` default; no chain selected; 400 lines is a planning heuristic, not a hard cap |
| Forecast | 120–240 authored lines plus 8–12 YAML lines; record actual running count after implementation |

## Tasks and delegation routes

All three task checkboxes remain open until their actual completion evidence exists. F3-1 is delegated to this application writer because it spans two or more nontrivial files. F3-2 requires isolated preparation; F3-3 crosses a shared-service runtime boundary. The parent alone routes later tasks; this writer does not spawn children.

**F3-1 status:** implemented and verified; parent review and work-unit commit evidence pending. The application paths below are authorized now, not merely proposed future surfaces. Its checkbox remains open until the parent closes the work unit.

- [ ] **F3-1 — Add application catalog, defaults, tests, and contract documentation.** Route to an application implementation writer after parent authorization. Allowed future files: `server/src/routes/models.js`, new `server/src/routes/models.test.js`, `client/src/components/images/ImageGenView.vue`, new `client/src/components/images/imageModelDefaults.js`, new `client/src/components/images/imageModelDefaults.test.js`, and `docs/images-api-contract.md`. Add only the new model; advertise no edit capabilities for it. Its defaults are 16 steps, CFG 1, Euler. Preserve all existing model defaults and 576×1024 dimensions. Acceptance: deterministic tests cover the additive catalog/default behavior, unchanged existing defaults, and absence of new-model edit capabilities. Use default test-first RED → GREEN → refactor, capturing actual results; no strict TDD configuration was found in parent context. Keep tests and docs with the behavior.
- [ ] **F3-2 — Prepare an isolated pinned CUDA backend, verified assets, and staged configuration.** Route to a provisioning writer only after parent authorization of the exact external surfaces below. Verify prerequisites and destination absence before writes; do not overwrite existing artifacts. Build the isolated backend and verify both GGUF downloads and the reusable VAE against the pins below. Stage only a new `flux3-klein` stanza with TTL 120; preserve every other entry and group, including actual FLUX2/Juggernaut TTL 120, LLM TTL 3600, and TTS TTL 1800. Acceptance: independent backend/assets verified and staged config inspected, with no active-config change and no inference. Downloads approximately 6 GB; build forecast 15–60 minutes was already communicated.
- [ ] **F3-3 — Activate and verify generation plus unload, only after explicit consent.** Route to a runtime operator after F3-1/F3-2 evidence and explicit shared-service reload consent. That later authorization must cover active configuration changes, reload/restart, inference, and the concrete runtime checks. Acceptance: observe generation through the existing lifecycle and subsequent unload; report exact commands/results and effects on existing models. Until consent, active config writes, SIGHUP/restart, and inference remain prohibited. No runtime pass or native-review consent is implied by this checklist.

## F3-2 preparation pins and external boundaries

These are proposed future task surfaces, not authorization to write them now:

| Surface | Constraint |
| --- | --- |
| `/home/juan/codigo/stable-diffusion-flux3/` | Isolated new checkout; preserve the old checkout unchanged |
| `/home/juan/bin/sd-server-flux3` | Isolated new binary; `/home/juan/bin/sd-server` must remain unchanged |
| `/home/juan/models/flux3-klein/` | New model asset directory |
| `/home/juan/.config/llama-swap/config.flux3-next.yaml` | Staged config only; confirm absent and never overwrite |
| `/home/juan/.config/llama-swap/config.pre-flux3.yaml` | Backup destination; confirm absent and never overwrite |
| `/home/juan/.config/llama-swap/config.yaml` | Active config: not authorized to write or activate yet |

Backend source commit: `e41fbcf455e0fbb45e08bd535b00d6cba865e921`, tag `master-1015-e41fbcf`. Build for SM86 with CUDA 12 and GCC 12, parallelism 2, static libraries; disable frontend, WebP, and WebM to avoid implicit pnpm execution. Exact build/download commands and sources must be validated and authorized before execution; none are executed here.

| Asset | Expected bytes | SHA-256 |
| --- | ---: | --- |
| `flux3-image-klein-Q4_0.gguf` | 3514023104 | `22d0b1fa05f5ef63fa68eebe801a680e0456cb786af28be5952e10fb5c9004b2` |
| `Qwen3VL-4B-Instruct-Q4_K_M.gguf` | 2497281664 | `66358cb18bb6b3b1b6675aa412c7a88ef01d228f481184d13668e5201c730a0a` |
| Existing reusable FLUX2 VAE | Verify existing file; no replacement | `868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3` |

Pins are parent-provided expectations, not observed download verification. Keep only one model resident within the 8 GB VRAM budget.

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
- All F3 tasks are unchecked. F3-1 adds the backend path at the end of the existing fallback order, extracts UI defaults into a dependency-free module, and documents readiness limits. No F3-2/F3-3 execution, runtime checks, reviews, or new commits have occurred.
- RED observed before production edits: server focused tests passed 1/3, failing on FLUX3 size `null` versus 3514023104 and the missing fallback row; client tests passed 2/3, failing on undefined FLUX3 defaults. These were assertion failures, not loader failures. Client RED exercised actual in-component constants through a temporary isolated test adapter.
- GREEN observed after the minimal additive implementation: both focused commands passed 3/3. Refactor then extracted the constants and existing fallback expression into the pure module; tests now import it directly. Both final focused checks remained green. Alternate cases cover unchanged fallback ordering/paths/classification/capabilities, upstream authority, absent assets, existing defaults, and unknown/empty model selection.
- Normalization: installed Prettier ran successfully against only the two touched server JavaScript files and three touched client JavaScript/Vue files. Its touched-component formatting also normalized two existing expressions without behavior changes. A first task-document patch failed to match a partial long line and made no changes; a corrected patch succeeded.
- Authored application/test/API-doc diff against `89e594b`, including new files: 185 additions and 18 deletions (203 changed lines). This remains within the 120–240 forecast; local feature-document lines are counted separately, and generated `client/dist` is ignored by Git. No YAML was authored. Parent records the eventual committed running count and identity; 400 remains advisory.

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
- Next step: parent performs one spot-check, native review, and work-unit commit for F3-1. Record a commit identity only once observed. F3-2 still needs explicit provisioning authorization; F3-3 remains separately gated by shared-service reload consent.
