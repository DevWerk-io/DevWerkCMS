// src/shared/db.pool.js
import mysql from 'mysql2/promise';
import fs from 'node:fs';

const DB_URI = process.env.DB_URI;
if (!DB_URI) throw new Error('DB_URI nicht gesetzt');

// Wir parsen die URI und bauen ein Options-Objekt für mysql2 (statt die URI direkt zu übergeben)
const url = new URL(DB_URI);

const config = {
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username || ''),
  password: decodeURIComponent(url.password || ''),
  database: url.pathname.replace(/^\//, ''),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// -------- SSL-Handling --------
// Erlaubte Varianten:
//   1) In der URI:   ?ssl=true            -> TLS mit rejectUnauthorized=true
//                     ?ssl=skip/false     -> kein TLS
//   2) Über ENV:     DB_SSL=true|require  -> TLS (wie oben)
//                    DB_SSL=false|skip    -> kein TLS
//   Optional:        DB_SSL_REJECT_UNAUTHORIZED=false  -> Zertifikatsprüfung aus
//                    DB_SSL_CA=/pfad/zur/ca.pem        -> CA einbinden

const sslParam = url.searchParams.get('ssl') || process.env.DB_SSL;

if (sslParam && !/^(false|skip)$/i.test(sslParam)) {
  // TLS aktiv
  const rejectUnauthorized =
    (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';

  const ssl = { minVersion: 'TLSv1.2', rejectUnauthorized };

  if (process.env.DB_SSL_CA) {
    try {
      ssl.ca = fs.readFileSync(process.env.DB_SSL_CA, 'utf8');
    } catch (e) {
      console.warn('[WARN] Konnte DB_SSL_CA nicht lesen:', e.message);
    }
  }

  config.ssl = ssl;
}
// Wenn sslParam false/skip ist (oder gar nicht gesetzt), lassen wir TLS einfach weg.

const pool = mysql.createPool(config);
export default pool;
