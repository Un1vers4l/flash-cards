import { useMemo, useState, type FormEvent } from 'react'
import {
  type Person,
  type Tense,
  type Verb,
  PERSONS,
  PERSON_LABELS,
  TENSE_LABELS,
  answersMatch,
} from '../lib/verbs'
import type { DrillMode } from './ConjugationView'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type TableItem = { verb: Verb; tense: Tense }
type FlipItem = { verb: Verb; tense: Tense; person: Person }

type Props = {
  verbs: Verb[]
  tenses: Tense[]
  mode: DrillMode
  onExit: () => void
}

const EMPTY: Record<Person, string> = { yo: '', tu: '', el: '', nosotros: '', vosotros: '', ellos: '' }

export default function ConjugationSession({ verbs, tenses, mode, onExit }: Props) {
  const items = useMemo(() => {
    if (mode === 'table') {
      const list: TableItem[] = []
      for (const v of verbs) for (const t of tenses) if (v.conjugations[t]) list.push({ verb: v, tense: t })
      return shuffle(list)
    }
    const list: FlipItem[] = []
    for (const v of verbs)
      for (const t of tenses)
        for (const p of PERSONS) if (v.conjugations[t]?.[p]) list.push({ verb: v, tense: t, person: p })
    return shuffle(list)
  }, [verbs, tenses, mode])

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<Person, string>>(EMPTY)
  const [checked, setChecked] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const total = items.length
  const done = index >= total

  if (total === 0) {
    return (
      <div className="session-done">
        <h2>Nothing to conjugate</h2>
        <div className="session-done-rule" />
        <button className="btn btn-primary" onClick={onExit}>Back</button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="session-done">
        <h2>Drill complete</h2>
        <div className="session-done-rule" />
        <p className="session-done-stats">
          <span className="pill pill-correct">{score.correct} correct</span>
          <span className="pill pill-wrong">{score.total - score.correct} to review</span>
        </p>
        <button className="btn btn-primary" onClick={onExit}>Back</button>
      </div>
    )
  }

  const item = items[index]
  const forms = item.verb.conjugations[item.tense]!

  function advance() {
    setAnswers(EMPTY)
    setChecked(false)
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  // ---- table mode ----
  function submitTable(e: FormEvent) {
    e.preventDefault()
    if (!checked) {
      let correct = 0
      for (const p of PERSONS) if (answersMatch(answers[p], forms[p])) correct++
      setScore((s) => ({ correct: s.correct + correct, total: s.total + PERSONS.length }))
      setChecked(true)
    } else {
      advance()
    }
  }

  if (mode === 'table') {
    return (
      <div className="session">
        <div className="session-top">
          <button className="btn btn-ghost" onClick={onExit}>← Exit</button>
          <div className="session-progress">{index + 1} / {total}</div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(index / total) * 100}%` }} />
        </div>

        <div className="conj-card">
          <div className="conj-card-head">
            <span className="conj-inf">{item.verb.infinitive}</span>
            {item.verb.german && <span className="conj-de">{item.verb.german}</span>}
            <span className="conj-tense">{TENSE_LABELS[item.tense]}</span>
          </div>

          <form className="conj-table" onSubmit={submitTable} key={index}>
            {PERSONS.map((p, i) => {
              const ok = checked && answersMatch(answers[p], forms[p])
              const bad = checked && !ok
              return (
                <label className="conj-cell" key={p}>
                  <span className="conj-person">{PERSON_LABELS[p]}</span>
                  <input
                    className={`input conj-input ${ok ? 'is-ok' : ''} ${bad ? 'is-bad' : ''}`}
                    value={answers[p]}
                    onChange={(e) => setAnswers((a) => ({ ...a, [p]: e.target.value }))}
                    disabled={checked}
                    autoFocus={i === 0}
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  {bad && <span className="conj-correct">{forms[p]}</span>}
                </label>
              )
            })}
            <button className="btn btn-primary btn-block conj-submit" type="submit">
              {checked ? 'Next →' : 'Check'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ---- flip mode ----
  const person = (item as FlipItem).person
  function grade(got: boolean) {
    setScore((s) => ({ correct: s.correct + (got ? 1 : 0), total: s.total + 1 }))
    advance()
  }

  return (
    <div className="session">
      <div className="session-top">
        <button className="btn btn-ghost" onClick={onExit}>← Exit</button>
        <div className="session-progress">{index + 1} / {total}</div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <button
        type="button"
        className={`flashcard ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
      >
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-lang">{TENSE_LABELS[item.tense]} · {PERSON_LABELS[person]}</span>
            <span className="flashcard-word">{item.verb.infinitive}</span>
            <span className="flashcard-hint">{item.verb.german || 'Tap to reveal'}</span>
          </div>
          <div className="flashcard-face flashcard-back">
            <span className="flashcard-lang">{PERSON_LABELS[person]}</span>
            <span className="flashcard-word">{forms[person]}</span>
            <span className="flashcard-hint">{item.verb.infinitive} · {TENSE_LABELS[item.tense]}</span>
          </div>
        </div>
      </button>

      {flipped ? (
        <div className="grade-row">
          <button className="btn btn-danger btn-lg" onClick={() => grade(false)}>Missed</button>
          <button className="btn btn-success btn-lg" onClick={() => grade(true)}>Got it</button>
        </div>
      ) : (
        <div className="grade-row">
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        </div>
      )}
    </div>
  )
}
