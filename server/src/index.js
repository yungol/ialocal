const express = require('express');
const cors = require('cors');
const path = require('path');
const modelsRouter = require('./routes/models');
const statsRouter = require('./routes/stats');
const proxyRouter = require('./routes/proxy');
const chatRouter = require('./routes/chat');
const generateRouter = require('./routes/generate');
const settingsRouter = require('./routes/settings');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api', modelsRouter);
app.use('/api', statsRouter);
app.use('/api', chatRouter);
app.use('/api', generateRouter);
app.use('/api', settingsRouter);
app.use('/v1', proxyRouter);

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
