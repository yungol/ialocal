# AGENTS.md — AI Server Hub

## Phase

This repo is currently **specification-only**. No `server/`, `client/`, or `docker/` directories exist yet. The README.md is the source of truth for architecture, endpoints, and conventions.

## Stack & conventions

| Concern | Choice | Notes |
|---|---|---|
| Backend | Hapi.js (CommonJS `require`) | Not Express, not ESM |
| Frontend | Vue 3 **Options API** + Tailwind CSS v4 | Do NOT use Composition API |
| CSS | Tailwind v4 (`@tailwindcss/vite` plugin) | No `tailwind.config.js` with v4; CSS-based config |
| Proxy layer | llama-swap on :8080 | Backend talks to llama-swap, never to llama-server directly |
| Model lifecycle | llama-swap TTL-based swap | Models auto-unload after idle timeout |

## Architecture

```
MacBook (client dev)             PC Linux — headless, NVIDIA RTX 3070 8GB
Vite :5173 ───proxy──▶  Hapi :4001 ──▶ llama-swap :8080 ──▶ llama-server (LLMs)
                                                          ──▶ sd-server (images)
```

- `:4001 /v1/*` — OpenAI-compatible proxy (used by OpenCode and frontend)
- `:4001 /api/models/*` — model management (list, load, unload, status)
- `:4001 /api/stats` — VRAM metrics via `nvidia-smi`
- Production: backend serves `client/dist` as static files via `@hapi/inert`

## Ports

| Port | Service | Machine |
|---|---|---|
| 4001 | Hapi.js backend | PC Linux |
| 8080 | llama-swap (internal) | PC Linux |
| 5173 | Vite dev server | MacBook |

## Toolchain

- No test framework, linter, formatter, or CI is set up yet.
- When implementing, prefer adding a linter and test setup early.
- `llama-swap` config lives at `~/.config/llama-swap/config.yaml` on the server.

## Available skills

Relevant OpenCode skills for this project (see `.atl/skill-registry.md`):
- `tailwind-best-practices` — Tailwind CSS conventions for the frontend
- `cognitive-doc-design` — when writing docs, READMEs, or architecture
- `work-unit-commits` — for splitting implementation into reviewable commits
- `branch-pr` / `chained-pr` — PR workflow

## VRAM constraint

RTX 3070 has 8 GB. Only **one model at a time** fits comfortably; llama-swap handles swapping. When adding models or features, never assume concurrent model loading.
