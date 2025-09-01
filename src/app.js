// src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

/* ---------- CORS ---------- */
const ORIGINS = (process.env.FRONTEND_ORIGINS || 'https://app.devwerk.io')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Spiegel den erlaubten Origin selbst (verhindert falsche/zuvor gecachte Werte)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (CORS_DEBUG) res.setHeader('X-Allowed-Origin', origin);
  }
  return next();
});

// Haupt-CORS-Handling inkl. Preflight
app.use(cors({
  origin: (origin, cb) => {
    // Server-to-Server (kein Origin-Header) zulassen
    if (!origin) return cb(null, true);
    cb(null, ORIGINS.includes(origin));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
}));

// Preflight schnell beantworten
app.options('*', cors());

/* ---------- Body Parser & Routen ---------- */
app.use(express.json({ limit: '2mb' }));

// kleiner Healthcheck (hilft bei Nginx/Upstream-Checks)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), origins: ORIGINS });
});

app.use('/api', routes);

/* ---------- Fehler-Handler (optional, aber hilfreich) ---------- */
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Serverfehler', details: String(err?.message || err) });
});

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[OK] Server läuft auf :${PORT} | CORS Origins: ${ORIGINS.join(', ')}`));
