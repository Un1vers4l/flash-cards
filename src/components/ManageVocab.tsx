import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { type Card, MAX_PHASE, phaseIntervalLabel, scheduleForPhase } from '../lib/srs'
import { createCard, createCards, deleteCard, setCardPhase } from '../lib/cards'
import { downloadTemplate, parseVocabFile } from '../lib/importCards'

type StatusFilter = 'all' | 'active' | 'inactive'

type Props = {
  cards: Card[]
  activationEnabled: boolean
  onChanged: () => void
  onCardPatched: (id: string, changes: Partial<Card>) => void
  onSetActive: (card: Card, active: boolean) => void
  onActivateMany: (ids: string[]) => void
}

const PHASES = Array.from({ length: MAX_PHASE }, (_, i) => i + 1)

// A short list of common defaults; the field is free-text so any language works.
const LANGUAGE_SUGGESTIONS = ['Spanish', 'English', 'French', 'Italian', 'Portuguese', 'Dutch']

export default function ManageVocab({
  cards,
  activationEnabled,
  onChanged,
  onCardPatched,
  onSetActive,
  onActivateMany,
}: Props) {
  const [german, setGerman] = useState('')
  const [translation, setTranslation] = useState('')
  const [language, setLanguage] = useState('Spanish')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [batchSize, setBatchSize] = useState(20)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ text: string; error: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const inactiveCards = useMemo(
    () => (activationEnabled ? cards.filter((c) => !c.active) : []),
    [cards, activationEnabled],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!german.trim() || !translation.trim() || !language.trim() || saving) return
    setSaving(true)
    try {
      await createCard({ german, translation, language })
      setGerman('')
      setTranslation('')
      onChanged()
    } catch (err) {
      alert('Could not save the card.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhaseChange(card: Card, newPhase: number) {
    if (newPhase === card.phase) return
    const previous = { phase: card.phase, due_date: card.due_date }
    // Update the UI immediately, then persist; revert if the write fails.
    onCardPatched(card.id, scheduleForPhase(newPhase))
    try {
      await setCardPhase(card.id, newPhase)
    } catch (err) {
      console.error(err)
      onCardPatched(card.id, previous)
      alert('Could not change the phase.')
    }
  }

  async function handleDelete(card: Card) {
    if (!confirm(`Delete "${card.german}"?`)) return
    try {
      await deleteCard(card.id)
      onChanged()
    } catch (err) {
      alert('Could not delete the card.')
      console.error(err)
    }
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg(null)
    try {
      const { cards: parsed, skipped } = await parseVocabFile(file, language.trim() || 'Spanish')
      if (parsed.length === 0) {
        setImportMsg({
          text: 'No valid rows found. Expected columns: German, Translation, (Language).',
          error: true,
        })
      } else {
        const n = await createCards(parsed)
        const skipNote = skipped ? `, skipped ${skipped} incomplete row${skipped === 1 ? '' : 's'}` : ''
        const activeNote = activationEnabled
          ? ' They start inactive — activate them below to begin learning.'
          : ''
        setImportMsg({
          text: `Imported ${n} card${n === 1 ? '' : 's'}${skipNote}.${activeNote}`,
          error: false,
        })
        onChanged()
      }
    } catch (err) {
      console.error(err)
      setImportMsg({ text: 'Could not read that file. Use a .xlsx or .csv file.', error: true })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = '' // allow re-importing the same file
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return cards.filter((c) => {
      if (activationEnabled && status === 'active' && !c.active) return false
      if (activationEnabled && status === 'inactive' && c.active) return false
      if (!q) return true
      return (
        c.german.toLowerCase().includes(q) ||
        c.translation.toLowerCase().includes(q) ||
        c.language.toLowerCase().includes(q)
      )
    })
  }, [cards, filter, status, activationEnabled])

  function activateNext() {
    onActivateMany(inactiveCards.slice(0, Math.max(1, batchSize)).map((c) => c.id))
  }

  return (
    <div className="manage">
      <section className="panel">
        <h2 className="panel-title">Add a vocabulary</h2>
        <form className="add-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">German</span>
            <input
              className="input"
              value={german}
              onChange={(e) => setGerman(e.target.value)}
              placeholder="das Haus"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Translation</span>
            <input
              className="input"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="la casa"
            />
          </label>

          <label className="field">
            <span className="field-label">Foreign language</span>
            <input
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              list="language-suggestions"
              placeholder="Spanish"
            />
            <datalist id="language-suggestions">
              {LANGUAGE_SUGGESTIONS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add card'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">Import from Excel</h2>
        <p className="import-hint">
          Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file with a{' '}
          <strong>German</strong> and a <strong>translation</strong> column (plus an optional{' '}
          <strong>Language</strong> column — otherwise the language above is used). A header row
          is optional; without one, the German column is detected automatically. All worksheets
          are imported.
        </p>
        <div className="import-actions">
          <label className={`btn btn-primary import-btn ${importing ? 'is-disabled' : ''}`}>
            {importing ? 'Importing…' : 'Choose file'}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
              disabled={importing}
              hidden
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadTemplate(language)}
          >
            Download template
          </button>
        </div>
        {importMsg && (
          <p className={`import-status ${importMsg.error ? 'is-error' : 'is-ok'}`}>
            {importMsg.text}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            All cards <span className="count-badge">{cards.length}</span>
          </h2>
          {cards.length > 0 && (
            <input
              className="input input-sm"
              placeholder="Search…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
        </div>

        {activationEnabled && (
          <>
            <div className="status-filter">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-tab ${status === s ? 'is-active' : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
                  {s === 'inactive' && inactiveCards.length > 0 ? ` (${inactiveCards.length})` : ''}
                </button>
              ))}
            </div>
            {inactiveCards.length > 0 && (
              <div className="activate-bar">
                <span className="activate-bar-text">
                  {inactiveCards.length} inactive card{inactiveCards.length === 1 ? '' : 's'} waiting.
                </span>
                <div className="activate-bar-controls">
                  <input
                    className="input input-sm activate-count"
                    type="number"
                    min={1}
                    max={inactiveCards.length}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                  />
                  <button className="btn btn-primary btn-sm" onClick={activateNext}>
                    Activate next {Math.min(Math.max(1, batchSize), inactiveCards.length)}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {filtered.length === 0 ? (
          <p className="empty-hint">
            {cards.length === 0 ? 'No cards yet. Add your first one above.' : 'No matches.'}
          </p>
        ) : (
          <ul className="card-list">
            {filtered.map((c) => (
              <li key={c.id} className={`card-row ${activationEnabled && !c.active ? 'is-inactive' : ''}`}>
                <div className="card-row-main">
                  <span className="card-row-german">{c.german}</span>
                  <span className="card-row-arrow">→</span>
                  <span className="card-row-translation">{c.translation}</span>
                </div>
                <div className="card-row-meta">
                  <span className="tag">{c.language}</span>
                  {activationEnabled && !c.active ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onSetActive(c, true)}
                      title="Activate — puts this card into phase 1, due today"
                    >
                      Activate
                    </button>
                  ) : (
                    <>
                      <select
                        className="phase-select"
                        value={c.phase}
                        onChange={(e) => handlePhaseChange(c, Number(e.target.value))}
                        title={`Phase ${c.phase} · ${phaseIntervalLabel(c.phase)}`}
                        aria-label={`Phase for ${c.german}`}
                      >
                        {PHASES.map((p) => (
                          <option key={p} value={p}>
                            Phase {p}
                          </option>
                        ))}
                      </select>
                      {activationEnabled && (
                        <button
                          className="icon-btn"
                          onClick={() => onSetActive(c, false)}
                          aria-label="Deactivate card"
                          title="Deactivate"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64M12 2v10" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className="icon-btn"
                    onClick={() => handleDelete(c)}
                    aria-label="Delete card"
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H7a1 1 0 01-1-1V7" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
