// src/utils/strings.js
export function normalizeWS(s) {
  return s ? s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

export function parseDecimalEU(s) {
  if (!s) return null;
  const n = s.replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

export function parseDateDE(s) {
  if (!s) return null;
  const m = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/.exec(s);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  let yyyy = m[3];
  if (yyyy.length === 2) yyyy = (Number(yyyy) > 50 ? '19' : '20') + yyyy;
  return `${yyyy}-${mm}-${dd}`;
}

export function clampLen(s, max) {
  if (s == null) return s;
  const str = String(s);
  return str.length > max ? str.slice(0, max) : str;
}
