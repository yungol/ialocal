const express = require('express');
const cors = require('cors');
const path = require('path');

// Load repo-root .env (e.g. JINA_API_KEY) using Node's native loader.
try {
  process.loadEnvFile(path.join(__dirname, '..', '..', '.env'));
} catch {
  // .env is optional; scraping fallback still works without an API key.
}

const modelsRouter = require('./routes/models');
const statsRouter = require('./routes/stats');
const proxyRouter = require('./routes/proxy');
const chatRouter = require('./routes/chat');
const generateRouter = require('./routes/generate');
const settingsRouter = require('./routes/settings');
const imagesRouter = require('./routes/images');
const videoRouter = require('./routes/video');
const gpu = require('./services/gpu');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

app.use('/api', modelsRouter);
app.use('/api', statsRouter);
app.use('/api', chatRouter);
app.use('/api', generateRouter);
app.use('/api', settingsRouter);
app.use('/api', imagesRouter);
app.use('/api', videoRouter);
app.use('/images', express.static(path.join(__dirname, '..', 'data', 'images')));
app.use('/videos', express.static(path.join(__dirname, '..', 'data', 'videos')));

// Any llama-swap traffic (chat + image generation) needs the GPU in llama
// mode. requireLlama stops ComfyUI first; it is a no-op when ComfyUI is down.
app.use(
  '/v1',
  async (_req, _res, next) => {
    try {
      await gpu.requireLlama();
    } catch {
      // best effort; let the request proceed
    }
    next();
  },
  proxyRouter,
);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
  });
}

const PORT = 4001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend corriendo en http://0.0.0.0:' + PORT);
});
