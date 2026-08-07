// Generate / update conjugation data for verb cards.
//
//   npm run verbs:staging   → against the staging DB (.env.development)
//   npm run verbs:prod      → against the production DB (.env.production)
//
// Flags:
//   --prod       use .env.production (npm run verbs:prod sets this)
//   --dry        preview only, write nothing
//   --rebuild    wipe the verbs table and regenerate everything
//                (default is incremental: only add verbs that are missing)
//
// Accuracy comes from the freely-distributed Jehle Spanish verb dataset, plus
// prefix-derivation for compounds and a regular conjugator for the rest. Verbs
// we can't produce reliably are skipped and listed, never guessed.

import fs from 'node:fs'

const PROD = process.argv.includes('--prod')
const DRY = process.argv.includes('--dry')
const REBUILD = process.argv.includes('--rebuild')
const ENV_FILE = PROD ? '.env.production' : '.env.development'
const JEHLE_PATH = 'scripts/jehle.csv'
const JEHLE_URL =
  'https://raw.githubusercontent.com/ghidinelli/fred-jehle-spanish-verbs/master/jehle_verb_database.csv'

// ---- credentials ----
if (!fs.existsSync(ENV_FILE)) {
  console.error(`Missing ${ENV_FILE}. Create it with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`)
  process.exit(1)
}
const env = fs.readFileSync(ENV_FILE, 'utf8')
const get = (k) => (env.match(new RegExp(`${k}=(.+)`))?.[1] || '').trim().replace(/^["']|["']$/g, '')
const URL = get('VITE_SUPABASE_URL'), KEY = get('VITE_SUPABASE_ANON_KEY')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
console.log(`DB: ${URL}  (${ENV_FILE})${DRY ? '  [dry run]' : ''}${REBUILD ? '  [rebuild]' : ''}`)

// ---- dataset (download + cache) ----
if (!fs.existsSync(JEHLE_PATH)) {
  console.log('Downloading Jehle verb dataset…')
  const res = await fetch(JEHLE_URL)
  if (!res.ok) { console.error(`Could not download dataset (HTTP ${res.status}).`); process.exit(1) }
  fs.writeFileSync(JEHLE_PATH, await res.text())
}

function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else q = false } else field += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const TENSE = { Presente: 'presente', 'Pretérito': 'indefinido', Imperfecto: 'imperfecto', Futuro: 'futuro' }
const PERSONS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos']
const CORE_INDIC = ['presente', 'indefinido', 'imperfecto', 'futuro']
const TENSE_KEYS = [...CORE_INDIC, 'subjuntivo']
const jehle = new Map()
for (const row of parseCsv(fs.readFileSync(JEHLE_PATH, 'utf8')).slice(1)) {
  let key = null
  if (row[2] === 'Indicativo' && TENSE[row[4]]) key = TENSE[row[4]]
  else if (row[2] === 'Subjuntivo' && row[4] === 'Presente') key = 'subjuntivo'
  if (!key) continue
  const forms = { yo: row[7], tu: row[8], el: row[9], nosotros: row[10], vosotros: row[11], ellos: row[12] }
  if (!jehle.has(row[0])) jehle.set(row[0], {})
  jehle.get(row[0])[key] = forms
}
const jehleCore = (base) => {
  const src = jehle.get(base); if (!src) return null
  const out = {}; for (const t of TENSE_KEYS) if (src[t]) out[t] = src[t]
  return CORE_INDIC.every((t) => out[t]) ? out : null // require the 4 indicative; subjuntivo added if present
}

const REG = { ar: ['o', 'as', 'a', 'amos', 'áis', 'an'], er: ['o', 'es', 'e', 'emos', 'éis', 'en'], ir: ['o', 'es', 'e', 'imos', 'ís', 'en'] }
const PRET = { ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'], er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'], ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'] }
const IMPF = { ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'], er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'], ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'] }
const FUT = ['é', 'ás', 'á', 'emos', 'éis', 'án']
const RISKY = /(acer|ecer|ocer|ucir|uir|eer|ñir|güir|iar|uar)$/
const SUBJ = { ar: ['e', 'es', 'e', 'emos', 'éis', 'en'], er: ['a', 'as', 'a', 'amos', 'áis', 'an'], ir: ['a', 'as', 'a', 'amos', 'áis', 'an'] }
const toObj = (arr) => { const o = {}; PERSONS.forEach((p, i) => (o[p] = arr[i])); return o }
function regularConjugate(base) {
  const end = base.slice(-2); if (!REG[end] || RISKY.test(base)) return null
  const stem = base.slice(0, -2)
  const pres = REG[end].map((e) => stem + e)
  const pret = PRET[end].map((e) => stem + e)
  // orthographic-preserving stem for the subjunctive (and pretérito yo / presente yo)
  let subjStem = stem
  if (end === 'ar') {
    if (base.endsWith('car')) { pret[0] = base.slice(0, -3) + 'qué'; subjStem = stem.slice(0, -1) + 'qu' }
    else if (base.endsWith('gar')) { pret[0] = base.slice(0, -3) + 'gué'; subjStem = stem.slice(0, -1) + 'gu' }
    else if (base.endsWith('zar')) { pret[0] = base.slice(0, -3) + 'cé'; subjStem = stem.slice(0, -1) + 'c' }
  } else {
    if (/g$/.test(stem)) { subjStem = stem.slice(0, -1) + 'j'; pres[0] = subjStem + 'o' } // coger→cojo/coja
    else if (/[^aeiou]c$/.test(stem)) { subjStem = stem.slice(0, -1) + 'z'; pres[0] = subjStem + 'o' } // vencer→venzo/venza
  }
  return {
    presente: toObj(pres),
    indefinido: toObj(pret),
    imperfecto: toObj(IMPF[end].map((e) => stem + e)),
    futuro: toObj(FUT.map((e) => base + e)),
    subjuntivo: toObj(SUBJ[end].map((e) => subjStem + e)),
  }
}
const PREFIXES = ['re', 'des', 'pre', 'com', 'con', 'en', 'em', 'ante', 'contra', 'sobre', 'entre', 'dis', 'in', 'im', 'ex', 'sub', 'tras', 'trans', 'super', 'inter', 'auto', 'a', 'de', 'pro']
function deriveByPrefix(base) {
  for (const p of PREFIXES) {
    if (!base.startsWith(p)) continue
    const root = base.slice(p.length)
    if (root.length < 4) continue
    const core = jehleCore(root); if (!core) continue
    const out = {}; for (const t of Object.keys(core)) out[t] = toObj(PERSONS.map((per) => p + core[t][per]))
    return out
  }
  return null
}
const MANUAL = {
  haber: {
    presente: { yo: 'he', tu: 'has', el: 'ha', nosotros: 'hemos', vosotros: 'habéis', ellos: 'han' },
    indefinido: { yo: 'hube', tu: 'hubiste', el: 'hubo', nosotros: 'hubimos', vosotros: 'hubisteis', ellos: 'hubieron' },
    imperfecto: { yo: 'había', tu: 'habías', el: 'había', nosotros: 'habíamos', vosotros: 'habíais', ellos: 'habían' },
    futuro: { yo: 'habré', tu: 'habrás', el: 'habrá', nosotros: 'habremos', vosotros: 'habréis', ellos: 'habrán' },
    subjuntivo: { yo: 'haya', tu: 'hayas', el: 'haya', nosotros: 'hayamos', vosotros: 'hayáis', ellos: 'hayan' },
  },
  cambiar: {
    presente: { yo: 'cambio', tu: 'cambias', el: 'cambia', nosotros: 'cambiamos', vosotros: 'cambiáis', ellos: 'cambian' },
    indefinido: { yo: 'cambié', tu: 'cambiaste', el: 'cambió', nosotros: 'cambiamos', vosotros: 'cambiasteis', ellos: 'cambiaron' },
    imperfecto: { yo: 'cambiaba', tu: 'cambiabas', el: 'cambiaba', nosotros: 'cambiábamos', vosotros: 'cambiabais', ellos: 'cambiaban' },
    futuro: { yo: 'cambiaré', tu: 'cambiarás', el: 'cambiará', nosotros: 'cambiaremos', vosotros: 'cambiaréis', ellos: 'cambiarán' },
    subjuntivo: { yo: 'cambie', tu: 'cambies', el: 'cambie', nosotros: 'cambiemos', vosotros: 'cambiéis', ellos: 'cambien' },
  },
}
const REFLEX = { yo: 'me', tu: 'te', el: 'se', nosotros: 'nos', vosotros: 'os', ellos: 'se' }
const applyReflexive = (conj) => {
  const out = {}
  for (const [t, f] of Object.entries(conj)) { out[t] = {}; for (const p of PERSONS) out[t][p] = f[p] ? `${REFLEX[p]} ${f[p]}` : '' }
  return out
}
function isIrregular(base, conj) {
  const reg = regularConjugate(base); if (!reg) return true
  return PERSONS.some((p) => reg.presente[p] !== conj.presente[p] || reg.futuro[p] !== conj.futuro[p])
}

async function fetchAll(table, select) {
  const rows = []
  for (let f = 0; ; f += 1000) {
    const r = await fetch(`${URL}/rest/v1/${table}?select=${select}&order=id.asc`, { headers: { ...H, Range: `${f}-${f + 999}` } })
    const b = await r.json()
    if (!Array.isArray(b)) throw new Error(JSON.stringify(b))
    rows.push(...b); if (b.length < 1000) break
  }
  return rows
}

const cards = await fetchAll('cards', 'id,german,translation')
const existing = REBUILD ? [] : await fetchAll('verbs', 'infinitive')
const have = new Set(existing.map((v) => v.infinitive))

const ARTICLES = new Set(['der', 'die', 'das', 'sich', 'etw', 'jdn', 'jdm', 'zu'])
const primaryDe = (g) => { let f = g.split(/[,/]/)[0].replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean); while (f.length && ARTICLES.has(f[0].toLowerCase())) f.shift(); return f.join(' ') }

const seen = new Set()
const rows = []
const skipped = []
for (const c of cards) {
  const de = c.german.toLowerCase()
  const isSich = /\bsich\b/.test(de)
  const pg = primaryDe(c.german).toLowerCase()
  const germanInf = /(en|ern|eln)$/.test(pg) && !pg.includes(' ')
  const esFirst = c.translation.split(/[,/]/)[0].trim().toLowerCase()
  const firstWord = esFirst.split(/\s+/)[0].replace(/[^a-záéíóúñü]/g, '')
  const reflexive = /(arse|erse|irse)$/.test(firstWord) || (isSich && /(ar|er|ir)$/.test(firstWord))
  const base = reflexive ? firstWord.replace(/se$/, '') : firstWord
  if (!/(ar|er|ir)$/.test(base) || !(germanInf || isSich || reflexive || esFirst.split(/\s+/).length === 1)) continue

  const infinitive = reflexive ? base + 'se' : base
  if (seen.has(infinitive) || have.has(infinitive)) continue
  seen.add(infinitive)

  let core = null
  if (MANUAL[base]) core = MANUAL[base]
  else if (jehleCore(base)) core = jehleCore(base)
  else if (deriveByPrefix(base)) core = deriveByPrefix(base)
  else if (regularConjugate(base)) core = regularConjugate(base)
  if (!core) { skipped.push(`${c.german}  →  ${c.translation}  (${base})`); continue }

  rows.push({
    card_id: c.id,
    infinitive,
    german: primaryDe(c.german),
    reflexive,
    irregular: isIrregular(base, core),
    conjugations: reflexive ? applyReflexive(core) : core,
  })
}

console.log(`cards: ${cards.length} · existing verbs: ${have.size} · new to add: ${rows.length} · skipped: ${skipped.length}`)
if (skipped.length) { console.log('skipped (need manual attention):'); skipped.forEach((s) => console.log('   ', s)) }

if (DRY) { console.log('\nDry run — nothing written.'); process.exit(0) }
if (rows.length === 0 && !REBUILD) { console.log('\nNothing new to add.'); process.exit(0) }

if (REBUILD) {
  const all = await fetchAll('verbs', 'id')
  if (all.length) { const ids = all.map((r) => r.id).join(','); await fetch(`${URL}/rest/v1/verbs?id=in.(${ids})`, { method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' } }) }
}
for (let i = 0; i < rows.length; i += 500) {
  const res = await fetch(`${URL}/rest/v1/verbs`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(rows.slice(i, i + 500)) })
  if (!res.ok) { console.error(`insert failed ${res.status}: ${await res.text()}`); process.exit(1) }
}
console.log(`\nDone — added ${rows.length} verb${rows.length === 1 ? '' : 's'}.`)
