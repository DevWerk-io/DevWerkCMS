// src/controllers/documents.controller.js
import * as PdfService from '../services/pdf.service.js';
import * as AiService from '../services/ai.service.js';
import * as RegisterRepo from '../repositories/register.repo.js';
import { z } from 'zod';


// SINGLE upload (nur ChatGPT)
export async function ingest(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "Erwarte ein PDF im Feld 'file'" });
    if (!/\.pdf$/i.test(req.file.originalname)) return res.status(400).json({ error: 'Nur PDF-Dateien sind erlaubt' });

    const text = await PdfService.extractText(req.file.buffer);

    // Nur AI: Wir schicken EIN Item (Datei + Rohtext)
    const items = [{ original_filename: req.file.originalname, _raw_text: text }];
    const [normalized] = await AiService.normalizeSummaries(items);

    const id = await RegisterRepo.insertSummary(normalized);
    return res.json({ id, ...normalized });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fehler beim Ingest', details: String(err) });
  }
}

// MULTI upload (nur ChatGPT)
export async function ingestBatch(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Erwarte PDFs im Feld 'files'" });
    }

    const items = [];
    for (const f of req.files) {
      if (!/\.pdf$/i.test(f.originalname)) continue;
      const text = await PdfService.extractText(f.buffer);
      items.push({ original_filename: f.originalname, _raw_text: text });
    }
    if (!items.length) return res.status(400).json({ error: 'Keine gültigen PDFs übergeben' });

    const normalized = await AiService.normalizeSummaries(items);

    const saved = [];
    for (const n of normalized) {
      const id = await RegisterRepo.insertSummary(n);
      saved.push({ id, ...n });
    }

    return res.json({ count: saved.length, items: saved });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Fehler beim Batch-Ingest", details: String(err) });
  }
}

// ✅ Query-Validierung
const ListQuery = z.object({
  q: z.string().optional(),                // Freitext (Firma/Sitz/Keyword)
  city: z.string().optional(),             // Sitz
  address: z.string().optional(), 
  keyword: z.string().optional(),          // einzelnes Keyword
  keywords: z.string().optional(),         // mehrere: "software,handel"
  from: z.string().optional(),             // YYYY-MM-DD (last_entry_date >=)
  to: z.string().optional(),               // YYYY-MM-DD (last_entry_date <)
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  sort_by: z.enum(['created_at','last_entry_date','company_name','seat_city']).default('created_at'),
  order: z.enum(['asc','desc']).default('desc')
});

export async function list(req, res) {
  try {
    const q = ListQuery.parse(req.query);

    // keywords param in Array wandeln (optional)
    let keywordList = [];
    if (q.keywords) {
      keywordList = q.keywords.split(',').map(s => s.trim()).filter(Boolean);
    } else if (q.keyword) {
      keywordList = [q.keyword.trim()];
    }

    const result = await RegisterRepo.listSummaries({
      q: q.q,
      city: q.city,
      address: q.address,
      keywords: keywordList,    // Array
      from: q.from,
      to: q.to,
      page: q.page,
      limit: q.limit,
      sort_by: q.sort_by,
      order: q.order
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Ungültige Parameter', details: String(err) });
  }
}

// ✅ Liste verfügbarer Keywords (mit Count) – nützlich fürs Filter-UI
export async function keywords(_req, res) {
  try {
    const items = await RegisterRepo.listKeywords();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Keywords', details: String(err) });
  }
}