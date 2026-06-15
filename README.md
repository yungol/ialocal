# AI Server Hub — Servidor local de modelos con frontend remoto

Arquitectura y especificación para montar un servidor de modelos AI (LLMs + imágenes) en un PC Linux con GPU, exponerlo vía API, y consumirlo desde un MacBook — ya sea desde una UI web propia (Vue 3 + Tailwind) o como proveedor de modelos para OpenCode.

## Arquitectura

```
MacBook (cliente)                       PC Linux - 192.168.1.x (servidor headless)
┌──────────────────────────────┐       ┌────────────────────────────────────────────┐
│  Navegador :5173 (dev)       │       │  Backend Hapi.js :4001                      │
│  OpenCode ──▶ :4001/v1       │───LAN─▶│    ├─ /v1/*         → proxy a llama-swap   │
│  curl ──▶ :4001/v1           │       │    ├─ /api/models/*  → gestión de modelos   │
│                              │       │    ├─ /api/stats     → VRAM, métricas       │
└──────────────────────────────┘       │    └─ sirve frontend build (prod)           │
                                       │                                              │
                                       │  llama-swap :8080 (proxy interno)            │
                                       │    ├─ llama-server (modelos de texto)        │
                                       │    └─ sd-server     (modelos de imagen)      │
                                       │                                              │
                                       │  Hardware: i5-12400F, 32GB RAM, RTX 3070 8GB│
                                       └──────────────────────────────────────────────┘
```

**Flujo**: el backend Hapi es el único punto de entrada. Unifica la API de modelos, la gestión de memoria/VRAM, y sirve el frontend. Por detrás, llama-swap maneja el swap de modelos (carga/descarga automática con TTL).

---

## Stack tecnológico

| Capa | Tecnología | Dónde corre |
|---|---|---|
| Proxy de modelos | [llama-swap](https://github.com/mostlygeek/llama-swap) | PC Linux |
| Inferencia LLM | [llama-server](https://github.com/ggml-org/llama.cpp) (llama.cpp) | PC Linux |
| Inferencia imágenes | [sd-server](https://github.com/leejet/stable-diffusion.cpp) | PC Linux |
| Backend API + gestión | Node.js + Hapi.js + Joi | PC Linux |
| Frontend UI | Vue 3 (Options API) + Tailwind CSS + Chart.js | MacBook (dev) / PC (prod build) |
| Empaquetado futuro | Docker Compose (3 servicios) | PC Linux |

---

## Endpoints del Backend (Hapi.js, puerto 4001)

### API de modelos (gestión)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/models` | Lista todos los modelos: nombre, tipo (llm/image), estado (unloaded/loaded/running), tamaño en disco |
| `GET` | `/api/models/running` | Solo modelos cargados en VRAM ahora mismo |
| `POST` | `/api/models/{id}/load` | Precarga un modelo específico en VRAM |
| `POST` | `/api/models/{id}/unload` | Descarga un modelo específico de VRAM |
| `POST` | `/api/models/unload-all` | Libera toda la VRAM (descarga todo) |
| `GET` | `/api/stats` | VRAM usada/libre/total, modelos activos, uptime del servicio |

### API OpenAI-compatible (proxy transparente)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/v1/chat/completions` | Chat completion (streaming incluido) |
| `POST` | `/v1/completions` | Text completion |
| `POST` | `/v1/images/generations` | Generación de imágenes |
| `GET` | `/v1/models` | Lista de modelos en formato OpenAI |

Estas rutas se usan tanto desde el frontend (chat, generador de imágenes) como desde OpenCode configurando `OPENAI_BASE_URL=http://192.168.1.x:4001/v1`.

---

## Frontend (Vue 3 + Tailwind) — Secciones

### 1. Chat

- Selector de modelo (dropdown con ícono LLM 🧠)
- Área de mensajes con streaming (SSE)
- Indicador de estado: "cargando modelo..." con spinner mientras se hace swap
- Historial de conversación (localStorage o backend si se persiste)

### 2. Generador de Imágenes

- Selector de modelo de imagen (dropdown con ícono 🎨)
- Prompt + negative prompt
- Parámetros: steps, guidance scale, seed, tamaño
- Galería de resultados generados
- Misma lógica de swap: si hay un LLM cargado, llama-swap lo reemplaza automáticamente

### 3. Panel de Gestión (sidebar derecho o página dedicada)

- Lista de todos los modelos con badges de estado:
  - ⬇️ Descargado (en disco, no en VRAM)
  - 🟢 Cargado (en VRAM)
  - ⬆️ No descargado (faltan los pesos)
- Botones Load / Unload por modelo
- Barra de VRAM en tiempo real: `████████░░ 6.2 / 8 GB`
- Botón "Liberar todo" (unload all)
- Refresh automático cada 5s

---

## Configuración de llama-swap (PC Linux)

Archivo `~/.config/llama-swap/config.yaml`:

```yaml
listen: 127.0.0.1:8080

models:
  # ---- LLMs ----
  llama3-8b:
    cmd: llama-server --port ${PORT} --model /models/llama-3.1-8b-q4_k_m.gguf --n-gpu-layers 33 -c 8192
    ttl: 300s
    aliases:
      - gpt-4o-mini

  qwen2.5-coder-7b:
    cmd: llama-server --port ${PORT} --model /models/qwen2.5-coder-7b-q4_k_m.gguf --n-gpu-layers 33 -c 8192
    ttl: 300s

  deepseek-coder-6.7b:
    cmd: llama-server --port ${PORT} --model /models/deepseek-coder-6.7b-q4_k_m.gguf --n-gpu-layers 33 -c 8192
    ttl: 300s

  # ---- Imágenes ----
  sdxl:
    cmd: sd-server --port ${PORT} --model /models/sd_xl_base_1.0.safetensors --vae /models/sdxl_vae.safetensors
    ttl: 120s

  flux-schnell:
    cmd: sd-server --port ${PORT} --model /models/flux1-schnell.safetensors --diffusion-model flux
    ttl: 120s
```

- `${PORT}` lo asigna llama-swap automáticamente.
- `ttl` en segundos: después de ese tiempo sin requests, descarga el modelo.
- `--n-gpu-layers 33`: con 8GB VRAM, esto carga ~33 capas en GPU. Ajustar si el modelo no entra.

---

## Configuración de OpenCode en el MacBook

Variables de entorno o en `~/.config/opencode/config.json`:

```bash
export OPENAI_BASE_URL="http://192.168.1.100:4001/v1"
export OPENAI_API_KEY="local"  # no se valida, pero se requiere
```

---

## Estructura del proyecto

```
/home/juan/ai-server-hub/
├── README.md                    # este archivo
├── server/                      # Backend Hapi.js
│   ├── package.json
│   ├── src/
│   │   ├── index.js             # entry point, servidor Hapi
│   │   ├── routes/
│   │   │   ├── models.js        # GET/POST /api/models/*
│   │   │   ├── stats.js         # GET /api/stats
│   │   │   └── proxy.js         # /v1/* proxy a llama-swap
│   │   ├── services/
│   │   │   ├── llama-swap.js    # cliente HTTP para hablar con llama-swap
│   │   │   └── vram.js          # consulta uso de VRAM (nvidia-smi)
│   │   └── plugins/
│   │       └── static.js        # servir frontend build en producción
│   └── config/
│       └── default.json         # puertos, host de llama-swap, etc
│
├── client/                      # Frontend Vue 3 + Tailwind
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── components/
│       │   ├── chat/
│       │   │   ├── ChatView.vue         # vista principal del chat
│       │   │   ├── ModelSelector.vue    # dropdown de modelo LLM
│       │   │   ├── MessageList.vue      # lista de mensajes con streaming
│       │   │   └── ChatInput.vue        # input de texto + botón enviar
│       │   ├── images/
│       │   │   ├── ImageGenView.vue     # vista principal del generador
│       │   │   ├── ImageModelSelector.vue
│       │   │   ├── ImageParams.vue      # steps, seed, guidance, tamaño
│       │   │   └── ImageGallery.vue     # grid de imágenes generadas
│       │   ├── management/
│       │   │   ├── ManagementView.vue   # vista de gestión de modelos
│       │   │   ├── ModelCard.vue        # tarjeta de un modelo
│       │   │   └── VramBar.vue          # barra de VRAM con Chart.js
│       │   └── layout/
│       │       ├── AppLayout.vue        # layout principal con sidebar
│       │       └── NavSidebar.vue       # navegación (Chat, Imágenes, Gestión)
│       ├── composables/
│       │   ├── useApi.js                # fetch wrapper con base URL
│       │   ├── useModels.js             # estado reactivo de modelos
│       │   ├── useChat.js               # lógica de chat + streaming
│       │   └── useImageGen.js           # lógica de generación de imágenes
│       └── assets/
│           └── main.css                 # Tailwind directives
│
└── docker/                       # Para futuro empaquetado
    └── docker-compose.yml
```

---

## Instalación paso a paso

### 1. PC Linux — Dependencias base

```bash
# NVIDIA drivers + CUDA (si no están)
sudo apt install nvidia-driver-550 nvidia-cuda-toolkit

# llama-swap
brew install llama-swap
# o binario: descargar de https://github.com/mostlygeek/llama-swap/releases

# llama.cpp (llama-server)
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp && mkdir build && cd build
cmake .. -DGGML_CUDA=ON
make -j$(nproc) llama-server
sudo cp bin/llama-server /usr/local/bin/

# stable-diffusion.cpp (sd-server)
git clone https://github.com/leejet/stable-diffusion.cpp
cd stable-diffusion.cpp && mkdir build && cd build
cmake .. -DSD_CUDA=ON
make -j$(nproc) sd-server
sudo cp bin/sd-server /usr/local/bin/
```

### 2. PC Linux — Descargar modelos

```bash
mkdir -p /models

# LLMs (GGUF)
cd /models
curl -L -o llama-3.1-8b-q4_k_m.gguf https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
curl -L -o qwen2.5-coder-7b-q4_k_m.gguf https://huggingface.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf

# Imágenes (SafeTensors)
curl -L -o sd_xl_base_1.0.safetensors https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
```

### 3. PC Linux — Crear y configurar llama-swap

Crear `~/.config/llama-swap/config.yaml` con el contenido de la sección anterior.

```bash
# Probar que arranca
llama-swap --config ~/.config/llama-swap/config.yaml

# Systemd para auto-arranque
sudo tee /etc/systemd/system/llama-swap.service <<'EOF'
[Unit]
Description=llama-swap AI proxy
After=network.target

[Service]
ExecStart=/usr/local/bin/llama-swap --config /home/tuuser/.config/llama-swap/config.yaml
Restart=always
User=tuuser

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now llama-swap
```

### 4. PC Linux — Backend Node.js

```bash
cd /home/juan/ai-server-hub/server
npm init -y
npm install @hapi/hapi joi @hapi/inert node-fetch
# desarrollo
npm install nodemon --save-dev
```

`server/src/index.js` (esqueleto):

```js
const Hapi = require('@hapi/hapi');

async function init() {
  const server = Hapi.server({
    port: 4001,
    host: '0.0.0.0',
    routes: { cors: true }
  });

  // Registrar rutas
  await server.register([
    require('./routes/models'),
    require('./routes/stats'),
    require('./routes/proxy')
  ]);

  // En producción, servir frontend
  if (process.env.NODE_ENV === 'production') {
    await server.register(require('@hapi/inert'));
    server.route({
      method: 'GET',
      path: '/{param*}',
      handler: { directory: { path: '../client/dist', index: true } }
    });
  }

  await server.start();
  console.log('Backend corriendo en %s', server.info.uri);
}

init();
```

### 5. MacBook — Frontend Vue 3

```bash
cd /home/juan/ai-server-hub/client
npm create vite@latest . -- --template vue
npm install
npm install -D tailwindcss @tailwindcss/vite
# Configurar Tailwind según docs oficiales
```

`client/vite.config.js`:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://192.168.1.100:4001',
      '/v1': 'http://192.168.1.100:4001'
    }
  }
})
```

### 6. Desarrollo diario

```bash
# PC Linux: levantar backend
cd /home/juan/ai-server-hub/server && npm run dev

# MacBook: levantar frontend
cd /home/juan/ai-server-hub/client && npm run dev
# Abrir http://localhost:5173
```

---

## Flujo de trabajo típico

1. **Prendés el PC Linux** (WoL desde el Mac o físicamente). systemd arranca llama-swap solo.
2. **Levantás el backend**: `cd server && npm run dev` (o systemd también si lo preferís).
3. **En el Mac**: `cd client && npm run dev`, abrís `localhost:5173`.
4. **Usás el chat** normalmente. Seleccionás modelo en el dropdown, escribís, el backend pide a llama-swap que cargue el modelo (si no está ya) y streamea la respuesta.
5. **Generás imágenes**: vas a la pestaña Imágenes, seleccionás SDXL, escribís prompt, generás.
6. **OpenCode**: configurás `OPENAI_BASE_URL=http://192.168.1.100:4001/v1` y usa los mismos modelos.
7. **Panel de gestión**: monitoreás VRAM, cargás/descargás modelos manualmente si hace falta.
8. **Al terminar**: apagás el PC. Los modelos en disco no pesan nada.

---

## Notas de implementación

### VRAM con 8GB (RTX 3070)

| Modelo | VRAM aprox | ¿Cabe? |
|---|---|---|
| Llama 3.1 8B Q4_K_M | ~5.5 GB | ✅ |
| Qwen 2.5 Coder 7B Q4_K_M | ~5.0 GB | ✅ |
| SDXL base | ~6.5 GB | ✅ (solo) |
| FLUX Schnell | ~7.5 GB | ⚠️ ajustado |
| Dos modelos simultáneos | No con 8GB | ❌ usar swap |

### Streaming en el frontend

El backend debe forwardear el stream de llama-swap tal cual (SSE). En el frontend usar `fetch` con `ReadableStream` y `TextDecoder` para ir mostrando tokens.

### Seguridad

Para uso solo en LAN no hace falta HTTPS. Si alguna vez exponés a internet, poné el backend detrás de nginx con SSL y agregá API key validation en Hapi.

### Subir a Git

```bash
cd /home/juan/ai-server-hub
git init
echo "node_modules/\ndist/\n.env" > .gitignore
git add .
git commit -m "init: AI Server Hub architecture"
git remote add origin <tu-repo-url>
git push -u origin main
```
