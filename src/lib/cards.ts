import { supabase } from './supabase'
import { type Card, type ReviewResult, scheduleForPhase, todayKey } from './srs'

const TABLE = 'cards'

export async function fetchCards(): Promise<Card[]> {
  // Supabase caps every query at ~1000 rows, so page through with .range() until
  // a short page comes back. Order by (created_at, id) — a total order — so
  // paging is stable even though a bulk import gives many rows the same
  // created_at timestamp.
  const PAGE = 1000
  const all: Card[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const batch = (data ?? []) as Card[]
    all.push(...batch)
    if (batch.length < PAGE) break
  }
  return all
}

export type NewCard = {
  german: string
  translation: string
  language: string
}

// The `active` column may not exist yet (migration not run). Detect that so we
// can retry the insert without it and keep add/import working in the meantime.
function isMissingActiveColumn(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return e?.code === 'PGRST204' || e?.code === '42703' || /'?active'? column|active/i.test(e?.message ?? '')
}

export async function createCard(input: NewCard): Promise<Card> {
  const row = {
    german: input.german.trim(),
    translation: input.translation.trim(),
    language: input.language.trim(),
    phase: 1,
    due_date: todayKey(),
    active: true, // a manually added card is ready to learn right away
  }
  let res = await supabase.from(TABLE).insert(row).select().single()
  if (res.error && isMissingActiveColumn(res.error)) {
    const { active: _drop, ...legacy } = row
    res = await supabase.from(TABLE).insert(legacy).select().single()
  }
  if (res.error) throw res.error
  return res.data as Card
}

/** Insert many cards at once (used by the Excel/CSV importer). Returns the count inserted. */
export async function createCards(inputs: NewCard[]): Promise<number> {
  if (inputs.length === 0) return 0
  const today = todayKey()
  const rows = inputs.map((input) => ({
    german: input.german.trim(),
    translation: input.translation.trim(),
    language: input.language.trim(),
    phase: 1,
    due_date: today,
    active: false, // imported cards start inactive; the user activates them
  }))
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    let res = await supabase.from(TABLE).insert(chunk).select('id')
    if (res.error && isMissingActiveColumn(res.error)) {
      res = await supabase.from(TABLE).insert(chunk.map(({ active: _d, ...r }) => r)).select('id')
    }
    if (res.error) throw res.error
    inserted += res.data?.length ?? 0
  }
  return inserted
}

export async function applyReview(id: string, result: ReviewResult): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ phase: result.phase, due_date: result.due_date })
    .eq('id', id)
  if (error) throw error
}

/** Manually move a card to a phase, rescheduling its due date accordingly. */
export async function setCardPhase(id: string, phase: number): Promise<ReviewResult> {
  const result = scheduleForPhase(phase)
  await applyReview(id, result)
  return result
}

/**
 * Activate or deactivate a card. Activating puts it into phase 1, due today, so
 * it enters the spaced-repetition flow. Returns the applied changes.
 */
export async function setCardActive(
  id: string,
  active: boolean,
): Promise<Partial<Card>> {
  const changes: Partial<Card> = active
    ? { active: true, phase: 1, due_date: todayKey() }
    : { active: false }
  const { error } = await supabase.from(TABLE).update(changes).eq('id', id)
  if (error) throw error
  return changes
}

/** Activate many cards at once (bulk), putting each into phase 1 due today. */
export async function activateCards(ids: string[]): Promise<Partial<Card>> {
  const changes = { active: true, phase: 1, due_date: todayKey() }
  const CHUNK = 500
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from(TABLE)
      .update(changes)
      .in('id', ids.slice(i, i + CHUNK))
    if (error) throw error
  }
  return changes
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
