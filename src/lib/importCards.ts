import type { NewCard } from './cards'

// Header aliases we recognise (case-insensitive) when a file has a header row.
const GERMAN_HEADERS = ['german', 'deutsch', 'de']
const TRANSLATION_HEADERS = [
  'translation',
  'übersetzung',
  'ubersetzung',
  'foreign',
  'fremdsprache',
  'spanish',
  'spanisch',
  'english',
  'englisch',
]
const LANGUAGE_HEADERS = ['language', 'sprache', 'lang']

export type ParseResult = {
  cards: NewCard[]
  /** Rows that were dropped because German or Translation was empty. */
  skipped: number
}

type Cell = string | number | boolean | Date | null | undefined
type Row = Cell[]

function cellToString(cell: Cell): string {
  if (cell == null) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell).trim()
}

// German words very often start with an article/marker. These are distinctive —
// they don't appear at the start of Spanish/English/etc. words — so counting
// them lets us tell which column holds the German side when there's no header.
const GERMAN_ARTICLE = /^(der|die|das|dem|den|des|ein|eine|einen|einem|einer|zum|zur|sich)\s/i

/** Guess which of the first two columns holds the German word (0 or 1). */
function detectGermanColumn(rows: Row[]): 0 | 1 {
  let col0 = 0
  let col1 = 0
  for (const row of rows.slice(0, 200)) {
    if (GERMAN_ARTICLE.test(cellToString(row[0]))) col0++
    if (GERMAN_ARTICLE.test(cellToString(row[1]))) col1++
  }
  return col1 > col0 ? 1 : 0 // tie → assume German is the first column
}

/** Turn raw rows (arrays of cells) into cards, detecting header row and column order. */
function rowsToCards(rows: Row[], defaultLanguage: string): ParseResult {
  const nonEmpty = rows.filter((r) => r.some((c) => cellToString(c) !== ''))
  if (nonEmpty.length === 0) return { cards: [], skipped: 0 }

  let gIdx = 0
  let tIdx = 1
  let lIdx = 2
  let start = 0

  const first = nonEmpty[0].map((c) => cellToString(c).toLowerCase())
  const isHeader = first.some(
    (c) =>
      GERMAN_HEADERS.includes(c) ||
      TRANSLATION_HEADERS.includes(c) ||
      LANGUAGE_HEADERS.includes(c),
  )
  if (isHeader) {
    // Explicit header row → trust the column names.
    start = 1
    const g = first.findIndex((c) => GERMAN_HEADERS.includes(c))
    const t = first.findIndex((c) => TRANSLATION_HEADERS.includes(c))
    const l = first.findIndex((c) => LANGUAGE_HEADERS.includes(c))
    if (g >= 0) gIdx = g
    if (t >= 0) tIdx = t
    lIdx = l // may be -1 → fall back to defaultLanguage
  } else {
    // No header → auto-detect which column is German; the other is the translation.
    gIdx = detectGermanColumn(nonEmpty)
    tIdx = gIdx === 0 ? 1 : 0
    lIdx = 2
  }

  const cards: NewCard[] = []
  let skipped = 0
  for (let i = start; i < nonEmpty.length; i++) {
    const row = nonEmpty[i]
    const german = cellToString(row[gIdx])
    const translation = cellToString(row[tIdx])
    const language = (lIdx >= 0 ? cellToString(row[lIdx]) : '') || defaultLanguage
    if (!german || !translation) {
      skipped++
      continue
    }
    cards.push({ german, translation, language })
  }
  return { cards, skipped }
}

/** Minimal CSV parser handling quoted fields, escaped quotes and CRLF. */
function parseCsv(text: string): Row[] {
  const rows: Row[] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

type SheetObject = { sheet: string; data: Row[] }

/**
 * read-excel-file returns an array of { sheet, data } objects — one per worksheet
 * — rather than a flat row list. Flatten every sheet's rows into one list so a
 * multi-sheet workbook imports fully. If a build ever returns plain rows instead,
 * pass them through unchanged.
 */
function normalizeToRows(raw: unknown): Row[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as SheetObject | Row
    if (first && !Array.isArray(first) && Array.isArray((first as SheetObject).data)) {
      return (raw as SheetObject[]).flatMap((s) => s.data)
    }
  }
  return (raw as Row[]) ?? []
}

/**
 * Parse an uploaded vocabulary file into cards. Supports .xlsx (real Excel, all
 * worksheets) and .csv. Columns are German and Translation, plus an optional
 * Language (otherwise the given default is used). A header row is optional; when
 * absent, the German column is auto-detected.
 */
export async function parseVocabFile(
  file: File,
  defaultLanguage: string,
): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    const text = await file.text()
    return rowsToCards(parseCsv(text), defaultLanguage)
  }
  // .xlsx → read with read-excel-file (lazy-loaded to keep the bundle small).
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const raw = await readXlsxFile(file)
  return rowsToCards(normalizeToRows(raw), defaultLanguage)
}

/** Download a ready-to-fill CSV template (opens directly in Excel). */
export function downloadTemplate(language: string): void {
  const lang = language.trim() || 'Spanish'
  const csv = [
    'German,Translation,Language',
    `das Haus,la casa,${lang}`,
    `die Katze,el gato,${lang}`,
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vokabeln-vorlage.csv'
  a.click()
  URL.revokeObjectURL(url)
}
