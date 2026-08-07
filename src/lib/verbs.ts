import { supabase } from './supabase'

export type Person = 'yo' | 'tu' | 'el' | 'nosotros' | 'vosotros' | 'ellos'
export type Tense = 'presente' | 'indefinido' | 'imperfecto' | 'futuro' | 'condicional' | 'subjuntivo'
export type Conjugations = Partial<Record<Tense, Record<Person, string>>>

export type Verb = {
  id: string
  card_id: string | null
  infinitive: string
  german: string | null
  reflexive: boolean
  irregular: boolean
  conjugations: Conjugations
  created_at: string
}

export const TENSES: Tense[] = ['presente', 'indefinido', 'imperfecto', 'futuro', 'condicional', 'subjuntivo']
export const TENSE_LABELS: Record<Tense, string> = {
  presente: 'Presente',
  indefinido: 'Indefinido',
  imperfecto: 'Imperfecto',
  futuro: 'Futuro',
  condicional: 'Condicional',
  subjuntivo: 'Subjuntivo',
}
export const PERSONS: Person[] = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos']
export const PERSON_LABELS: Record<Person, string> = {
  yo: 'yo',
  tu: 'tú',
  el: 'él / ella',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  ellos: 'ellos / ellas',
}

const TABLE = 'verbs'

/** True when the verbs table doesn't exist yet (migration not run on this DB). */
export function isMissingTableError(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return (
    e?.code === '42P01' ||
    e?.code === 'PGRST205' ||
    /Could not find the table|schema cache|does not exist/i.test(e?.message ?? '')
  )
}

export async function fetchVerbs(): Promise<Verb[]> {
  const PAGE = 1000
  const all: Verb[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('infinitive', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const batch = (data ?? []) as Verb[]
    all.push(...batch)
    if (batch.length < PAGE) break
  }
  return all
}

/** Normalize a form for comparison: trim, lowercase, strip accents, collapse spaces. */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

export function answersMatch(input: string, correct: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(correct)
}
