// src/services/ai.service.js
import OpenAI from 'openai';
import { z } from 'zod';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Zielstruktur pro Eintrag (muss zur DB passen)
const SummarySchema = z.object({
  original_filename: z.string(),
  company_name: z.string().min(1).max(512),
  seat_city: z.string().min(1).max(120),
  seat_address: z.string().nullable(),   
  purpose_keyword: z.string().nullable(),
  share_capital_eur: z.number().nullable(),
  managing_directors: z.array(z.string()).default([]),
  last_entry_date: z.string().nullable() // YYYY-MM-DD
});

// Top-Level: Objekt mit summaries:Array
const EnvelopeSchema = z.object({
  summaries: z.array(SummarySchema)
});

// JSON-Schema für Structured Outputs (Chat Completions fordert type: "object")
const jsonSchema = {
  name: "RegisterSummaries",
  schema: {
    type: "object",
    properties: {
      summaries: {
        type: "array",
        items: {
          type: "object",
          required: [
            "original_filename",
            "company_name",
            "seat_city",
            "seat_address",
            "purpose_keyword",
            "share_capital_eur",
            "managing_directors",
            "last_entry_date"
          ],
          properties: {
            original_filename: { type: "string" },
            company_name: { type: "string" },
            seat_city: { type: "string" },
            seat_address: { type: ["string", "null"] },
            purpose_keyword: { type: ["string", "null"] },
            share_capital_eur: { type: ["number", "null"] },
            managing_directors: { type: "array", items: { type: "string" } },
            last_entry_date: { type: ["string", "null"], description: "YYYY-MM-DD" }
          },
          additionalProperties: false
        }
      }
    },
    required: ["summaries"],
    additionalProperties: false
  },
  strict: true
};

const SYSTEM = `Du extrahierst Registerdaten aus PDF-Texten. Gib NUR JSON nach Schema zurück:
{
  "summaries": [
    {
      "original_filename": "...",
      "company_name": "...",
      "seat_city": "...",
      "seat_address": "Straße Hausnummer, PLZ Ort" | null,
      "purpose_keyword": "software|handel|beratung|...|null",
      "share_capital_eur": 25000 | null,
      "managing_directors": ["Vorname Nachname", "..."],
      "last_entry_date": "YYYY-MM-DD" | null
    }
  ]
}
Kein Erklärtext, keine Kommentare.`;

// Eingabetext bauen (mehrere PDFs)
function buildUserMessage(items) {
  return items.map((it, i) =>
    [
      `### DOCUMENT ${i + 1}: ${it.original_filename}`,
      `TEXT:\n${(it._raw_text || '').slice(0, 120000)}`
    ].join('\n')
  ).join('\n\n');
}

function stripCodeFences(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export async function normalizeSummaries(items) {
  const user = buildUserMessage(items);

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: jsonSchema
    }
  });

  const raw = completion.choices?.[0]?.message?.content;
  const text = stripCodeFences(raw);
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Konnte JSON nicht parsen: ${e.message}\n---\n${text?.slice(0, 1000)}`);
  }

  // Validieren und normalisieren
  const envelope = EnvelopeSchema.parse(data);
  const out = envelope.summaries.map(x => ({
    ...x,
    company_name: (x.company_name || '').slice(0, 512),
    seat_city: (x.seat_city || '').slice(0, 120),
    seat_address: x.seat_address ? x.seat_address.slice(0, 255) : null,
    purpose_keyword: x.purpose_keyword ?? null
  }));

  return out;
}
