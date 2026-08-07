import { useMemo, useState } from 'react'
import {
  type Tense,
  type Verb,
  TENSES,
  TENSE_LABELS,
} from '../lib/verbs'

export type DrillMode = 'table' | 'flip'

type Props = {
  verbs: Verb[]
  tableMissing: boolean
  onStart: (verbs: Verb[], tenses: Tense[], mode: DrillMode) => void
}

const MAX_VISIBLE = 300

export default function ConjugationView({ verbs, tableMissing, onStart }: Props) {
  const [search, setSearch] = useState('')
  const [irregularOnly, setIrregularOnly] = useState(false)
  const [tenses, setTenses] = useState<Set<Tense>>(() => new Set(TENSES))
  const [mode, setMode] = useState<DrillMode>('table')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return verbs.filter((v) => {
      if (irregularOnly && !v.irregular) return false
      if (!q) return true
      return (
        v.infinitive.toLowerCase().includes(q) ||
        (v.german ?? '').toLowerCase().includes(q)
      )
    })
  }, [verbs, search, irregularOnly])

  const chosenTenses = TENSES.filter((t) => tenses.has(t))

  function toggleTense(t: Tense) {
    setTenses((s) => {
      const n = new Set(s)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })
  }

  function start(list: Verb[]) {
    if (list.length === 0 || chosenTenses.length === 0) return
    onStart(list, chosenTenses, mode)
  }

  if (tableMissing) {
    return (
      <div className="manage">
        <section className="panel">
          <h2 className="panel-title">Conjugation</h2>
          <p className="import-hint">
            Conjugation data isn't set up on this database yet. Run the <code>verbs</code> table
            block from <code>supabase/schema.sql</code> and generate the data, then reload.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="manage">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            Conjugation <span className="count-badge">{verbs.length}</span>
          </h2>
        </div>
        <p className="import-hint">
          Practice conjugating your verbs across the core tenses. Pick a mode and which
          tenses to drill, then start with the whole list or a single verb.
        </p>

        <div className="conj-controls">
          <div className="conj-row">
            <span className="conj-label">Tenses</span>
            <div className="chip-group">
              {TENSES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${tenses.has(t) ? 'is-on' : ''}`}
                  onClick={() => toggleTense(t)}
                >
                  {TENSE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="conj-row">
            <span className="conj-label">Mode</span>
            <div className="chip-group">
              <button
                type="button"
                className={`chip ${mode === 'table' ? 'is-on' : ''}`}
                onClick={() => setMode('table')}
              >
                Full table (type)
              </button>
              <button
                type="button"
                className={`chip ${mode === 'flip' ? 'is-on' : ''}`}
                onClick={() => setMode('flip')}
              >
                Flip (self-graded)
              </button>
            </div>
          </div>
        </div>

        <div className="conj-start">
          <button
            className="btn btn-primary"
            onClick={() => start(filtered)}
            disabled={filtered.length === 0 || chosenTenses.length === 0}
          >
            Start drill · {filtered.length} verb{filtered.length === 1 ? '' : 's'}
          </button>
          {chosenTenses.length === 0 && <span className="conj-hint">Pick at least one tense.</span>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Verbs</h2>
          <div className="conj-list-controls">
            <button
              type="button"
              className={`chip ${irregularOnly ? 'is-on' : ''}`}
              onClick={() => setIrregularOnly((v) => !v)}
            >
              Irregular only
            </button>
            <input
              className="input input-sm"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="empty-hint">No verbs match.</p>
        ) : (
          <ul className="verb-list">
            {filtered.slice(0, MAX_VISIBLE).map((v) => (
              <li key={v.id} className="verb-row">
                <div className="verb-row-main">
                  <span className="verb-inf">{v.infinitive}</span>
                  {v.german && <span className="verb-de">{v.german}</span>}
                </div>
                <div className="verb-row-meta">
                  {v.irregular && <span className="tag tag-irr">irregular</span>}
                  {v.reflexive && <span className="tag">reflexive</span>}
                  <button className="btn btn-secondary btn-sm" onClick={() => start([v])}>
                    Drill
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > MAX_VISIBLE && (
          <p className="empty-hint">
            Showing first {MAX_VISIBLE} of {filtered.length}. Search to narrow.
          </p>
        )}
      </section>
    </div>
  )
}
