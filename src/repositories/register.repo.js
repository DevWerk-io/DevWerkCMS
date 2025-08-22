import pool from '../shared/db.pool.js';
import { clampLen } from '../utils/strings.js';

export async function insertSummary(summary) {
  const company = clampLen(summary.company_name, 512);
  const seat    = clampLen(summary.seat_city, 120);
  const address = summary.seat_address ? clampLen(summary.seat_address, 255) : null;
  const keyword = summary.purpose_keyword == null ? null : clampLen(summary.purpose_keyword, 120);

  const sql = `INSERT INTO register_summaries
    (original_filename, company_name, seat_city, seat_address, purpose_keyword, share_capital_eur, managing_directors, last_entry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    summary.original_filename,
    company,
    seat,
    address,
    keyword,
    summary.share_capital_eur,
    JSON.stringify(summary.managing_directors || []),
    summary.last_entry_date
  ];

  const conn = await pool.getConnection();
  try {
    const [res] = await conn.execute(sql, params);
    return res.insertId;
  } finally {
    conn.release();
  }
}

// ✅ Whitelist für Sortierung
const SORT_COLUMNS = {
  created_at: 'created_at',
  last_entry_date: 'last_entry_date',
  company_name: 'company_name',
  seat_city: 'seat_city'
};

export async function listSummaries(opts) {
  const clauses = [];
  const params = [];

  if (opts.q) {
    clauses.push('(company_name LIKE ? OR seat_city LIKE ? OR purpose_keyword LIKE ?)');
    params.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`);
  }
  if (opts.city) {
    clauses.push('seat_city = ?');
    params.push(opts.city);
  }
  if (opts.keywords && opts.keywords.length) {
    // purpose_keyword IN (?, ?, ?)
    const placeholders = opts.keywords.map(() => '?').join(',');
    clauses.push(`purpose_keyword IN (${placeholders})`);
    params.push(...opts.keywords);
  }
  if (opts.from) { clauses.push('last_entry_date >= ?'); params.push(opts.from); }
  if (opts.to)   { clauses.push('last_entry_date < ?');  params.push(opts.to);  }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const sortCol = SORT_COLUMNS[opts.sort_by] || 'created_at';
  const sortDir = (opts.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Paging
  const page  = Number(opts.page) || 1;
  const limit = Number(opts.limit) || 25;
  const offset = (page - 1) * limit;

  const conn = await pool.getConnection();
  try {
    // Total separat holen (einfach & kompatibel)
    const [countRows] = await conn.execute(
      `SELECT COUNT(*) AS total FROM register_summaries ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    // Items holen
    const [rows] = await conn.execute(
      `SELECT id, original_filename, company_name, seat_city, seat_adress, purpose_keyword, share_capital_eur,
              JSON_EXTRACT(managing_directors, '$') AS managing_directors,
              last_entry_date, created_at
       FROM register_summaries
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      items: rows,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };
  } finally {
    conn.release();
  }
}

// ✅ Distinct Keywords mit Häufigkeit
export async function listKeywords() {
  const sql = `
    SELECT purpose_keyword AS keyword, COUNT(*) AS cnt
    FROM register_summaries
    WHERE purpose_keyword IS NOT NULL AND purpose_keyword <> ''
    GROUP BY purpose_keyword
    ORDER BY cnt DESC, keyword ASC
  `;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql);
    return rows;
  } finally {
    conn.release();
  }
}
