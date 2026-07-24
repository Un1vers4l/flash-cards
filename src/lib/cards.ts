import { supabase } from './supabase'
import { type Card, type ReviewResult, todayKey } from './srs'

const TABLE = 'cards'

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Card[]
}

export type NewCard = {
  german: string
  translation: string
  language: string
}

export async function createCard(input: NewCard): Promise<Card> {
  const row = {
    german: input.german.trim(),
    translation: input.translation.trim(),
    language: input.language.trim(),
    phase: 1,
    due_date: todayKey(), // brand-new cards are due immediately
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select().single()
  if (error) throw error
  return data as Card
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
  }))
  // Insert in chunks so large imports stay under request size limits.
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(rows.slice(i, i + CHUNK))
      .select('id')
    if (error) throw error
    inserted += data?.length ?? 0
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

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
