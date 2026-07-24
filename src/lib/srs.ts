// Spaced-repetition engine.
//
// Cards live in one of six phases. Each phase has a review interval: the higher
// the phase, the longer a card rests before it is shown again.
//
//   Phase 1 →  1 day
//   Phase 2 →  3 days
//   Phase 3 →  7 days
//   Phase 4 → 14 days
//   Phase 5 → 30 days
//   Phase 6 → 90 days   (mature)
//
// Answered correctly  → move up one phase (capped at 6) and schedule by the new
//                        phase's interval.
// Answered wrong       → drop back to phase 1 and make it due again today, so it
//                        keeps coming back until it sticks.

export const MIN_PHASE = 1
export const MAX_PHASE = 6

/** Review interval in days, indexed by phase (index 0 unused). */
export const PHASE_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 90] as const

export type Card = {
  id: string
  german: string
  translation: string
  language: string
  phase: number
  /** ISO date (YYYY-MM-DD) on which the card next becomes due. */
  due_date: string
  created_at: string
}

/** Local (not UTC) YYYY-MM-DD for a given date — "today" from the learner's view. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** A card is due when its due date is today or earlier. */
export function isDue(card: Pick<Card, 'due_date'>, today = todayKey()): boolean {
  return card.due_date <= today
}

export type ReviewResult = { phase: number; due_date: string }

/** Compute the next phase + due date after a correct answer. */
export function answerCorrect(card: Pick<Card, 'phase'>, today = todayKey()): ReviewResult {
  const phase = Math.min(card.phase + 1, MAX_PHASE)
  return { phase, due_date: addDays(today, PHASE_INTERVALS_DAYS[phase]) }
}

/** Reset to phase 1 and make the card due again today. */
export function answerWrong(_card: Pick<Card, 'phase'>, today = todayKey()): ReviewResult {
  return { phase: MIN_PHASE, due_date: today }
}

/** Human label for how long a phase rests, e.g. "every 3 days". */
export function phaseIntervalLabel(phase: number): string {
  const days = PHASE_INTERVALS_DAYS[phase]
  if (days === 1) return 'every day'
  return `every ${days} days`
}
