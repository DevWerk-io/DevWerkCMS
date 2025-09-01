// src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

/* ---- CORS ---- */
const ORIGINS = (process.env.FRONTEND_ORIGINS || 'https://app.devwerk.io')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Optional: setze ACAO + Vary selbst (damit immer exakt der anfragende Origin gespiegelt wird)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});

// Haupt-CORS-Handling inkl. Preflight
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);          // z.B. curl/Server-zu-Server
    cb(null, ORIGINS.includes(origin));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,                             // nur auf true, wenn Cookies/Authorization-Credentials cross-site nötig sind
  optionsSuccessStatus: 204
}));

// Preflight früh beantworten (optional, aber schnell)
app.options('*', cors());

/* ---- Body Parser & Routen ---- */
app.use(express.json({ limit: '2mb' }));
app.use('/api', routes);

/* ---- Start ---- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[OK] Server läuft auf :${PORT}`));
