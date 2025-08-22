// src/shared/db.pool.js
import mysql from 'mysql2/promise';
import fs from 'node:fs';

/**
 * 1) Konfig aus einzelnen ENV Variablen (DB_HOST, DB_USER, …) bauen
 */
function configFromDiscreteEnv() {
  const host = process.env.DB_HOST;
  if (!host) return null;

  const cfg = {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
  };

  // TLS (default: aus, wenn DB_SSL=false/skip)
  const sslFlag = (process.env.DB_SSL ?? 'false').toLowerCase();
  const sslOn = !['false', '0', 'no', 'skip', 'off', ''].includes(sslFlag);
  if (sslOn) {
    const rejectUnauthorized =
      (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
    const ssl = { minVersion: 'TLSv1.2', rejectUnauthorized };
    if (process.env.DB_SSL_CA) {
      try { ssl.ca = fs.readFileSync(process.env.DB_SSL_CA, 'utf8'); }
      catch (e) { console.warn('[WARN] DB_SSL_CA konnte nicht gelesen werden:', e.message); }
    }
    cfg.ssl = ssl;
  }

  return cfg;
}

/**
 * 2) Konfig aus DB_URI bauen: z. B.
 *    mysql://user:pass@host:3306/dbname?ssl=true | ssl=skip
 */
function configFromUri() {
  const uri = process.env.DB_URI;
  if (!uri) return null;

  const url = new URL(uri);
  const cfg = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: url.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
  };

  const sslParam = (url.searchParams.get('ssl') || process.env.DB_SSL || '').toLowerCase();
  const sslOn = sslParam && !['false', 'skip', '0', 'no', 'off', ''].includes(sslParam);
  if (sslOn) {
    const rejectUnauthorized =
      (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
    const ssl = { minVersion: 'TLSv1.2', rejectUnauthorized };
    if (process.env.DB_SSL_CA) {
      try { ssl.ca = fs.readFileSync(process.env.DB_SSL_CA, 'utf8'); }
      catch (e) { console.warn('[WARN] DB_SSL_CA konnte nicht gelesen werden:', e.message); }
    }
    cfg.ssl = ssl;
  }

  return cfg;
}

// Bevorzuge Einzel-ENV, sonst DB_URI
const config = configFromDiscreteEnv() || configFromUri();
if (!config) {
  throw new Error('DB-Konfiguration fehlt: setze entweder DB_HOST/DB_USER/... oder DB_URI in deiner .env');
}

const pool = mysql.createPool(config);
export default pool;
