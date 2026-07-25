import { supabase } from './supabase'

export type Category = {
  id: string
  name: string
  card_ids: string[]
  created_at: string
}

const TABLE = 'categories'

/** True when the table doesn't exist yet (migration not run). */
export function isMissingTableError(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return (
    e?.code === '42P01' || // Postgres: relation does not exist
    e?.code === 'PGRST205' || // PostgREST: table not found in schema cache
    /Could not find the table|schema cache|does not exist/i.test(e?.message ?? '')
  )
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Category[]
}

export async function createCategory(name: string, cardIds: string[]): Promise<Category> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ name: name.trim(), card_ids: cardIds })
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function updateCategory(
  id: string,
  changes: Partial<Pick<Category, 'name' | 'card_ids'>>,
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (changes.name !== undefined) payload.name = changes.name.trim()
  if (changes.card_ids !== undefined) payload.card_ids = changes.card_ids
  const { error } = await supabase.from(TABLE).update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
