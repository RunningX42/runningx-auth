const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(cors({
  origin: [
    'https://runningx42.github.io',
    'http://localhost',
    'http://localhost:3000',
  ],
  methods: ['POST', 'OPTIONS', 'GET'],
}));

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
  process.exit(1);
}

app.post('/auth/token', async (req, res) => {
  const { code, redirect_uri, code_verifier } = req.body;
  if (!code || !redirect_uri || !code_verifier) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        code_verifier,
        grant_type:    'authorization_code',
        redirect_uri,
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token,
        grant_type:    'refresh_token',
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.options('/ai/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://runningx42.github.io');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET');
  res.sendStatus(204);
});

app.post('/ai/import', async (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://runningx42.github.io');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

const _debugLog = [];

app.post('/ai/debug-log', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://runningx42.github.io');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  _debugLog.unshift({ ...req.body, _received: new Date().toISOString() });
  if (_debugLog.length > 50) _debugLog.length = 50;
  console.log('[AI debug]', req.body.ts, req.body.fileName, req.body.error || 'no-error');
  res.json({ ok: true });
});

app.get('/ai/debug-log', (req, res) => {
  res.json(_debugLog);
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RunningX auth on :${PORT}`));
