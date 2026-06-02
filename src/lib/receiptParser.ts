import type { ScannedReceipt, ScannedItem } from '../types';

const STORE_PATTERNS: [string, RegExp][] = [
  ["Sainsbury's", /sainsbury/i],
  ['Tesco', /tesco/i],
  ['Morrisons', /morrisons/i],
  ['ASDA', /asda/i],
  ['M&S', /marks.{0,3}spencer|mand\s?s|m\s?&?\s?s/i],
  ['Waitrose', /waitrose/i],
  ['Ocado', /ocado/i],
  ['Aldi', /aldi/i],
  ['Lidl', /lidl/i],
  ['Iceland', /iceland/i],
  ['Co-op', /co-?op|coop|cooperative/i],
];

const NOISE_LINES = [
  /^vat\b/i, /^change\b/i, /^cash\b/i, /^card\b/i,
  /^visa\b/i, /^mastercard\b/i, /^debit\b/i, /^credit\b/i,
  /^total\b/i, /^sub.?total\b/i, /^balance\b/i, /^paid\b/i,
  /^thank/i, /^receipt/i, /^order/i, /^delivery/i,
  /^web.?site/i, /^tel[:.]/i, /^email/i, /^store/i,
  /^branch/i, /^vat\s*no/i, /^reg/i,
  /^\d{6,}$/, /^[A-Z]{2}\d{6,}$/,
];

const SPACED_PRICE_PATTERN = /^(.+?)\s+(\d+)\s*\.\s*(\d{2})\s*$/;

function extractStore(lines: string[]): string | null {
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i].trim();
    for (const [store, pattern] of STORE_PATTERNS) {
      if (pattern.test(line)) return store;
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2})\s*[/\-\.]\s*(\d{1,2})\s*[/\-\.]\s*(\d{2,4})/,
    /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*(\d{2,4})/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const m = text.match(pattern);
    if (!m) continue;

    if (pattern === datePatterns[0]) {
      const [, d, mo, y] = m;
      const year = y.length === 2 ? '20' + y : y;
      if (parseInt(d) > 31) continue;
      if (parseInt(mo) > 12) continue;
      const month = mo.padStart(2, '0');
      const day = d.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (pattern === datePatterns[1]) {
      const [, d, monStr, y] = m;
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const monthNum = months[monStr.toLowerCase().slice(0, 3)];
      if (!monthNum) continue;
      const year = y.length === 2 ? '20' + y : y;
      const day = d.padStart(2, '0');
      return `${year}-${monthNum}-${day}`;
    }

    if (pattern === datePatterns[2]) {
      const [, monStr, d, y] = m;
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const monthNum = months[monStr.toLowerCase().slice(0, 3)];
      if (!monthNum) continue;
      const year = y.length === 2 ? '20' + y : y;
      const day = d.padStart(2, '0');
      return `${year}-${monthNum}-${day}`;
    }
  }
  return null;
}

function extractTotal(lines: string[]): number | null {
  for (const line of lines) {
    if (/total/i.test(line)) {
      const m = line.match(/(\d+\.\d{2})/);
      if (m) return parseFloat(m[1]);
    }
  }
  for (const line of lines) {
    if (/total/i.test(line)) {
      const spaced = line.match(/total\D*(\d+)\s*\.\s*(\d{2})/i);
      if (spaced) return parseFloat(`${spaced[1]}.${spaced[2]}`);
    }
  }
  return null;
}

function isNoise(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return true;
  if (!/[\w\d]/i.test(trimmed)) return true;
  for (const pattern of NOISE_LINES) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

function extractItems(lines: string[]): ScannedItem[] {
  const items: ScannedItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (isNoise(trimmed)) continue;
    if (/total|sub.?total|change|vat/i.test(trimmed) && /\d/.test(trimmed)) continue;

    const priceMatch = trimmed.match(/^(.*?)\s+£?(\d+\.\d{2})\s*$/);
    if (priceMatch) {
      let name = priceMatch[1].trim();
      const price = parseFloat(priceMatch[2]);
      if (name.length < 2 || price <= 0) continue;
      name = name.replace(/^[+\s]*/, '').replace(/\s{2,}/g, ' ').trim();
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ name, price });
      }
      continue;
    }

    const spacedMatch = trimmed.match(SPACED_PRICE_PATTERN);
    if (spacedMatch) {
      let name = spacedMatch[1].trim();
      const price = parseFloat(`${parseInt(spacedMatch[2])}.${spacedMatch[3]}`);
      if (name.length < 2 || price <= 0) continue;
      name = name.replace(/^[+\s]*/, '').replace(/\s{2,}/g, ' ').trim();
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ name, price });
      }
    }
  }

  return items;
}

export function parseReceiptText(rawText: string): ScannedReceipt {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const cleanedLines = lines.map(l => l.replace(/\|/g, 'I'));

  const store = extractStore(cleanedLines);
  const date = extractDate(rawText);
  const items = extractItems(cleanedLines);
  const total = extractTotal(cleanedLines);

  return { store, date, items, total, rawText };
}
